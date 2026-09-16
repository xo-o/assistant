CREATE TABLE "chat_messages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"title" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "execution_traces" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"trace_id" varchar(64) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"model_name" varchar(64) NOT NULL,
	"latency_ms" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"tools_called" jsonb,
	"guardrails_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitl_tickets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"ticket_code" varchar(32) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"reason" varchar(64) NOT NULL,
	"requirement_summary" text NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"operator_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hitl_tickets_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"name" varchar(128),
	"contact_channel" varchar(128),
	"vehicle_type_interest" varchar(64),
	"primary_use" varchar(255),
	"stage" varchar(32) DEFAULT 'DESCUBRIMIENTO' NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "user_feedbacks" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"message_id" varchar(64),
	"is_positive" boolean NOT NULL,
	"rating" integer,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitl_tickets" ADD CONSTRAINT "hitl_tickets_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedbacks" ADD CONSTRAINT "user_feedbacks_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_session_id" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created_at" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_traces_session_id" ON "execution_traces" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_traces_trace_id" ON "execution_traces" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_hitl_session_id" ON "hitl_tickets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_hitl_ticket_code" ON "hitl_tickets" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "idx_leads_session_id" ON "leads" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_feedbacks_session_id" ON "user_feedbacks" USING btree ("session_id");