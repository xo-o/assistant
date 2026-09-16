import { getDatabase } from "./database.js";
import { randomUUID } from "crypto";

export interface ChatSessionRecord {
  id: string;
  user_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  token_count: number;
  tool_calls: string | null;
  tool_results: string | null;
  created_at: string;
}

export interface LeadRecord {
  id: string;
  session_id: string;
  name: string | null;
  contact_channel: string | null;
  vehicle_type_interest: string | null;
  primary_use: string | null;
  stage: "DESCUBRIMIENTO" | "INTERES_CONCRETO";
  status: "ACTIVE" | "QUALIFIED" | "CONTACTED";
  created_at: string;
  updated_at: string;
}

export interface HitlTicketRecord {
  id: string;
  ticket_code: string;
  session_id: string;
  reason: string;
  requirement_summary: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  operator_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFeedbackRecord {
  id: string;
  session_id: string;
  message_id: string | null;
  is_positive: number;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

export interface ExecutionTraceRecord {
  id: string;
  trace_id: string;
  session_id: string;
  model_name: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  tools_called: string | null;
  guardrails_result: string | null;
  created_at: string;
}

export class Repository {
  private get db() {
    return getDatabase();
  }

  // SESSIONS
  ensureSession(sessionId: string, userId?: string): ChatSessionRecord {
    const existing = this.db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId) as ChatSessionRecord | undefined;
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    this.db.prepare(
      "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(sessionId, userId || null, "Nueva Consulta", now, now);

    return {
      id: sessionId,
      user_id: userId || null,
      title: "Nueva Consulta",
      created_at: now,
      updated_at: now,
      metadata: null,
    };
  }

  touchSession(sessionId: string, title?: string): void {
    const now = new Date().toISOString();
    if (title) {
      this.db.prepare("UPDATE chat_sessions SET updated_at = ?, title = ? WHERE id = ?").run(now, title, sessionId);
    } else {
      this.db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
    }
  }

  listSessions(limit = 50): ChatSessionRecord[] {
    return this.db.prepare("SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT ?").all(limit) as ChatSessionRecord[];
  }

  // MESSAGES
  addMessage(params: {
    sessionId: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tokenCount?: number;
    toolCalls?: unknown;
    toolResults?: unknown;
  }): ChatMessageRecord {
    const id = "msg_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();
    const tokenCount = params.tokenCount ?? Math.ceil(params.content.length / 4);

    this.db.prepare(
      `INSERT INTO chat_messages (id, session_id, role, content, token_count, tool_calls, tool_results, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.sessionId,
      params.role,
      params.content,
      tokenCount,
      params.toolCalls ? JSON.stringify(params.toolCalls) : null,
      params.toolResults ? JSON.stringify(params.toolResults) : null,
      now
    );

    this.touchSession(params.sessionId);

    return {
      id,
      session_id: params.sessionId,
      role: params.role,
      content: params.content,
      token_count: tokenCount,
      tool_calls: params.toolCalls ? JSON.stringify(params.toolCalls) : null,
      tool_results: params.toolResults ? JSON.stringify(params.toolResults) : null,
      created_at: now,
    };
  }

  getSessionMessages(sessionId: string, limit = 50): ChatMessageRecord[] {
    return this.db.prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY rowid ASC LIMIT ?"
    ).all(sessionId, limit) as ChatMessageRecord[];
  }

  getSlidingWindowMessages(sessionId: string, maxTokens = 4000, maxTurns = 10): ChatMessageRecord[] {
    // Retrieve recent messages ordered descending to budget tokens
    const recentMessages = this.db.prepare(
      "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY rowid DESC LIMIT ?"
    ).all(sessionId, maxTurns * 2) as ChatMessageRecord[];

    const budgeted: ChatMessageRecord[] = [];
    let currentTokens = 0;

    for (const msg of recentMessages) {
      if (currentTokens + msg.token_count > maxTokens) {
        break;
      }
      budgeted.push(msg);
      currentTokens += msg.token_count;
    }

    // Return in chronological order
    return budgeted.reverse();
  }

  // LEADS
  saveOrUpdateLead(lead: {
    sessionId: string;
    name?: string;
    contactChannel?: string;
    vehicleTypeInterest?: string;
    primaryUse?: string;
    stage?: "DESCUBRIMIENTO" | "INTERES_CONCRETO";
  }): LeadRecord {
    const existing = this.db.prepare("SELECT * FROM leads WHERE session_id = ?").get(lead.sessionId) as LeadRecord | undefined;
    const now = new Date().toISOString();

    if (existing) {
      const updatedName = lead.name || existing.name;
      const updatedChannel = lead.contactChannel || existing.contact_channel;
      const updatedVehicle = lead.vehicleTypeInterest || existing.vehicle_type_interest;
      const updatedUse = lead.primaryUse || existing.primary_use;
      const updatedStage = lead.stage || existing.stage;

      this.db.prepare(
        `UPDATE leads SET
          name = ?,
          contact_channel = ?,
          vehicle_type_interest = ?,
          primary_use = ?,
          stage = ?,
          updated_at = ?
        WHERE session_id = ?`
      ).run(updatedName, updatedChannel, updatedVehicle, updatedUse, updatedStage, now, lead.sessionId);

      return {
        ...existing,
        name: updatedName,
        contact_channel: updatedChannel,
        vehicle_type_interest: updatedVehicle,
        primary_use: updatedUse,
        stage: updatedStage,
        updated_at: now,
      };
    } else {
      const id = "lead_" + randomUUID().replace(/-/g, "").slice(0, 16);
      const stage = lead.stage || "DESCUBRIMIENTO";
      this.db.prepare(
        `INSERT INTO leads (id, session_id, name, contact_channel, vehicle_type_interest, primary_use, stage, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
      ).run(
        id,
        lead.sessionId,
        lead.name || null,
        lead.contactChannel || lead.sessionId,
        lead.vehicleTypeInterest || null,
        lead.primaryUse || null,
        stage,
        now,
        now
      );

      return {
        id,
        session_id: lead.sessionId,
        name: lead.name || null,
        contact_channel: lead.contactChannel || lead.sessionId,
        vehicle_type_interest: lead.vehicleTypeInterest || null,
        primary_use: lead.primaryUse || null,
        stage,
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      };
    }
  }

  getLeadBySessionId(sessionId: string): LeadRecord | null {
    const lead = this.db.prepare("SELECT * FROM leads WHERE session_id = ?").get(sessionId) as LeadRecord | undefined;
    return lead || null;
  }

  listLeads(limit = 100): LeadRecord[] {
    return this.db.prepare("SELECT * FROM leads ORDER BY updated_at DESC LIMIT ?").all(limit) as LeadRecord[];
  }

  // HITL TICKETS
  createHitlTicket(ticket: {
    sessionId: string;
    reason: string;
    requirementSummary: string;
    ticketCode?: string;
  }): HitlTicketRecord {
    const id = "tick_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const code = ticket.ticketCode || `TICK-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO hitl_tickets (id, ticket_code, session_id, reason, requirement_summary, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`
    ).run(id, code, ticket.sessionId, ticket.reason, ticket.requirementSummary, now, now);

    return {
      id,
      ticket_code: code,
      session_id: ticket.sessionId,
      reason: ticket.reason,
      requirement_summary: ticket.requirementSummary,
      status: "PENDING",
      operator_notes: null,
      created_at: now,
      updated_at: now,
    };
  }

  getHitlTicketByCode(ticketCode: string): HitlTicketRecord | null {
    const ticket = this.db.prepare("SELECT * FROM hitl_tickets WHERE ticket_code = ?").get(ticketCode) as HitlTicketRecord | undefined;
    return ticket || null;
  }

  listHitlTickets(sessionId?: string, limit = 50): HitlTicketRecord[] {
    if (sessionId) {
      return this.db.prepare("SELECT * FROM hitl_tickets WHERE session_id = ? ORDER BY created_at DESC LIMIT ?").all(sessionId, limit) as HitlTicketRecord[];
    }
    return this.db.prepare("SELECT * FROM hitl_tickets ORDER BY created_at DESC LIMIT ?").all(limit) as HitlTicketRecord[];
  }

  updateHitlTicket(ticketCode: string, status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED", notes?: string): HitlTicketRecord | null {
    const now = new Date().toISOString();
    this.db.prepare(
      "UPDATE hitl_tickets SET status = ?, operator_notes = COALESCE(?, operator_notes), updated_at = ? WHERE ticket_code = ?"
    ).run(status, notes || null, now, ticketCode);
    return this.getHitlTicketByCode(ticketCode);
  }

  // FEEDBACK
  saveFeedback(feedback: {
    sessionId: string;
    messageId?: string;
    isPositive: boolean;
    rating?: number;
    comment?: string;
  }): UserFeedbackRecord {
    const id = "fb_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO user_feedbacks (id, session_id, message_id, is_positive, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      feedback.sessionId,
      feedback.messageId || null,
      feedback.isPositive ? 1 : 0,
      feedback.rating || null,
      feedback.comment || null,
      now
    );

    return {
      id,
      session_id: feedback.sessionId,
      message_id: feedback.messageId || null,
      is_positive: feedback.isPositive ? 1 : 0,
      rating: feedback.rating || null,
      comment: feedback.comment || null,
      created_at: now,
    };
  }

