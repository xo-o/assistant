from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.entities import HITLTicket, ChatSession
from app.models.schemas import (
    HITLTicketResponse,
    HITLResolveRequest,
    StatusHITL,
)

router = APIRouter(prefix="/hitl", tags=["Human in the Loop"])


@router.get("/tickets", response_model=List[HITLTicketResponse])
def list_tickets(
    status: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all HITL escalation tickets."""
    query = db.query(HITLTicket)
    if status:
        query = query.filter(HITLTicket.status == status)
    tickets = query.order_by(HITLTicket.created_at.desc()).limit(limit).all()
    return tickets


@router.post("/tickets/{ticket_id}/resolve", response_model=HITLTicketResponse)
def resolve_ticket(
    ticket_id: str,
    payload: HITLResolveRequest,
    db: Session = Depends(get_db)
):
    """Resolve, approve, or reject an assisted escalation ticket."""
    ticket = db.query(HITLTicket).filter(HITLTicket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="HITL ticket not found")

    ticket.status = payload.action.value
    ticket.agent_notes = payload.agent_notes
    if payload.assigned_advisor:
        ticket.assigned_advisor = payload.assigned_advisor

    # Update associated session status
    session_entity = db.query(ChatSession).filter(ChatSession.session_id == ticket.session_id).first()
    if session_entity:
        if payload.action == StatusHITL.RESOLVED:
            session_entity.status = "resolved"
        elif payload.action == StatusHITL.APPROVED:
            session_entity.status = "escalated"

    db.commit()
    db.refresh(ticket)
    return ticket
