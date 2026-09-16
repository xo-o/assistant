import json
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import ChatSession, ChatMessage, LeadRecord
from app.telemetry.tracer import trace_span

logger = logging.getLogger("memory")


class SessionMemoryManager:
    """
    Manages conversational memory, session isolation, and context sliding windows.
    Ensures zero cross-contamination between sessions and controls token window limits.
    """

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Heuristic token estimation: ~4 chars per token + safety margin."""
        if not text:
            return 0
        return max(1, len(text.strip()) // 4)

    @staticmethod
    def get_or_create_session(session_id: str, db: Session) -> ChatSession:
        session_entity = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if not session_entity:
            session_entity = ChatSession(session_id=session_id, status="active")
            db.add(session_entity)
            db.commit()
            db.refresh(session_entity)
        return session_entity

    @staticmethod
    def add_message(
        session_id: str,
        role: str,
        content: str,
        tool_name: Optional[str] = None,
        tool_payload: Optional[dict] = None,
        tokens: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Optional[ChatMessage]:
        if db is None:
            return None

        tokens_count = tokens if tokens is not None else SessionMemoryManager.estimate_tokens(content)
        payload_str = json.dumps(tool_payload) if tool_payload else None

        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            tool_name=tool_name,
            tool_payload=payload_str,
            tokens_count=tokens_count
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def get_lead_context(session_id: str, db: Session) -> Optional[LeadRecord]:
        """Retrieves known lead profile entities for anti-loop and context personalization."""
        return db.query(LeadRecord).filter(LeadRecord.session_id == session_id).first()

    @staticmethod
    def get_sliding_window_context(
        session_id: str,
        max_tokens: int = 4000,
        max_messages: int = 20,
        db: Optional[Session] = None
    ) -> tuple[list[dict[str, str]], int]:
        """
        Retrieves recent conversation history adhering to strict token and message limits.
        Traced with OpenTelemetry.
        Returns (list_of_messages, estimated_total_tokens).
        """
        with trace_span("memory.load_context", {"session_id": session_id}) as span:
            if db is None:
                span.set_attribute("memory.history_count", 0)
                return [], 0

            # Query strictly by session_id to guarantee session isolation
            messages = (
                db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at.asc())
                .all()
            )

            if not messages:
                span.set_attribute("memory.history_count", 0)
                return [], 0

            # Sliding window: start from the most recent messages backwards
            selected_messages: list[dict[str, str]] = []
            total_tokens = 0

            for msg in reversed(messages):
                msg_tokens = msg.tokens_count or SessionMemoryManager.estimate_tokens(msg.content)
                if len(selected_messages) >= max_messages or (total_tokens + msg_tokens) > max_tokens:
                    break

                selected_messages.append({"role": msg.role, "content": msg.content})
                total_tokens += msg_tokens

            # Restore chronological order
            selected_messages.reverse()

            span.set_attribute("memory.history_count", len(selected_messages))
            span.set_attribute("memory.total_tokens", total_tokens)
            return selected_messages, total_tokens


memory_manager = SessionMemoryManager()
