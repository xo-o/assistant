from datetime import datetime, timezone
import json
from typing import Optional, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Index
)
from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, hitl_pending, escalated, closed
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    tool_name = Column(String(100), nullable=True)
    tool_payload = Column(Text, nullable=True)  # JSON-encoded payload
    tokens_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_session_messages", "session_id", "created_at"),
    )


class LeadRecord(Base):
    __tablename__ = "lead_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    nombre = Column(String(150), default="", nullable=False)
    canal_contacto = Column(String(100), default="web_chat", nullable=False)
    tipo_vehiculo_interes = Column(String(150), default="", nullable=False)
    uso_principal = Column(String(255), default="", nullable=False)
    etapa = Column(String(50), default="DESCUBRIMIENTO", nullable=False)  # DESCUBRIMIENTO, INTERES_CONCRETO
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class HITLTicket(Base):
    __tablename__ = "hitl_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(50), unique=True, index=True, nullable=False)
    session_id = Column(String(100), index=True, nullable=False)
    motivo = Column(String(100), nullable=False)  # TEST_DRIVE, COTIZACION_FORMAL, ESCALADO_HUMANO, etc.
    resumen_requerimiento = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED, RESOLVED
    agent_notes = Column(Text, default="", nullable=False)
    assigned_advisor = Column(String(150), default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    message_id = Column(Integer, nullable=True)
    thumbs_up = Column(Boolean, nullable=True)
    rating = Column(Integer, nullable=True)  # 1 to 5
    comment = Column(Text, default="", nullable=False)
    trace_id = Column(String(100), default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
