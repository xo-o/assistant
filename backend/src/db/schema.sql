-- Automotive Advisor Database Schema (English Tables and Columns)

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    tool_calls TEXT,
    tool_results TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    name TEXT,
    contact_channel TEXT,
    vehicle_type_interest TEXT,
    primary_use TEXT,
    stage TEXT NOT NULL DEFAULT 'DESCUBRIMIENTO',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hitl_tickets (
    id TEXT PRIMARY KEY,
    ticket_code TEXT UNIQUE NOT NULL,
    session_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    requirement_summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    operator_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_feedbacks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT,
    is_positive INTEGER NOT NULL,
    rating INTEGER,
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_traces (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    tools_called TEXT,
    guardrails_result TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_leads_session_id ON leads(session_id);
CREATE INDEX IF NOT EXISTS idx_hitl_session_id ON hitl_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_session_id ON execution_traces(session_id);
