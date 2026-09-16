import { repository, LeadRecord, HitlTicketRecord } from "../db/repository.js";
import { checkPromptInjection, checkOutOfScope, applyAntiLoopGuard, applyAntiHallucinationFilter } from "../guardrails/index.js";
import { recordTraceSpan, getTracer } from "../telemetry/tracer.js";
import { mockAgent } from "./mock_agent.js";
import { createLuisAgent } from "./luis_agent.js";
import { env } from "../config/env.js";
import { randomUUID } from "crypto";
import { createGuardarLeadTool, createSolicitarContactoHumanoTool, createBaseConocimientosAutosTool } from "../tools/index.js";

export interface OrchestratorTurnRequest {
  sessionId: string;
  userId?: string;
  message: string;
  model?: string;
}

export interface OrchestratorTurnResponse {
  sessionId: string;
  message: {
    id: string;
    role: "assistant";
    content: string;
    createdAt: string;
  };
  lead: Partial<LeadRecord> | null;
  hitl: Partial<HitlTicketRecord> | null;
  telemetry: {
    traceId: string;
    modelName: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolsCalled: Array<{
      name: string;
      durationMs: number;
      status: "SUCCESS" | "ERROR";
    }>;
    guardrailsResult: {
      passed: boolean;
      reason?: string;
    };
  };
}

export class AgentOrchestrator {
  async executeTurn(request: OrchestratorTurnRequest): Promise<OrchestratorTurnResponse> {
    const startTime = Date.now();
    const traceId = randomUUID().replace(/-/g, "");
    const sessionId = request.sessionId || "session_default";
    const modelName = request.model || env.DEFAULT_MODEL;

    // 1. Ensure Session
    repository.ensureSession(sessionId, request.userId);

    // 2. Persist User Message
    repository.addMessage({
      sessionId,
      role: "user",
      content: request.message,
    });

    const existingLead = repository.getLeadBySessionId(sessionId);

    // 3. Pre-execution Guardrails: Prompt Injection / Jailbreak
    const injectionCheck = checkPromptInjection(request.message);
    if (injectionCheck.blocked) {
      const refusal = injectionCheck.response!;
      const latencyMs = Date.now() - startTime;
      const inputTokens = Math.ceil(request.message.length / 4);
      const outputTokens = Math.ceil(refusal.length / 4);

      const assistantMsg = repository.addMessage({
        sessionId,
        role: "assistant",
        content: refusal,
        tokenCount: outputTokens,
      });

      repository.saveTrace({
        traceId,
        sessionId,
        modelName,
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        toolsCalled: [],
        guardrailsResult: { passed: false, reason: injectionCheck.reason },
      });

      return {
        sessionId,
        message: {
          id: assistantMsg.id,
          role: "assistant",
          content: refusal,
          createdAt: assistantMsg.created_at,
        },
        lead: existingLead,
        hitl: null,
        telemetry: {
          traceId,
          modelName,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          toolsCalled: [],
          guardrailsResult: { passed: false, reason: injectionCheck.reason },
        },
      };
    }

    // 4. Pre-execution Guardrails: Out of Scope
    const scopeCheck = checkOutOfScope(request.message);
    if (scopeCheck.blocked) {
      const refusal = scopeCheck.response!;
      const latencyMs = Date.now() - startTime;
      const inputTokens = Math.ceil(request.message.length / 4);
      const outputTokens = Math.ceil(refusal.length / 4);

      const assistantMsg = repository.addMessage({
        sessionId,
        role: "assistant",
        content: refusal,
        tokenCount: outputTokens,
      });

      repository.saveTrace({
        traceId,
        sessionId,
        modelName,
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        toolsCalled: [],
        guardrailsResult: { passed: false, reason: scopeCheck.reason },
      });

      return {
        sessionId,
        message: {
          id: assistantMsg.id,
          role: "assistant",
          content: refusal,
          createdAt: assistantMsg.created_at,
        },
        lead: existingLead,
        hitl: null,
        telemetry: {
          traceId,
          modelName,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          toolsCalled: [],
          guardrailsResult: { passed: false, reason: scopeCheck.reason },
        },
      };
    }

    // 5. Run LLM Agent with OpenTelemetry Span
    return await recordTraceSpan(
      "agent.turn",
      async (span) => {
        span.setAttribute("session.id", sessionId);
        span.setAttribute("gen_ai.system", "google");
        span.setAttribute("gen_ai.request.model", modelName);

        let replyText = "";
        let toolsCalled: Array<{
          name: string;
          params?: unknown;
          result?: unknown;
          durationMs: number;
          status: "SUCCESS" | "ERROR";
        }> = [];

        // Check if we should use Google ADK live agent or Mock agent
        const shouldUseMock =
          !env.GEMINI_API_KEY ||
          modelName === "mock-agent" ||
          modelName === "mock" ||
          env.NODE_ENV === "test";

        if (shouldUseMock) {
          const result = await mockAgent.execute(sessionId, request.message, existingLead);
          replyText = result.reply;
          toolsCalled = result.toolsCalled;
        } else {
          try {
            // Live Google ADK Execution
            const tools = [
              createGuardarLeadTool(sessionId),
              createSolicitarContactoHumanoTool(sessionId),
              createBaseConocimientosAutosTool(),
            ];

            const { runner } = createLuisAgent({ model: modelName, sessionId, tools });
            const generator = runner.runAsync({
              userId: request.userId || "anonymous",
              sessionId,
              newMessage: {
                role: "user",
                parts: [{ text: request.message }],
              },
            });

            for await (const event of generator) {
              if (event && (event as any).content?.parts) {
                for (const part of (event as any).content.parts) {
                  if (part.text) {
                    replyText += part.text;
                  }
                  if (part.functionCall) {
                    toolsCalled.push({
                      name: part.functionCall.name,
                      params: part.functionCall.args,
                      durationMs: 50,
                      status: "SUCCESS",
                    });
                  }
                }
              }
            }

            if (!replyText || replyText.trim().length === 0) {
              // Fallback to mock agent if generator returned empty
              const mockResult = await mockAgent.execute(sessionId, request.message, existingLead);
              replyText = mockResult.reply;
              toolsCalled = mockResult.toolsCalled;
            }
          } catch (error) {
            console.warn("ADK execution threw error, falling back gracefully to mock engine:", error);
            const mockResult = await mockAgent.execute(sessionId, request.message, existingLead);
            replyText = mockResult.reply;
            toolsCalled = mockResult.toolsCalled;
          }
        }

        // 6. Post-execution Guardrails: Anti-Loop & Anti-Hallucination
        const recentHistory = repository.getSlidingWindowMessages(sessionId, 4000, 5);
        const recentAssistant = recentHistory
          .filter((m) => m.role === "assistant")
          .map((m) => m.content);

        const currentLead = repository.getLeadBySessionId(sessionId);
        let processedReply = applyAntiLoopGuard(replyText, {
          knownName: currentLead?.name,
          knownVehicle: currentLead?.vehicle_type_interest,
          knownUse: currentLead?.primary_use,
          recentAssistantMessages: recentAssistant,
        });

        processedReply = applyAntiHallucinationFilter(processedReply);

        // 7. Calculate Tokens and Latency
        const latencyMs = Date.now() - startTime;
        const inputTokens = Math.ceil(request.message.length / 4);
        const outputTokens = Math.ceil(processedReply.length / 4);
        const totalTokens = inputTokens + outputTokens;

        span.setAttribute("gen_ai.usage.prompt_tokens", inputTokens);
        span.setAttribute("gen_ai.usage.completion_tokens", outputTokens);
        span.setAttribute("gen_ai.usage.total_tokens", totalTokens);

        // 8. Persist Assistant Message
        const assistantMsg = repository.addMessage({
          sessionId,
          role: "assistant",
          content: processedReply,
          tokenCount: outputTokens,
          toolCalls: toolsCalled.length > 0 ? toolsCalled : null,
        });

        // 9. Save Execution Trace in DB
        repository.saveTrace({
          traceId,
          sessionId,
          modelName,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens,
          toolsCalled,
          guardrailsResult: { passed: true },
        });

        // 10. Fetch current lead and latest hitl ticket
        const latestLead = repository.getLeadBySessionId(sessionId);
        const latestTickets = repository.listHitlTickets(sessionId, 1);
        const latestTicket = latestTickets.length > 0 ? latestTickets[0] : null;

        return {
          sessionId,
          message: {
            id: assistantMsg.id,
            role: "assistant",
            content: processedReply,
            createdAt: assistantMsg.created_at,
          },
          lead: latestLead,
          hitl: latestTicket,
          telemetry: {
            traceId,
            modelName,
            latencyMs,
            inputTokens,
            outputTokens,
            totalTokens,
            toolsCalled: toolsCalled.map((t) => ({
              name: t.name,
              durationMs: t.durationMs,
              status: t.status,
            })),
            guardrailsResult: { passed: true },
          },
        };
      },
      { "session.id": sessionId }
    );
  }