  listFeedback(limit = 100): UserFeedbackRecord[] {
    return this.db.prepare("SELECT * FROM user_feedbacks ORDER BY created_at DESC LIMIT ?").all(limit) as UserFeedbackRecord[];
  }

  // TRACES / TELEMETRY
  saveTrace(trace: {
    traceId: string;
    sessionId: string;
    modelName: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolsCalled?: unknown;
    guardrailsResult?: unknown;
  }): ExecutionTraceRecord {
    const id = "tr_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO execution_traces (id, trace_id, session_id, model_name, latency_ms, input_tokens, output_tokens, total_tokens, tools_called, guardrails_result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      trace.traceId,
      trace.sessionId,
      trace.modelName,
      trace.latencyMs,
      trace.inputTokens,
      trace.outputTokens,
      trace.totalTokens,
      trace.toolsCalled ? JSON.stringify(trace.toolsCalled) : null,
      trace.guardrailsResult ? JSON.stringify(trace.guardrailsResult) : null,
      now
    );

    return {
      id,
      trace_id: trace.traceId,
      session_id: trace.sessionId,
      model_name: trace.modelName,
      latency_ms: trace.latencyMs,
      input_tokens: trace.inputTokens,
      output_tokens: trace.outputTokens,
      total_tokens: trace.totalTokens,
      tools_called: trace.toolsCalled ? JSON.stringify(trace.toolsCalled) : null,
      guardrails_result: trace.guardrailsResult ? JSON.stringify(trace.guardrailsResult) : null,
      created_at: now,
    };
  }

  listTraces(sessionId?: string, limit = 50): ExecutionTraceRecord[] {
    if (sessionId) {
      return this.db.prepare("SELECT * FROM execution_traces WHERE session_id = ? ORDER BY created_at DESC LIMIT ?").all(sessionId, limit) as ExecutionTraceRecord[];
    }
    return this.db.prepare("SELECT * FROM execution_traces ORDER BY created_at DESC LIMIT ?").all(limit) as ExecutionTraceRecord[];
  }
}

export const repository = new Repository();
