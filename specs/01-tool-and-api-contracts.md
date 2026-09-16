# Especificación SDD 01: Contratos de API e I/O de Herramientas

Esta especificación formal define los contratos de interfaz, esquemas de datos y especificaciones de entrada/salida (I/O) para la migración del Asesor Automotriz Virtual a código limpio con tipado estricto (Pydantic v2 en Backend y TypeScript en Frontend).

---

## 1. Contratos de API REST & Streaming

### 1.1 Endpoint Principal de Chat (Streaming SSE)
- **Ruta**: `POST /api/v1/chat`
- **Content-Type**: `application/json`
- **Accept**: `text/event-stream` o `application/json`
- **Descripción**: Procesa el mensaje del usuario de forma asíncrona, gestiona la sesión conversacional y transmite la respuesta en streaming token-a-token junto con eventos de herramientas y telemetría.

#### Request Schema (Pydantic: `ChatRequest`)
```json
{
  "message": "Hola, estoy buscando un auto espacioso para mi familia",
  "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "model": "gemini-1.5-pro",
  "stream": true
}
```

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `message` | `string` (min: 1, max: 2000) | Sí | Mensaje enviado por el usuario. |
| `session_id` | `string` (UUID o custom key) | No | Identificador de sesión. Si no se provee, se genera uno nuevo. |
| `model` | `string` (enum: `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`, `mock-agent`) | No (default: `gemini-1.5-pro`) | Modelo de Google Gen AI a utilizar. |
| `stream` | `boolean` | No (default: `true`) | Habilita el streaming de eventos SSE. |

#### Eventos de Streaming (SSE Protocol)
| Evento | Payload | Descripción |
| :--- | :--- | :--- |
| `event: text_delta` | `{"delta": "¡Hola! "}` | Segmento de texto generado por el LLM en tiempo real. |
| `event: tool_call` | `{"tool": "guardar_lead", "input": {...}, "output": {...}}` | Notificación de ejecución de herramienta. |
| `event: hitl_interrupt`| `{"ticket_id": "TICK-48201", "motivo": "TEST_DRIVE", "resumen": "..."}` | Interrupción asistida por solicitud de test drive o cotización. |
| `event: telemetry` | `{"trace_id": "...", "latency_ms": 640, "prompt_tokens": 120, "completion_tokens": 35}` | Resumen de rendimiento del turno. |
| `event: done` | `{"session_id": "...", "status": "completed"}` | Cierre del stream. |

---

### 1.2 Endpoint de Gestión de Leads
- **Ruta**: `GET /api/v1/leads/{session_id}` y `GET /api/v1/leads`
- **Descripción**: Consulta el estado de los leads registrados durante la conversación.

#### Response Schema (Pydantic: `LeadResponse`)
```json
{
  "id": 1,
  "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "nombre": "Carlos Mendoza",
  "canal_contacto": "web_chat",
  "tipo_vehiculo_interes": "SUV",
  "uso_principal": "Viajes familiares y ciudad",
  "etapa": "INTERES_CONCRETO",
  "created_at": "2026-09-16T14:30:00Z",
  "updated_at": "2026-09-16T14:32:15Z"
}
```

---

### 1.3 Endpoint de Tickets Human-in-the-Loop (HITL)
- **Rutas**: 
  - `GET /api/v1/hitl/tickets`
  - `POST /api/v1/hitl/tickets/{ticket_id}/resolve`
- **Descripción**: Permite auditar y resolver intervenciones humanas pendientes generadas por el bot.

#### Request para Resolución (`HITLResolveRequest`)
```json
{
  "action": "APPROVED",
  "agent_notes": "Contacto confirmado con el cliente vía telefónica. Cita de test drive agendada para el sábado.",
  "assigned_advisor": "asesor_humano_lima@automotriz.pe"
}
```

---

### 1.4 Endpoint de Feedback Loop
- **Ruta**: `POST /api/v1/feedback`
- **Descripción**: Registra evaluaciones de calidad de respuesta post-ejecución dadas por el usuario.

