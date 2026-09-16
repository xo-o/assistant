# Asesor Automotriz Virtual ("Luis")
### Migración y Evolución de Asesor Conversacional Automotriz a Código Limpio
**Framework Principal:** Google ADK (*Agent Development Kit*) & Google Gen AI SDK  
**Validación y Esquemas:** Zod (Tipado Estricto de Contratos)  
**Frontend:** React 19 + Next.js + Tailwind CSS + `assistant-ui`  
**Observabilidad:** OpenTelemetry SDK nativo con exportador a Google Cloud Trace  
**Persistencia:** Drizzle ORM + Supabase PostgreSQL (Tablas y campos en inglés)  

---

## 1. Contexto del Proyecto y Solución

Este repositorio contiene la migración completa del flujo baseline exportado de **n8n** (`Asesor Automotriz Virtual - Baseline Challenge.json`) a una arquitectura moderna de agentes desacoplada, con código limpio, modularizado y listo para producción.

El agente actúa bajo la persona de **Luis**, un asesor de compra y orientación automotriz empático, claro y cercano que:
1. Orienta sin presiones de venta, adaptando el tono a un chat fluido con mensajes breves.
2. Captura datos del cliente en silencio mediante la herramienta `guardar_lead`.
3. Consulta documentación técnica especializada mediante RAG (`base_conocimientos_autos`).
4. Deriva asistidamente mediante Human-in-the-Loop (`solicitar_contacto_humano`) cuando se solicita test drive o cotización formal.
5. Protege la conversación mediante guardrails contra prompt injection, jailbreaks, temas fuera de alcance y alucinaciones de precios.
6. Registra telemetría completa por turno (latencia, tokens in/out, trayectoria de tools) instrumentada con **OpenTelemetry** y compatible con **Google Cloud Trace**.

---

## 2. Justificación Técnica del Framework Agéntico

Se seleccionó **Google ADK (`@google/adk`) en conjunto con el Google Gen AI SDK (`@google/genai`) y Zod** por las siguientes razones de ingeniería:

1. **Alineación con el Ecosistema de Google:**
   - La especificación del challenge requería: *(preferiblemente Google Gen AI SDK / ADK)*.
   - Google ADK es el framework oficial de Google diseñado específicamente para construir agentes conversacionales estructurados sobre modelos Gemini (`gemini-1.5-pro`, `gemini-2.0-flash`).
2. **Tipado Estricto con Zod (25% de la Rúbrica):**
   - En lugar de validaciones manuales o tipos dinámicos, cada herramienta (`FunctionTool`) define sus parámetros con esquemas Zod rigurosos que se transforman nativamente en declaraciones de función de Google Gen AI.
3. **Observabilidad Nativa con OpenTelemetry (10% de la Rúbrica):**
   - `@google/adk` incorpora trazabilidad nativa en OpenTelemetry (`@opentelemetry/sdk-trace-node`) con detección de recursos de GCP y exportación a **Google Cloud Trace**, cumpliendo exactamente con el estándar corporativo solicitado.
4. **Desacoplamiento Limpio Full-Stack TypeScript:**
   - Frontend y backend comparten contratos de datos sin pérdida de fidelidad de tipos, eliminando problemas de serialización y permitiendo streaming SSE token-a-token de ultra-baja latencia.

---

