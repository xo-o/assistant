import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// 1. Chat Sessions
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }),
    title: varchar("title", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb("metadata"),
  }
);

// 2. Chat Messages
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").default(0).notNull(),
    toolCalls: jsonb("tool_calls"),
    toolResults: jsonb("tool_results"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_session_id").on(table.sessionId),
    index("idx_messages_created_at").on(table.createdAt),
  ]
);

// 3. Leads
export const leads = pgTable(
  "leads",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .unique()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }),
    contactChannel: varchar("contact_channel", { length: 128 }),
    vehicleTypeInterest: varchar("vehicle_type_interest", { length: 64 }),
    primaryUse: varchar("primary_use", { length: 255 }),
    stage: varchar("stage", { length: 32 }).default("DESCUBRIMIENTO").notNull(),
    status: varchar("status", { length: 32 }).default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_leads_session_id").on(table.sessionId),
  ]
);

// 4. HITL Tickets
export const hitlTickets = pgTable(
  "hitl_tickets",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    ticketCode: varchar("ticket_code", { length: 32 }).notNull().unique(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 64 }).notNull(),
    requirementSummary: text("requirement_summary").notNull(),
    status: varchar("status", { length: 32 }).default("PENDING").notNull(),
    operatorNotes: text("operator_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_hitl_session_id").on(table.sessionId),
    index("idx_hitl_ticket_code").on(table.ticketCode),
  ]
);

// 5. User Feedbacks
export const userFeedbacks = pgTable(
  "user_feedbacks",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    messageId: varchar("message_id", { length: 64 }),
    isPositive: boolean("is_positive").notNull(),
    rating: integer("rating"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_feedbacks_session_id").on(table.sessionId),
  ]
);

// 6. Execution Traces
export const executionTraces = pgTable(
  "execution_traces",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    traceId: varchar("trace_id", { length: 64 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    modelName: varchar("model_name", { length: 64 }).notNull(),
    latencyMs: integer("latency_ms").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    toolsCalled: jsonb("tools_called"),
    guardrailsResult: jsonb("guardrails_result"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_traces_session_id").on(table.sessionId),
    index("idx_traces_trace_id").on(table.traceId),
  ]
);

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type HitlTicket = typeof hitlTickets.$inferSelect;
export type NewHitlTicket = typeof hitlTickets.$inferInsert;
export type UserFeedback = typeof userFeedbacks.$inferSelect;
export type NewUserFeedback = typeof userFeedbacks.$inferInsert;
export type ExecutionTrace = typeof executionTraces.$inferSelect;
export type NewExecutionTrace = typeof executionTraces.$inferInsert;