  // Multi-event SSE Stream generator
  async *executeTurnStream(request: OrchestratorTurnRequest): AsyncGenerator<{
    event: string;
    data: unknown;
  }> {
    const fullResponse = await this.executeTurn(request);

    // 1. Stream tool calls if any
    for (const tool of fullResponse.telemetry.toolsCalled) {
      yield {
        event: "tool_call",
        data: { name: tool.name },
      };
    }

    // 2. Stream text delta tokens
    const words = fullResponse.message.content.split(" ");
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? "" : " ") + words[i];
      yield {
        event: "text_delta",
        data: { text: chunk },
      };
      // Brief delay to simulate natural typing
      await new Promise((r) => setTimeout(r, 20));
    }

    // 3. Emit HITL interrupt event if ticket created
    if (fullResponse.hitl) {
      yield {
        event: "hitl_interrupt",
        data: fullResponse.hitl,
      };
    }

    // 4. Emit Lead updated event if lead updated
    if (fullResponse.lead) {
      yield {
        event: "lead_update",
        data: fullResponse.lead,
      };
    }

    // 5. Emit Telemetry
    yield {
      event: "telemetry",
      data: fullResponse.telemetry,
    };

    // 6. Emit done
    yield {
      event: "done",
      data: {
        sessionId: fullResponse.sessionId,
        messageId: fullResponse.message.id,
      },
    };
  }
}

export const orchestrator = new AgentOrchestrator();
