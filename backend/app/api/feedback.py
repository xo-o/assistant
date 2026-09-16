from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.entities import UserFeedback
from app.models.schemas import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse)
def record_feedback(
    payload: FeedbackRequest,
    db: Session = Depends(get_db)
):
    """Records user quality feedback (thumbs up/down, star ratings, comments)."""
    feedback = UserFeedback(
        session_id=payload.session_id,
        message_id=payload.message_id,
        thumbs_up=payload.thumbs_up,
        rating=payload.rating,
        comment=payload.comment or "",
        trace_id=payload.trace_id or ""
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return FeedbackResponse(
        status="success",
        feedback_id=feedback.id,
        message="Feedback recorded successfully"
    )


@router.get("")
def list_feedback(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve recorded feedback entries."""
    feedbacks = db.query(UserFeedback).order_by(UserFeedback.created_at.desc()).limit(limit).all()
    return feedbacks
