from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import ChatRequest, ChatResponse
from app.agent.orchestrator import orchestrator

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def handle_chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Handles user chat message.
    Supports either Server-Sent Events (SSE) streaming or standard JSON response.
    """
    if request.stream:
        return StreamingResponse(
            orchestrator.process_message_stream(request, db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        response = await orchestrator.process_message(request, db)
        return response
