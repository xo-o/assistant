from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.entities import LeadRecord
from app.models.schemas import LeadResponse

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("", response_model=List[LeadResponse])
def list_leads(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all captured customer leads."""
    leads = db.query(LeadRecord).order_by(LeadRecord.created_at.desc()).limit(limit).all()
    return leads


@router.get("/{session_id}", response_model=LeadResponse)
def get_lead_by_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve lead data for a specific session."""
    lead = db.query(LeadRecord).filter(LeadRecord.session_id == session_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found for this session")
    return lead