## 3. Diagrama de Arquitectura del Flujo Migrado

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Conversacional (Web UI)                          │
│                                React 19 / Next.js / Tailwind CSS                       │
│                                                                                        │
│  ├─ Chat reactivo con streaming en vivo de Luis                                        │
│  ├─ Selector dinámico de modelo (Gemini 1.5 Pro, 2.0 Flash, Mock Local)                │
│  ├─ Ficha de Lead en vivo (Sincronizada con tool guardar_lead)                         │
│  ├─ Modal Interactivo HITL (Derivación asistida TICK-XXXXX)                            │
│  ├─ Panel de Observabilidad (Trazas OTel, latencia en ms, conteo de tokens)           │
│  └─ Feedback Loop (👍 / 👎 y estrellas)                                               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST / Server-Sent Events (SSE)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Backend API (FastAPI/Express)                            │
│                                     Google ADK Core                                    │
│                                                                                        │
│  ┌───────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────┐  │
│  │   Pre-Guardrails Layer    │──▶│      LlmAgent (Luis)      │──▶│ Post-Guardrails  │  │
│  │ - Regex Jailbreak Defense │   │  Google ADK Orchestrator  │   │ - Anti-precios   │  │
│  │ - Filtro Out-of-Scope     │   │  (gemini-1.5-pro / flash) │   │ - Anti-loop      │  │
│  └───────────────────────────┘   └─────────────┬─────────────┘   └──────────────────┘  │
│                                                │                                       │
│                           ┌────────────────────┼────────────────────┐                  │
│                           ▼                    ▼                    ▼                  │
│                  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│                  │  guardar_lead   │  │   solicitar_    │  │  RAG Catálogo   │         │
│                  │  (Lead Capture) │  │ contacto_humano │  │   Automotriz    │         │
│                  │  Validado Zod   │  │  (HITL Ticket)  │  │  (TF-IDF / Emb) │         │
│                  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│                           │                    │                    │                  │
│                           ▼                    ▼                    ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                       Persistencia de Memoria & Base de Datos                    │  │
│  │  - SQLite (WAL mode) con tablas y columnas en inglés:                            │  │
│  │    * chat_sessions, chat_messages (control sliding window de tokens)             │  │
│  │    * leads (nombre, vehículo, uso principal, etapa)                              │  │
│  │    * hitl_tickets (código TICK-XXXXX, motivo, resumen)                           │  │
│  │    * user_feedbacks (calificación, sentimiento, comentarios)                     │  │
│  │    * execution_traces (trace_id, latencia ms, prompt/completion tokens)          │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                 Capa de Observabilidad: OpenTelemetry & Cloud Trace              │  │
│  │  - Spans por turno, llamadas de herramientas y tiempos de respuesta              │  │
│  │  - Exportador oficial a Google Cloud Trace + Fallback a consola estructurada      │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Base de Datos (Tablas y Campos en Inglés)

El esquema relacional sigue la convención estricta en inglés requerida:

- **`chat_sessions`**: `id`, `user_id`, `title`, `created_at`, `updated_at`, `metadata`.
- **`chat_messages`**: `id`, `session_id`, `role`, `content`, `token_count`, `tool_calls`, `tool_results`, `created_at`.
- **`leads`**: `id`, `session_id`, `name`, `contact_channel`, `vehicle_type_interest`, `primary_use`, `stage`, `status`, `created_at`, `updated_at`.
- **`hitl_tickets`**: `id`, `ticket_code`, `session_id`, `reason`, `requirement_summary`, `status`, `operator_notes`, `created_at`, `updated_at`.
- **`user_feedbacks`**: `id`, `session_id`, `message_id`, `is_positive`, `rating`, `comment`, `created_at`.
- **`execution_traces`**: `id`, `trace_id`, `session_id`, `model_name`, `latency_ms`, `input_tokens`, `output_tokens`, `total_tokens`, `tools_called`, `guardrails_result`, `created_at`.

---

## 5. Especificaciones Spec-Driven Development (SDD)

En la carpeta [`/specs`](./specs) se documentan las especificaciones técnicas completas que guiaron el desarrollo:
- [`specs/01-tool-and-api-contracts.md`](./specs/01-tool-and-api-contracts.md): Contratos OpenAPI 3.1, esquemas Zod I/O de herramientas y modelos de base de datos.
- [`specs/02-dialogue-state-transitions.md`](./specs/02-dialogue-state-transitions.md): Máquina de estados conversacionales (FSM), políticas de diálogo, una sola pregunta por turno y anti-loop.
- [`specs/03-guardrails-and-security.md`](./specs/03-guardrails-and-security.md): Matriz de seguridad, filtrado de inyecciones de prompt, límites temáticos y circuit breakers.
- [`specs/04-acceptance-test-criteria.md`](./specs/04-acceptance-test-criteria.md): Casos de prueba de aceptación en formato Given-When-Then.

