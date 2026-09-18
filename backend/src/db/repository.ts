import { eq, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDatabase } from "./database.js";
import {
  chatSessions,
  chatMessages,
  leads,
  hitlTickets,
  userFeedbacks,
  executionTraces,
  ChatSession,
  ChatMessage,
  Lead,
  HitlTicket,
  UserFeedback,
  ExecutionTrace,
} from "./schema.js";

export class Repository {
  private get db() {
    return getDatabase();
  }

  // SESSIONS
  async ensureSession(sessionId: string, userId?: string): Promise<ChatSession> {
    const existing = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const now = new Date();
    const [created] = await this.db
      .insert(chatSessions)
      .values({
        id: sessionId,
        userId: userId || null,
        title: "Nueva Consulta",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  async touchSession(sessionId: string, title?: string): Promise<void> {
    const now = new Date();
    if (title) {
      await this.db
        .update(chatSessions)
        .set({ updatedAt: now, title })
        .where(eq(chatSessions.id, sessionId));
    } else {
      await this.db
        .update(chatSessions)
        .set({ updatedAt: now })
        .where(eq(chatSessions.id, sessionId));
    }
  }

  async listSessions(limit = 50): Promise<ChatSession[]> {
    return await this.db
      .select()
      .from(chatSessions)
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .returning();
    return deleted.length > 0;
  }

  // MESSAGES
  async addMessage(params: {
    sessionId: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tokenCount?: number;
    toolCalls?: unknown;
    toolResults?: unknown;
  }): Promise<ChatMessage> {
    const id = "msg_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const tokenCount = params.tokenCount ?? Math.ceil(params.content.length / 4);
    const now = new Date();

    const [created] = await this.db
      .insert(chatMessages)
      .values({
        id,
        sessionId: params.sessionId,
        role: params.role,
        content: params.content,
        tokenCount,
        toolCalls: params.toolCalls ?? null,
        toolResults: params.toolResults ?? null,
        createdAt: now,
      })
      .returning();

    await this.touchSession(params.sessionId);
    return created;
  }

  async getSessionMessages(sessionId: string, limit = 50): Promise<ChatMessage[]> {
    return await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(limit);
  }

  async getSlidingWindowMessages(
    sessionId: string,
    maxTokens = 4000,
    maxTurns = 10
  ): Promise<ChatMessage[]> {
    const recentMessages = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(maxTurns * 2);

    const budgeted: ChatMessage[] = [];
    let currentTokens = 0;

    for (const msg of recentMessages) {
      if (currentTokens + msg.tokenCount > maxTokens) {
        break;
      }
      budgeted.push(msg);
      currentTokens += msg.tokenCount;
    }

    return budgeted.reverse();
  }

  // LEADS
  async saveOrUpdateLead(lead: {
    sessionId: string;
    name?: string;
    contactChannel?: string;
    vehicleTypeInterest?: string;
    primaryUse?: string;
    stage?: "DESCUBRIMIENTO" | "INTERES_CONCRETO";
  }): Promise<Lead> {
    const existing = await this.getLeadBySessionId(lead.sessionId);
    const now = new Date();

    let resultLead: Lead;

    if (existing) {
      const updatedName = lead.name || existing.name;
      const updatedChannel = lead.contactChannel || existing.contactChannel;
      const updatedVehicle = lead.vehicleTypeInterest || existing.vehicleTypeInterest;
      const updatedUse = lead.primaryUse || existing.primaryUse;
      const updatedStage = lead.stage || existing.stage;

      const [updated] = await this.db
        .update(leads)
        .set({
          name: updatedName,
          contactChannel: updatedChannel,
          vehicleTypeInterest: updatedVehicle,
          primaryUse: updatedUse,
          stage: updatedStage,
          updatedAt: now,
        })
        .where(eq(leads.sessionId, lead.sessionId))
        .returning();

      resultLead = updated;
    } else {
      const id = "lead_" + randomUUID().replace(/-/g, "").slice(0, 16);
      const stage = lead.stage || "DESCUBRIMIENTO";

      const [created] = await this.db
        .insert(leads)
        .values({
          id,
          sessionId: lead.sessionId,
          name: lead.name || null,
          contactChannel: lead.contactChannel || lead.sessionId,
          vehicleTypeInterest: lead.vehicleTypeInterest || null,
          primaryUse: lead.primaryUse || null,
          stage,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      resultLead = created;
    }

    // If a real contact channel is provided, link it to any active HITL tickets for this session
    if (
      resultLead.contactChannel &&
      !resultLead.contactChannel.startsWith("sess_") &&
      resultLead.contactChannel !== "session_default"
    ) {
      const sessionTickets = await this.db
        .select()
        .from(hitlTickets)
        .where(eq(hitlTickets.sessionId, lead.sessionId));
      for (const t of sessionTickets) {
        if (!t.requirementSummary.includes(resultLead.contactChannel)) {
          await this.db
            .update(hitlTickets)
            .set({
              requirementSummary: `${t.requirementSummary}\nContacto del cliente: ${resultLead.contactChannel}`,
              updatedAt: now,
            })
            .where(eq(hitlTickets.id, t.id));
        }
      }
    }

    return resultLead;
  }

  async getLeadBySessionId(sessionId: string): Promise<Lead | null> {
    const records = await this.db
      .select()
      .from(leads)
      .where(eq(leads.sessionId, sessionId))
      .limit(1);

    return records[0] || null;
  }

  async listLeads(limit = 100): Promise<Lead[]> {
    return await this.db
      .select()
      .from(leads)
      .orderBy(desc(leads.updatedAt))
      .limit(limit);
  }

  // HITL TICKETS
  async createHitlTicket(ticket: {
    sessionId: string;
    reason: string;
    requirementSummary: string;
    ticketCode?: string;
  }): Promise<HitlTicket> {
    const id = "tick_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const code = ticket.ticketCode || `TICK-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();

    const existingLead = await this.getLeadBySessionId(ticket.sessionId);
    let summary = ticket.requirementSummary;
    if (
      existingLead?.contactChannel &&
      !existingLead.contactChannel.startsWith("sess_") &&
      existingLead.contactChannel !== "session_default" &&
      !summary.includes(existingLead.contactChannel)
    ) {
      summary += `\nContacto del cliente: ${existingLead.contactChannel}`;
    }

    const [created] = await this.db
      .insert(hitlTickets)
      .values({
        id,
        ticketCode: code,
        sessionId: ticket.sessionId,
        reason: ticket.reason,
        requirementSummary: summary,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  async getHitlTicketByCode(ticketCode: string): Promise<HitlTicket | null> {
    const records = await this.db
      .select()
      .from(hitlTickets)
      .where(eq(hitlTickets.ticketCode, ticketCode))
      .limit(1);

    return records[0] || null;
  }

  async listHitlTickets(sessionId?: string, limit = 50): Promise<HitlTicket[]> {
    if (sessionId) {
      return await this.db
        .select()
        .from(hitlTickets)
        .where(eq(hitlTickets.sessionId, sessionId))
        .orderBy(desc(hitlTickets.createdAt))
        .limit(limit);
    }
    return await this.db
      .select()
      .from(hitlTickets)
      .orderBy(desc(hitlTickets.createdAt))
      .limit(limit);
  }

  async updateHitlTicket(
    ticketCode: string,
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED",
    notes?: string
  ): Promise<HitlTicket | null> {
    const now = new Date();
    const updateData: { status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED"; updatedAt: Date; operatorNotes?: string } = {
      status,
      updatedAt: now,
    };
    if (notes) {
      updateData.operatorNotes = notes;
    }

    const [updated] = await this.db
      .update(hitlTickets)
      .set(updateData)
      .where(eq(hitlTickets.ticketCode, ticketCode))
      .returning();

    return updated || null;
  }

  // FEEDBACK
  async saveFeedback(feedback: {
    sessionId: string;
    messageId?: string;
    isPositive: boolean;
    rating?: number;
    comment?: string;
  }): Promise<UserFeedback> {
    const id = "fb_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date();

    const [created] = await this.db
      .insert(userFeedbacks)
      .values({
        id,
        sessionId: feedback.sessionId,
        messageId: feedback.messageId || null,
        isPositive: feedback.isPositive,
        rating: feedback.rating || null,
        comment: feedback.comment || null,
        createdAt: now,
      })
      .returning();

    return created;
  }

  async listFeedback(limit = 100): Promise<UserFeedback[]> {
    return await this.db
      .select()
      .from(userFeedbacks)
      .orderBy(desc(userFeedbacks.createdAt))
      .limit(limit);
  }

  // TRACES / TELEMETRY
  async saveTrace(trace: {
    traceId: string;
    sessionId: string;
    modelName: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolsCalled?: unknown;
    guardrailsResult?: unknown;
  }): Promise<ExecutionTrace> {
    const id = "tr_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date();

    const [created] = await this.db
      .insert(executionTraces)
      .values({
        id,
        traceId: trace.traceId,
        sessionId: trace.sessionId,
        modelName: trace.modelName,
        latencyMs: trace.latencyMs,
        inputTokens: trace.inputTokens,
        outputTokens: trace.outputTokens,
        totalTokens: trace.totalTokens,
        toolsCalled: trace.toolsCalled ?? null,
        guardrailsResult: trace.guardrailsResult ?? null,
        createdAt: now,
      })
      .returning();

    return created;
  }

  async listTraces(sessionId?: string, limit = 50): Promise<ExecutionTrace[]> {
    if (sessionId) {
      return await this.db
        .select()
        .from(executionTraces)
        .where(eq(executionTraces.sessionId, sessionId))
        .orderBy(desc(executionTraces.createdAt))
        .limit(limit);
    }
    return await this.db
      .select()
      .from(executionTraces)
      .orderBy(desc(executionTraces.createdAt))
      .limit(limit);
  }
}

export const repository = new Repository();
