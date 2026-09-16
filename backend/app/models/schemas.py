from datetime import datetime
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class EtapaLead(str, Enum):
    DESCUBRIMIENTO = "DESCUBRIMIENTO"
    INTERES_CONCRETO = "INTERES_CONCRETO"


class MotivoHITL(str, Enum):
    TEST_DRIVE = "TEST_DRIVE"
    COTIZACION_FORMAL = "COTIZACION_FORMAL"
    ESCALADO_HUMANO = "ESCALADO_HUMANO"
    QUEJA_O_DISCONFORMIDAD = "QUEJA_O_DISCONFORMIDAD"


class StatusHITL(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"


# --- Tool Schemas ---

class GuardarLeadInput(BaseModel):
    session_id: str = Field(default="session_default", description="Identificador de la sesión")
    nombre: Optional[str] = Field(default="", description="Nombre del usuario/cliente")
    tipo_vehiculo_interes: Optional[str] = Field(default="", description="Tipo de carrocería o modelo de interés (ej. SUV, Sedán, Pick-up)")
    uso_principal: Optional[str] = Field(default="", description="Uso previsto (ej. Ciudad, Viajes familiares, Trabajo)")
    etapa: Optional[EtapaLead] = Field(default=EtapaLead.DESCUBRIMIENTO, description="Etapa en el embudo")


class LeadPayload(BaseModel):
    session_id: str
    nombre: str
    tipo_vehiculo: str
    uso: str
    etapa: str


class GuardarLeadOutput(BaseModel):
    status: str = "success"
    message: str = "Lead guardado correctamente"
    lead: LeadPayload


class SolicitarContactoHumanoInput(BaseModel):
    session_id: str = Field(default="session_default", description="Identificador de la sesión")
    motivo: Optional[str] = Field(default=MotivoHITL.ESCALADO_HUMANO.value, description="Motivo de la derivación asistida")
    resumen_requerimiento: Optional[str] = Field(default="Sin requerimiento especificado", description="Resumen breve del requerimiento del cliente")


class SolicitarContactoHumanoOutput(BaseModel):
    status: str = "ticket_created"
    ticket_id: str
    session_id: str
    motivo: str
    resumen: str


class RAGQueryInput(BaseModel):
    query: str = Field(..., description="Consulta técnica sobre vehículos, segmentos o mantenimiento")
    top_k: int = Field(default=3, description="Número de documentos más relevantes a retornar")


class RAGDocResult(BaseModel):
    id: str
    topic: str
    content: str
    score: float


class RAGQueryOutput(BaseModel):
    results: list[RAGDocResult]


# --- Chat & API Schemas ---

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    session_id: Optional[str] = Field(default=None, description="Optional session ID. Generates UUID if omitted")
    model: Optional[str] = Field(default="gemini-1.5-pro", description="Google Gemini model identifier")
    stream: bool = Field(default=True, description="Whether to stream response events via SSE")


class ToolExecutionRecord(BaseModel):
    tool_name: str
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    duration_ms: float = 0.0


class ChatResponse(BaseModel):
    response: str
    session_id: str
    model: str
    trace_id: str
    tools_called: list[ToolExecutionRecord] = Field(default_factory=list)
    hitl_triggered: bool = False
    hitl_ticket: Optional[SolicitarContactoHumanoOutput] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_latency_ms: float = 0.0


class LeadResponse(BaseModel):
    id: int
    session_id: str
    nombre: str
    canal_contacto: str
    tipo_vehiculo_interes: str
    uso_principal: str
    etapa: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HITLTicketResponse(BaseModel):
    id: int
    ticket_id: str
    session_id: str
    motivo: str
    resumen_requerimiento: str
    status: str
    agent_notes: str
    assigned_advisor: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HITLResolveRequest(BaseModel):
    action: StatusHITL = Field(..., description="APPROVED, REJECTED, or RESOLVED")
    agent_notes: str = Field(default="", description="Observaciones del asesor humano")
    assigned_advisor: Optional[str] = Field(default="", description="Email o nombre del asesor asignado")


class FeedbackRequest(BaseModel):
    session_id: str
    message_id: Optional[int] = None
    thumbs_up: Optional[bool] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = ""
    trace_id: Optional[str] = ""


class FeedbackResponse(BaseModel):
    status: str = "success"
    feedback_id: int
    message: str = "Feedback recorded successfully"
