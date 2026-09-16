import re
from app.tools.lead_tool import execute_guardar_lead
from app.tools.hitl_tool import execute_solicitar_contacto_humano
from app.tools.rag_tool import execute_base_conocimientos_autos
from app.models.entities import LeadRecord, HITLTicket


def test_guardar_lead_creation_and_update(db_session):
    """Verify lead creation and subsequent updates in database."""
    session_id = "sess_lead_unit_test"

    # 1. Initial creation with name
    res1 = execute_guardar_lead(
        session_id=session_id,
        nombre="Luciana",
        etapa="DESCUBRIMIENTO",
        db=db_session
    )
    assert res1["status"] == "success"
    assert res1["lead"]["nombre"] == "Luciana"
    assert res1["lead"]["etapa"] == "DESCUBRIMIENTO"

    db_lead = db_session.query(LeadRecord).filter(LeadRecord.session_id == session_id).first()
    assert db_lead is not None
    assert db_lead.nombre == "Luciana"

    # 2. Update with vehicle type and concrete interest
    res2 = execute_guardar_lead(
        session_id=session_id,
        tipo_vehiculo_interes="SUV",
        uso_principal="Viajes familiares",
        etapa="INTERES_CONCRETO",
        db=db_session
    )
    assert res2["status"] == "success"

    db_session.refresh(db_lead)
    assert db_lead.nombre == "Luciana"
    assert db_lead.tipo_vehiculo_interes == "SUV"
    assert db_lead.uso_principal == "Viajes familiares"
    assert db_lead.etapa == "INTERES_CONCRETO"


def test_solicitar_contacto_humano_hitl(db_session):
    """Verify HITL ticket generation format TICK-XXXXX and DB persistence."""
    session_id = "sess_hitl_unit_test"

    res = execute_solicitar_contacto_humano(
        session_id=session_id,
        motivo="TEST_DRIVE",
        resumen_requerimiento="Cliente desea probar una SUV híbrida el sábado en la tarde",
        db=db_session
    )

    assert res["status"] == "ticket_created"
    assert re.match(r"^TICK-\d{5}$", res["ticket_id"])
    assert res["session_id"] == session_id
    assert res["motivo"] == "TEST_DRIVE"

    db_ticket = db_session.query(HITLTicket).filter(HITLTicket.ticket_id == res["ticket_id"]).first()
    assert db_ticket is not None
    assert db_ticket.status == "PENDING"
    assert db_ticket.resumen_requerimiento == "Cliente desea probar una SUV híbrida el sábado en la tarde"


def test_base_conocimientos_autos_rag():
    """Verify automotive knowledge base retrieval returns high-relevance matches."""
    # Test query about SUV vs Sedan
    res_suv = execute_base_conocimientos_autos("diferencia entre suv y sedan para familia", top_k=2)
    assert len(res_suv["results"]) > 0
    top_doc = res_suv["results"][0]
    assert "SUV vs Sedán" in top_doc["topic"]
    assert top_doc["score"] > 0.5

    # Test query about hybrid vehicles
    res_hev = execute_base_conocimientos_autos("ahorro de combustible auto híbrido en ciudad", top_k=2)
    assert len(res_hev["results"]) > 0
    assert any("Híbridos" in d["topic"] or "Eficiencia" in d["topic"] for d in res_hev["results"])
