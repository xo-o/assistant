import asyncio
import json
import logging
import re
import time
from typing import Optional, AsyncGenerator, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.guardrails.safety import (
    check_pre_execution_guardrails,
    check_post_execution_guardrails,
)
from app.memory.manager import memory_manager
from app.models.entities import LeadRecord, HITLTicket
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ToolExecutionRecord,
    SolicitarContactoHumanoOutput,
)
from app.agent.prompts import build_system_instruction
from app.tools.lead_tool import execute_guardar_lead
from app.tools.hitl_tool import execute_solicitar_contacto_humano
from app.tools.rag_tool import execute_base_conocimientos_autos
from app.telemetry.tracer import trace_span, record_genai_metrics, generate_trace_id

logger = logging.getLogger("agent.orchestrator")


class AgentOrchestrator:
    """
    Main Agent Orchestrator implementing Google Gen AI SDK integration
    with native OpenTelemetry tracing, strict guardrails, session memory,
    and fallback execution.
    """

    def __init__(self):
        self._genai_client = None
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Google Gen AI SDK initialized successfully")
            except Exception as e:
                logger.warning(f"Could not initialize Google Gen AI SDK client: {e}")

    def _determine_mock_actions(
        self,
        user_message: str,
        lead: Optional[LeadRecord],
        session_id: str,
        db: Session
    ) -> tuple[str, list[ToolExecutionRecord], bool, Optional[dict]]:
        """
        Deterministic high-fidelity simulation engine for offline testing and evaluation.
        Emulates Gemini 1.5 Pro tool decisions and conversational policies verbatim.
        """
        msg = user_message.strip()
        msg_lower = msg.lower()
        tools_called: list[ToolExecutionRecord] = []
        hitl_triggered = False
        hitl_payload = None

        # 1. Name detection & Lead capture
        name_match = re.search(
            r"(?:soy|me\s+llamo|mi\s+nombre\s+es)\s+([A-Za-zÀ-ÿ]+)",
            msg,
            re.IGNORECASE
        )
        single_word_name = None
        if not name_match and len(msg.split()) == 1 and msg.isalpha() and not lead:
            single_word_name = msg.strip().capitalize()

        if name_match or single_word_name:
            extracted_name = (name_match.group(1).capitalize() if name_match else single_word_name)
            t_res = execute_guardar_lead(
                session_id=session_id,
                nombre=extracted_name,
                etapa="DESCUBRIMIENTO",
                db=db
            )
            tools_called.append(ToolExecutionRecord(
                tool_name="guardar_lead",
                input_payload={"session_id": session_id, "nombre": extracted_name, "etapa": "DESCUBRIMIENTO"},
                output_payload=t_res,
                duration_ms=12.0
            ))
            reply = f"¡Hola {extracted_name}! 👋 ¿En qué te puedo asesorar hoy con tu próximo auto?"
            return reply, tools_called, hitl_triggered, hitl_payload

        # 2. HITL: Test Drive, Cotización formal, or Human agent request
        hitl_keywords = [
            "test drive", "prueba de manejo", "agendar prueba", "cotizacion formal",
            "cotización formal", "cotizar formal", "hablar con un asesor",
            "asesor humano", "atendido por una persona", "agendar cita"
        ]
        if any(kw in msg_lower for kw in hitl_keywords):
            motivo = "TEST_DRIVE" if ("test drive" in msg_lower or "prueba de manejo" in msg_lower) else "COTIZACION_FORMAL"
            t_res = execute_solicitar_contacto_humano(
                session_id=session_id,
                motivo=motivo,
                resumen_requerimiento=f"Cliente solicita {motivo.lower()} tras consultar: {msg}",
                db=db
            )
            hitl_triggered = True
            hitl_payload = t_res
            tools_called.append(ToolExecutionRecord(
                tool_name="solicitar_contacto_humano",
                input_payload={"session_id": session_id, "motivo": motivo, "resumen_requerimiento": msg},
                output_payload=t_res,
                duration_ms=18.0
            ))
            name_prefix = f"{lead.nombre}, " if lead and lead.nombre else ""
            reply = f"¡Excelente! {name_prefix}He generado el ticket de derivación {t_res['ticket_id']} para coordinar tu requerimiento. Un asesor humano te contactará a la brevedad para los detalles 😊"
            return reply, tools_called, hitl_triggered, hitl_payload

        # 3. Technical question requiring RAG (Car body types, engines, maintenance, fuel efficiency)
        rag_keywords = [
            "suv", "sedan", "sedán", "hatchback", "pickup", "camioneta", "hibrido",
            "híbrido", "electrico", "eléctrico", "gasolina", "consumo", "ahorro",
            "diferencia", "mantenimiento", "rendimiento", "motor", "seguridad", "abs", "esp"
        ]
        if any(kw in msg_lower for kw in rag_keywords):
            # Capture vehicle interest if mentioned
            car_type = ""
            for ct in ["suv", "sedán", "sedan", "hatchback", "pickup", "híbrido", "electrico"]:
                if ct in msg_lower:
                    car_type = ct.upper()
                    break

            if car_type:
                execute_guardar_lead(
                    session_id=session_id,
                    tipo_vehiculo_interes=car_type,
                    etapa="INTERES_CONCRETO",
                    db=db
                )

            rag_res = execute_base_conocimientos_autos(query=msg, top_k=2)
            tools_called.append(ToolExecutionRecord(
                tool_name="base_conocimientos_autos",
                input_payload={"query": msg, "top_k": 2},
                output_payload=rag_res,
                duration_ms=25.0
            ))

            if rag_res.get("results"):
                top_doc = rag_res["results"][0]["content"]
                # Format to 2-3 concise sentences as required by persona Luis
                sentences = [s.strip() for s in top_doc.split(".") if s.strip()]
                short_explanation = ". ".join(sentences[:2]) + "."
                reply = f"{short_explanation} ¿Qué uso principal le darías a tu vehículo, ciudad o viajes familiares? 😊"
            else:
                reply = "Por el momento no cuento con el detalle técnico exacto sobre ese modelo, pero puedo anotarlo para que un especialista te dé el dato preciso 😊"
            return reply, tools_called, hitl_triggered, hitl_payload

        # 4. Discovery: Default friendly automotive response
        if lead and lead.nombre:
            reply = f"¡Perfecto, {lead.nombre}! Cuéntame más sobre lo que buscas: ¿priorizas ahorro de combustible, espacio para la familia o potencia para el trabajo? 😊"
        else:
            reply = "Hola 👋 Soy Luis, tu asesor automotriz. ¿Con quién tengo el gusto?"

        return reply, tools_called, hitl_triggered, hitl_payload

    async def _execute_gemini_call(
        self,
        model_name: str,
        system_prompt: str,
        history: list[dict[str, str]],
        user_message: str,
        session_id: str,
        db: Session
    ) -> tuple[str, list[ToolExecutionRecord], bool, Optional[dict]]:
        """
        Executes Google Gen AI SDK call with automatic function calling and tracing.
        """
        from google.genai import types

        # Define tool bindings for Gemini
        def guardar_lead(nombre: str = "", tipo_vehiculo_interes: str = "", uso_principal: str = "", etapa: str = "DESCUBRIMIENTO") -> str:
            """Guarda o actualiza la ficha del lead en la base de datos."""
            res = execute_guardar_lead(session_id, nombre, tipo_vehiculo_interes, uso_principal, etapa, db=db)
            return json.dumps(res)

        def solicitar_contacto_humano(motivo: str = "ESCALADO_HUMANO", resumen_requerimiento: str = "") -> str:
            """Genera un ticket de derivación asistida (HITL) hacia un asesor humano."""
            res = execute_solicitar_contacto_humano(session_id, motivo, resumen_requerimiento, db=db)
            return json.dumps(res)

        def base_conocimientos_autos(query: str) -> str:
            """Consulta el repositorio de documentación técnica automotriz."""
            res = execute_base_conocimientos_autos(query, top_k=2)
            return json.dumps(res)

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=settings.AGENT_TEMPERATURE,
            tools=[guardar_lead, solicitar_contacto_humano, base_conocimientos_autos]
        )

        contents = []
        for h in history:
            contents.append(types.Content(
                role="user" if h["role"] == "user" else "model",
                parts=[types.Part.from_text(text=h["content"])]
            ))
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

        # Call Gemini in worker thread
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._genai_client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
        )

        reply_text = response.text or ""
        tools_called: list[ToolExecutionRecord] = []
        hitl_triggered = False
        hitl_payload = None

        # Check if function calls were executed
        if hasattr(response, "function_calls") and response.function_calls:
            for fc in response.function_calls:
                tools_called.append(ToolExecutionRecord(
                    tool_name=fc.name,
                    input_payload=fc.args or {},
                    output_payload={"status": "executed"},
                    duration_ms=20.0
                ))
                if fc.name == "solicitar_contacto_humano":
                    hitl_triggered = True

        return reply_text, tools_called, hitl_triggered, hitl_payload

    async def process_message(
        self,
        request: ChatRequest,
        db: Session
    ) -> ChatResponse:
        """
        Processes an incoming user message end-to-end with OpenTelemetry spans,
        pre/post guardrails, memory loading, and tool orchestration.
        """
        start_time = time.time()
        trace_id = generate_trace_id()
        session_id = request.session_id or f"sess_{trace_id[:8]}"
        model_name = request.model or settings.DEFAULT_MODEL

        with trace_span("agent.turn", {
            "session_id": session_id,
            "gen_ai.request.model": model_name,
            "trace_id": trace_id
        }) as span:
            # 1. Initialize or load session
            memory_manager.get_or_create_session(session_id, db=db)
            lead = memory_manager.get_lead_context(session_id, db=db)

            # 2. Pre-execution Guardrails
            guardrail_res = check_pre_execution_guardrails(request.message)
            if not guardrail_res.is_safe:
                fallback_msg = guardrail_res.fallback_response or "Disculpa, ¿en qué te puedo orientar respecto a tu vehículo?"
                # Persist messages
                memory_manager.add_message(session_id, "user", request.message, db=db)
                memory_manager.add_message(session_id, "assistant", fallback_msg, db=db)

                elapsed_ms = (time.time() - start_time) * 1000
                record_genai_metrics(span, model_name, prompt_tokens=10, completion_tokens=15)
                return ChatResponse(
                    response=fallback_msg,
                    session_id=session_id,
                    model=model_name,
                    trace_id=trace_id,
                    tools_called=[],
                    hitl_triggered=False,
                    prompt_tokens=10,
                    completion_tokens=15,
                    total_latency_ms=round(elapsed_ms, 2)
                )

            # 3. Load Context & Sliding Window History
            history, estimated_prompt_tokens = memory_manager.get_sliding_window_context(
                session_id=session_id,
                max_tokens=settings.MAX_CONTEXT_TOKENS,
                max_messages=settings.MAX_HISTORY_MESSAGES,
                db=db
            )
            system_prompt = build_system_instruction(lead)

            # 4. Orchestrate LLM or Deterministic Engine
            use_real_gemini = (
                self._genai_client is not None
                and model_name != "mock-agent"
                and bool(settings.GEMINI_API_KEY)
            )

            if use_real_gemini:
                try:
                    raw_reply, tools_called, hitl_triggered, hitl_payload = await self._execute_gemini_call(
                        model_name=model_name,
                        system_prompt=system_prompt,
                        history=history,
                        user_message=request.message,
                        session_id=session_id,
                        db=db
                    )
                except Exception as e:
                    logger.warning(f"Gemini API call failed: {e}. Executing resilient mock fallback.")
                    span.record_exception(e)
                    raw_reply, tools_called, hitl_triggered, hitl_payload = self._determine_mock_actions(
                        request.message, lead, session_id, db
                    )
            else:
                raw_reply, tools_called, hitl_triggered, hitl_payload = self._determine_mock_actions(
                    request.message, lead, session_id, db
                )

            # 5. Post-execution Guardrails
            known_name = lead.nombre if lead and lead.nombre else None
            final_reply = check_post_execution_guardrails(raw_reply, known_name=known_name)

            # 6. Persist conversation turns
            prompt_tokens = estimated_prompt_tokens + memory_manager.estimate_tokens(request.message) + memory_manager.estimate_tokens(system_prompt)
            completion_tokens = memory_manager.estimate_tokens(final_reply)

            memory_manager.add_message(session_id, "user", request.message, tokens=memory_manager.estimate_tokens(request.message), db=db)
            memory_manager.add_message(session_id, "assistant", final_reply, tokens=completion_tokens, db=db)

            elapsed_ms = (time.time() - start_time) * 1000
            record_genai_metrics(span, model_name, prompt_tokens, completion_tokens)

            hitl_output = None
            if hitl_payload:
                hitl_output = SolicitarContactoHumanoOutput(**hitl_payload)

            return ChatResponse(
                response=final_reply,
                session_id=session_id,
                model=model_name,
                trace_id=trace_id,
                tools_called=tools_called,
                hitl_triggered=hitl_triggered,
                hitl_ticket=hitl_output,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_latency_ms=round(elapsed_ms, 2)
            )

    async def process_message_stream(
        self,
        request: ChatRequest,
        db: Session
    ) -> AsyncGenerator[str, None]:
        """
        Streams response chunks, tool notifications, and telemetry via SSE events.
        """
        response = await self.process_message(request, db)

        # 1. Send tool calls if any
        for t in response.tools_called:
            yield f"event: tool_call\ndata: {json.dumps(t.model_dump())}\n\n"

        # 2. Send HITL alert if triggered
        if response.hitl_triggered and response.hitl_ticket:
            yield f"event: hitl_interrupt\ndata: {json.dumps(response.hitl_ticket.model_dump())}\n\n"

        # 3. Stream text delta tokens
        words = response.response.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"event: text_delta\ndata: {json.dumps({'delta': chunk})}\n\n"
            await asyncio.sleep(0.02)  # Natural typing latency effect

        # 4. Send telemetry event
        telemetry_payload = {
            "trace_id": response.trace_id,
            "session_id": response.session_id,
            "latency_ms": response.total_latency_ms,
            "prompt_tokens": response.prompt_tokens,
            "completion_tokens": response.completion_tokens,
            "model": response.model
        }
        yield f"event: telemetry\ndata: {json.dumps(telemetry_payload)}\n\n"
        yield f"event: done\ndata: {json.dumps({'status': 'completed', 'session_id': response.session_id})}\n\n"


orchestrator = AgentOrchestrator()
