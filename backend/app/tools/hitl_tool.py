import logging
import random
from typing import Optional
from sqlalchemy.orm import Session

from app.models.entities import HITLTicket, ChatSession
from app.models.schemas import (
    SolicitarContactoHumanoInput,
    SolicitarContactoHumanoOutput,
    MotivoHITL,
    StatusHITL,
)
from app.telemetry.tracer import trace_span

logger = logging.getLogger("tools.hitl")


def execute_solicitar_contacto_humano(
    session_id: str,
    motivo: Optional[str] = "ESCALADO_HUMANO",
    resumen_requerimiento: Optional[str] = "Sin requerimiento especificado",
    db: Optional[Session] = None
) -> dict:
    """
    Executes the solicitar_contacto_humano tool (Human-in-the-Loop).
    Creates an assisted escalation ticket and updates conversational state.
    Matches baseline n8n toolCode logic while enforcing Pydantic validation and DB persistence.
    """
    with trace_span("tool.solicitar_contacto_humano", {"session_id": session_id}) as span:
        safe_input = SolicitarContactoHumanoInput(
            session_id=session_id or "session_default",
            motivo=motivo or MotivoHITL.ESCALADO_HUMANO.value,
            resumen_requerimiento=resumen_requerimiento or "Sin requerimiento especificado",
        )

        ticket_number = random.randint(10000, 99999)
        ticket_id = f"TICK-{ticket_number}"

        span.set_attribute("hitl.ticket_id", ticket_id)
        span.set_attribute("hitl.motivo", safe_input.motivo)

        if db is not None:
            try:
                ticket = HITLTicket(
                    ticket_id=ticket_id,
                    session_id=safe_input.session_id,
                    motivo=safe_input.motivo,
                    resumen_requerimiento=safe_input.resumen_requerimiento,
                    status=StatusHITL.PENDING.value,
                )
                db.add(ticket)

                session_entity = db.query(ChatSession).filter(ChatSession.session_id == safe_input.session_id).first()
                if session_entity:
                    session_entity.status = "hitl_pending"

                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error persisting HITL ticket in database: {e}")
                span.record_exception(e)

        output = SolicitarContactoHumanoOutput(
            status="ticket_created",
            ticket_id=ticket_id,
            session_id=safe_input.session_id,
            motivo=safe_input.motivo,
            resumen=safe_input.resumen_requerimiento,
        )
        return output.model_dump()