#### Request Schema (Pydantic: `FeedbackRequest`)
```json
{
  "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "message_id": 4,
  "thumbs_up": true,
  "rating": 5,
  "comment": "Explicación muy clara sobre el consumo de híbridos vs gasolina",
  "trace_id": "trace_01j7abcde"
}
```

---

## 2. Contratos de Entrada/Salida (I/O) de Herramientas (Agent Tools)

Las herramientas replican exactamente las firmas y responsabilidades del workflow de n8n con tipado estricto:

### 2.1 Herramienta `guardar_lead`
- **Propósito**: Guarda o actualiza la ficha del lead/usuario en la base de datos de gestión. Se invoca silenciosamente cuando el usuario comparte su nombre, tipo de vehículo de interés, uso o cuando avanza en su intención de compra.

#### Input Schema (Pydantic: `GuardarLeadInput`)
```json
{
  "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "nombre": "Carlos Mendoza",
  "tipo_vehiculo_interes": "SUV",
  "uso_principal": "Familiar",
  "etapa": "INTERES_CONCRETO"
}
```

| Parámetro | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `session_id` | `string` | Sí | Identificador de sesión activa. |
| `nombre` | `string` | No (default: `""`) | Nombre proporcionado por el usuario. |
| `tipo_vehiculo_interes` | `string` | No (default: `""`) | Tipo de carrocería o segmento (SUV, sedán, pickup, etc.). |
| `uso_principal` | `string` | No (default: `""`) | Destino de uso (ciudad, viajes familiares, trabajo). |
| `etapa` | `enum` (`DESCUBRIMIENTO`, `INTERES_CONCRETO`) | No (default: `DESCUBRIMIENTO`) | Nivel de avance en el embudo. |

#### Output Schema (Pydantic: `GuardarLeadOutput`)
```json
{
  "status": "success",
  "message": "Lead guardado correctamente",
  "lead": {
    "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "nombre": "Carlos Mendoza",
    "tipo_vehiculo": "SUV",
    "uso": "Familiar",
    "etapa": "INTERES_CONCRETO"
  }
}
```

---

### 2.2 Herramienta `solicitar_contacto_humano` (HITL)
- **Propósito**: Genera un ticket de derivación asistida hacia un asesor humano cuando el usuario solicita un test drive, requiere una cotización formal o prefiere ser atendido por una persona.

#### Input Schema (Pydantic: `SolicitarContactoHumanoInput`)
```json
{
  "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "motivo": "TEST_DRIVE",
  "resumen_requerimiento": "Cliente solicita agendar test drive para una SUV híbrida el fin de semana."
}
```

| Parámetro | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `session_id` | `string` | Sí | Identificador de sesión. |
| `motivo` | `enum` (`TEST_DRIVE`, `COTIZACION_FORMAL`, `ESCALADO_HUMANO`, `QUEJA_O_DISCONFORMIDAD`) | Sí | Razón de la derivación. |
| `resumen_requerimiento`| `string` | Sí | Síntesis concisa del contexto y preferencia del usuario. |

#### Output Schema (Pydantic: `SolicitarContactoHumanoOutput`)
```json
{
  "status": "ticket_created",
  "ticket_id": "TICK-48201",
  "session_id": "sess_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "motivo": "TEST_DRIVE",
  "resumen": "Cliente solicita agendar test drive para una SUV híbrida el fin de semana."
}
```

---

### 2.3 Herramienta `base_conocimientos_autos` (RAG)
- **Propósito**: Repositorio de documentación automotriz general. Contiene guías de segmentos (SUV vs. Sedán vs. Hatchback vs. Pickup), tipos de motorización (gasolina, híbridos HEV/PHEV, eléctricos BEV), rendimiento y glosario técnico.

#### Input Schema (Pydantic: `RAGQueryInput`)
```json
{
  "query": "diferencias entre SUV y Sedan para uso familiar",
  "top_k": 3
}
```

#### Output Schema (Pydantic: `RAGQueryOutput`)
```json
{
  "results": [
    {
      "id": "doc_suv_vs_sedan",
      "topic": "Comparativa de Carrocerías",
      "content": "Las SUV ofrecen mayor despeje del suelo, posición de manejo elevada y facilidad de carga...",
      "relevance_score": 0.92
    }
  ]
}
```