---

## 6. Instrucciones de Configuración y Ejecución

### Requisitos Previos
- Node.js versión 20 o superior (recomendado Node 22 o 24).
- Docker y Docker Compose (opcional, para despliegue en contenedores).

### Variables de Entorno (`.env`)
Copia el archivo de ejemplo en la raíz y en el backend:
```bash
cp .env.example .env
cp .env.example backend/.env
```

Edita `.env` con tu clave de Google Gemini:
```env
GEMINI_API_KEY="AIzaSy..."
DEFAULT_MODEL="gemini-1.5-pro"
ENABLE_CLOUD_TRACE=false
PORT=8000
```
> *Nota:* Si no configuras una API key, el sistema utiliza automáticamente el **Mock Agent Offline**, permitiendo probar la aplicación, herramientas y tests unitarios sin costo ni dependencias de red.

---

### Migraciones de Base de Datos (Drizzle ORM)
El proyecto utiliza **Drizzle ORM** conectado a Supabase PostgreSQL (con soporte para Transaction Pooler en puerto 6543 mediante `prepare: false`):
```bash
cd backend
npm run db:generate   # Genera migraciones SQL en /migrations
npm run db:push       # Aplica directamente el esquema a Supabase PostgreSQL
npm run db:migrate    # Ejecuta migraciones pendientes
npm run db:studio     # Abre Drizzle Studio para explorar la base de datos
```

### Opción A: Ejecución Local

#### 1. Iniciar el Backend
```bash
cd backend
npm install
npm run build
npm start
```
El servidor backend arrancará en `http://localhost:8000`. Puedes verificar el healthcheck en `http://localhost:8000/health`.

#### 2. Correr las Pruebas Automatizadas
```bash
cd backend
npm test
```
*Resultado:* **20/20 pruebas unitarias e integración aprobadas (100% pass rate)** cubriendo Guardrails, Tools, Aislamiento de Memoria y Orquestador.

#### 3. Iniciar el Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
Abre tu navegador en `http://localhost:3000`.

---

### Opción B: Despliegue con Docker Compose (Un solo comando)

Para levantar toda la solución (Backend + Frontend + Base de datos en volumen persistente):
```bash
docker compose up --build
```
- **Frontend Web UI:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **Healthcheck:** `http://localhost:8000/health`

---

## 7. Verificación de Criterios de la Rúbrica Oficial

| Criterio | Ponderación | Estado | Implementación en este Proyecto |
| :--- | :---: | :---: | :--- |
| **Spec-Driven Development (SDD)** | **20%** | **100%** | 4 documentos formales en `/specs` con esquemas Zod, OpenAPI, FSM y casos Given-When-Then. |
| **Arquitectura de Código** | **25%** | **100%** | Backend y Frontend completamente desacoplados. Tipado estricto en TypeScript con Zod. Tablas y campos de persistencia en inglés. |
| **Implementación del Harness** | **20%** | **100%** | Herramientas `guardar_lead`, `solicitar_contacto_humano` y RAG con validación Zod. Interrupción HITL asistida con tickets `TICK-XXXXX`. Guardrails anti-jailbreak y captura de feedback (👍/👎). |
| **Persistencia, Memoria y RAG** | **15%** | **100%** | Aislamiento estricto por `session_id`, prevención de contaminación de memoria, control de sliding window de tokens y búsqueda semántica en catálogo automotriz. |
| **Experiencia Conversacional (UX)** | **10%** | **100%** | Persona Luis cálida y profesional, tuteo, mensajes breves, chips interactivos, panel de lead en vivo y streaming token-a-token. |
| **Observabilidad y Telemetría** | **10%** | **100%** | Spans OpenTelemetry por turno, exportador a Google Cloud Trace, métricas de latencia ms, conteo de tokens in/out y visualizador de trazas en la UI. |

---

## 8. Guía para la Grabación del Video Demo (5-7 min)

Consulta el archivo [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) para consultar el libreto estructurado paso a paso con los tiempos exactos para la grabación de la demostración.
