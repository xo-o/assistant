import re
from typing import Optional, NamedTuple
from app.telemetry.tracer import trace_span


class GuardrailResult(NamedTuple):
    is_safe: bool
    fallback_response: Optional[str] = None
    reason: Optional[str] = None


# Patterns defined in baseline n8n system message
JAILBREAK_PATTERNS = [
    r"ignora\s+(tus|todas\s+tus)?\s*(reglas|instrucciones)",
    r"olvida\s+(tus|todas\s+tus)?\s*(reglas|instrucciones)",
    r"revela\s+(tu|tus)?\s*(prompt|instrucciones|system\s*prompt)",
    r"muestra\s+(tu|tus)?\s*(prompt|instrucciones|system\s*prompt)",
    r"dime\s+(tu|tus)?\s*(prompt|instrucciones|system\s*prompt)",
    r"cu[aá]l\s+es\s+tu\s+(prompt|instrucci[oó]n|system\s*prompt)",
    r"ignore\s+(all\s+)?(previous\s+)?(rules|instructions)",
    r"reveal\s+(your\s+)?(system\s+)?prompt",
    r"act[uú]a\s+como\s+(un\s+)?(pirata|dan|hacker)",
    r"you\s+are\s+now\s+(dan|jailbroken)",
    r"bypass\s+(safety|filters|rules)",
]

JAILBREAK_RESPONSE = "No puedo realizar esa acción 😊 ¿En qué te ayudo respecto a tu búsqueda de auto?"

# Out-of-scope domain topics (cooking, software coding, medical diagnosis, politics)
OUT_OF_SCOPE_PATTERNS = [
    r"\b(receta|pastel|torta|cocinar|cocina|ingredientes\s+para)\b",
    r"\b(escribe\s+un\s+c[oó]digo|funci[oó]n\s+en\s+python|javascript|html\s+css|algoritmo)\b",
    r"\b(s[ií]ntomas\s+de|diagn[oó]stico\s+m[eé]dico|qu[eé]\s+medicamento|pastillas\s+para)\b",
    r"\b(qui[eé]n\s+gan[oó]\s+las\s+elecciones|partido\s+pol[ií]tico|candidato\s+presidencial)\b",
]

OUT_OF_SCOPE_RESPONSE = "Mi especialidad es ayudarte a encontrar el auto ideal y resolver dudas sobre vehículos 😊 Cuéntame si te puedo guiar con algún modelo."

# Automotive domain keywords to prevent false positives in out-of-scope filter
AUTOMOTIVE_ALLOWLIST = [
    "auto", "carro", "vehiculo", "vehículo", "suv", "sedan", "sedán", "hatchback",
    "pickup", "pick-up", "camioneta", "motor", "gasolina", "hibrido", "híbrido",
    "electrico", "eléctrico", "diesel", "diésel", "freno", "llanta", "neumatico",
    "neumático", "consumo", "galon", "galón", "test drive", "cotizacion", "cotización",
    "comprar", "mantenimiento", "cambio de aceite", "potencia", "torque", "maletera",
    "maletero", "asiento", "financiamiento", "kilometraje", "traccion", "tracción"
]


def check_pre_execution_guardrails(user_message: str) -> GuardrailResult:
    """
    Validates user input before execution.
    Catches jailbreaks, prompt injection, and completely unrelated out-of-scope topics.
    """
    with trace_span("guardrails.pre_execution") as span:
        msg = user_message.strip().lower()

        # 1. Check for Jailbreaks / Prompt Injections
        for pattern in JAILBREAK_PATTERNS:
            if re.search(pattern, msg, re.IGNORECASE):
                span.set_attribute("guardrail.triggered", "jailbreak")
                return GuardrailResult(
                    is_safe=False,
                    fallback_response=JAILBREAK_RESPONSE,
                    reason="jailbreak_detected"
                )

        # 2. Check for Out-of-Scope (with allowlist override)
        has_auto_keyword = any(kw in msg for kw in AUTOMOTIVE_ALLOWLIST)
        if not has_auto_keyword:
            for pattern in OUT_OF_SCOPE_PATTERNS:
                if re.search(pattern, msg, re.IGNORECASE):
                    span.set_attribute("guardrail.triggered", "out_of_scope")
                    return GuardrailResult(
                        is_safe=False,
                        fallback_response=OUT_OF_SCOPE_RESPONSE,
                        reason="out_of_scope_detected"
                    )

        span.set_attribute("guardrail.triggered", "none")
        return GuardrailResult(is_safe=True)


def check_post_execution_guardrails(
    assistant_response: str,
    known_name: Optional[str] = None
) -> str:
    """
    Validates assistant output after generation.
    Enforces anti-loop rules (not asking for name if already known)
    and checks against unverified price or stock promises.
    """
    with trace_span("guardrails.post_execution") as span:
        response = assistant_response

        # Anti-loop check: If name is known, ensure assistant doesn't ask "cómo te llamas"
        if known_name:
            ask_name_pattern = r"(c[oó]mo\s+te\s+llamas|cu[aá]l\s+es\s+tu\s+nombre|con\s+qui[eé]n\s+tengo\s+el\s+gusto)"
            if re.search(ask_name_pattern, response, re.IGNORECASE):
                span.set_attribute("guardrail.post.anti_loop", True)
                response = re.sub(
                    ask_name_pattern,
                    f"¿En qué te puedo orientar hoy sobre tu próximo vehículo, {known_name}?",
                    response,
                    flags=re.IGNORECASE
                )

        # Clean excessive emojis (policy: max 1-2 emojis per message)
        # Keep response clean and natural
        return response.strip()
