import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models.entities import LeadRecord
from app.models.schemas import (
    GuardarLeadInput,
    GuardarLeadOutput,
    LeadPayload,
    EtapaLead,
)
from app.telemetry.tracer import trace_span

logger = logging.getLogger("tools.lead")


def execute_guardar_lead(
    session_id: str,
    nombre: Optional[str] = "",
    tipo_vehiculo_interes: Optional[str] = "",
    uso_principal: Optional[str] = "",
    etapa: Optional[str] = "DESCUBRIMIENTO",
    db: Optional[Session] = None
) -> dict:
    """
    Executes the guardar_lead tool: extracts and persists structured lead data.
    Directly mirrors the baseline n8n toolCode logic while enforcing Pydantic validation
    and relational persistence.
    """
    with trace_span("tool.guardar_lead", {"session_id": session_id}) as span:
        safe_input = GuardarLeadInput(
            session_id=session_id or "session_default",
            nombre=(nombre or "").strip(),
            tipo_vehiculo_interes=(tipo_vehiculo_interes or "").strip(),
            uso_principal=(uso_principal or "").strip(),
            etapa=EtapaLead(etapa) if etapa in [e.value for e in EtapaLead] else EtapaLead.DESCUBRIMIENTO,
        )

        span.set_attribute("lead.nombre", safe_input.nombre)
        span.set_attribute("lead.tipo_vehiculo", safe_input.tipo_vehiculo_interes)
        span.set_attribute("lead.etapa", safe_input.etapa.value)

        # Persist in DB if session is available
        if db is not None:
            try:
                lead = db.query(LeadRecord).filter(LeadRecord.session_id == safe_input.session_id).first()
                if not lead:
                    lead = LeadRecord(
                        session_id=safe_input.session_id,
                        nombre=safe_input.nombre,
                        tipo_vehiculo_interes=safe_input.tipo_vehiculo_interes,
                        uso_principal=safe_input.uso_principal,
                        etapa=safe_input.etapa.value,
                    )
                    db.add(lead)
                else:
                    # Update fields only if new values are provided
                    if safe_input.nombre:
                        lead.nombre = safe_input.nombre
                    if safe_input.tipo_vehiculo_interes:
                        lead.tipo_vehiculo_interes = safe_input.tipo_vehiculo_interes
                    if safe_input.uso_principal:
                        lead.uso_principal = safe_input.uso_principal
                    if safe_input.etapa:
                        lead.etapa = safe_input.etapa.value
                db.commit()
                db.refresh(lead)
            except Exception as e:
                db.rollback()
                logger.error(f"Error persisting lead in database: {e}")
                span.record_exception(e)

        output = GuardarLeadOutput(
            status="success",
            message="Lead guardado correctamente",
            lead=LeadPayload(
                session_id=safe_input.session_id,
                nombre=safe_input.nombre,
                tipo_vehiculo=safe_input.tipo_vehiculo_interes,
                uso=safe_input.uso_principal,
                etapa=safe_input.etapa.value,
            )
        )
        return output.model_dump()
