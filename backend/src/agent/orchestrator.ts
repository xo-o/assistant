import { repository } from "../db/repository.js";
import { Lead, HitlTicket } from "../db/schema.js";
import { checkPromptInjection, checkOutOfScope, applyAntiLoopGuard, applyAntiHallucinationFilter } from "../guardrails/index.js";
import { recordTraceSpan } from "../telemetry/tracer.js";
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
  lead: Partial<Lead> | null;
  hitl: Partial<HitlTicket> | null;
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
    const session = await repository.ensureSession(sessionId, request.userId);
    if (!session.title || session.title === "Nueva Consulta") {
      const generatedTitle = request.message.slice(0, 42).trim();
      await repository.touchSession(sessionId, generatedTitle);
    }

    // 2. Persist User Message
    const userMsgRecord = await repository.addMessage({
      sessionId,
      role: "user",
      content: request.message,
    });

    const existingLead = await repository.getLeadBySessionId(sessionId);
    const formattedExistingLead = existingLead
      ? {
          ...existingLead,
          vehicle_type_interest: existingLead.vehicleTypeInterest,
          primary_use: existingLead.primaryUse,
          contact_channel: existingLead.contactChannel,
          updated_at: existingLead.updatedAt,
          created_at: existingLead.createdAt,
        }
      : null;

    // 3. Pre-execution Guardrails: Prompt Injection / Jailbreak
    const injectionCheck = checkPromptInjection(request.message);
    if (injectionCheck.blocked) {
      const refusal = injectionCheck.response!;
      const latencyMs = Date.now() - startTime;
      const inputTokens = Math.ceil(request.message.length / 4);
      const outputTokens = Math.ceil(refusal.length / 4);

      const assistantMsg = await repository.addMessage({
        sessionId,
        role: "assistant",
        content: refusal,
        tokenCount: outputTokens,
      });

      await repository.saveTrace({
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
          createdAt: assistantMsg.createdAt.toISOString(),
        },
        lead: formattedExistingLead,
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

      const assistantMsg = await repository.addMessage({
        sessionId,
        role: "assistant",
        content: refusal,
        tokenCount: outputTokens,
      });

      await repository.saveTrace({
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
          createdAt: assistantMsg.createdAt.toISOString(),
        },
        lead: formattedExistingLead,
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
          modelName === "mock";

        if (shouldUseMock) {
          const result = await mockAgent.execute(sessionId, request.message, existingLead);
          replyText = result.reply;
          toolsCalled = result.toolsCalled;
        } else {
          try {
            // Live Google ADK Execution with selected Gemini model
            const tools = [
              createGuardarLeadTool(sessionId),
              createSolicitarContactoHumanoTool(sessionId),
              createBaseConocimientosAutosTool(),
            ];

            const { runner } = createLuisAgent({
              model: modelName,
              sessionId,
              tools,
              knownLead: existingLead,
            });
            const userId = request.userId || "anonymous";
            const appName = "automotive-advisor";

            // Ensure session exists in ADK SessionService before running
            const existingSession = await runner.sessionService
              .getSession({ appName, userId, sessionId })
              .catch(() => null);
            if (!existingSession) {
              await runner.sessionService.createSession({ appName, userId, sessionId });
            }

            // Hydrate historical turns from database into runner's session storage
            const storageSession = (runner.sessionService as any).sessions?.[appName]?.[userId]?.[sessionId];
            if (storageSession && storageSession.events.length === 0) {
              const allMessages = await repository.getSlidingWindowMessages(
                sessionId,
                env.MAX_HISTORY_TOKENS,
                env.MAX_TURNS_HISTORY
              );
              // Filter out the message that was just persisted in step 2
              const previousHistory = allMessages.filter((m) => m.id !== userMsgRecord.id);
              for (const m of previousHistory) {
                storageSession.events.push({
                  id: `hist_${m.id}`,
                  author: m.role === "user" ? "user" : "AGENTE_LUIS",
                  content: {
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.content }],
                  },
                  actions: { stateDelta: {}, artifactDelta: {}, requestedAuthConfigs: {}, requestedToolConfirmations: {} },
                  longRunningToolIds: [],
                  timestamp: m.createdAt.getTime(),
                });
              }
            }

            const generator = runner.runAsync({
              userId,
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
        const recentHistory = await repository.getSlidingWindowMessages(sessionId, 4000, 5);
        const recentAssistant = recentHistory
          .filter((m) => m.role === "assistant")
          .map((m) => m.content);

        const currentLead = await repository.getLeadBySessionId(sessionId);
        let processedReply = applyAntiLoopGuard(replyText, {
          knownName: currentLead?.name,
          knownVehicle: currentLead?.vehicleTypeInterest,
          knownUse: currentLead?.primaryUse,
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
        const assistantMsg = await repository.addMessage({
          sessionId,
          role: "assistant",
          content: processedReply,
          tokenCount: outputTokens,
          toolCalls: toolsCalled.length > 0 ? toolsCalled : null,
        });

        // 9. Save Execution Trace in DB
        await repository.saveTrace({
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
        const latestLead = await repository.getLeadBySessionId(sessionId);
        const formattedLead = latestLead
          ? {
              ...latestLead,
              vehicle_type_interest: latestLead.vehicleTypeInterest,
              primary_use: latestLead.primaryUse,
              contact_channel: latestLead.contactChannel,
              updated_at: latestLead.updatedAt,
              created_at: latestLead.createdAt,
            }
          : null;
        const latestTickets = await repository.listHitlTickets(sessionId, 1);
        const latestTicket = latestTickets.length > 0 ? latestTickets[0] : null;
        const formattedTicket = latestTicket
          ? {
              ...latestTicket,
              ticket_code: latestTicket.ticketCode,
              ticket_id: latestTicket.ticketCode,
              requirement_summary: latestTicket.requirementSummary,
              resumen: latestTicket.requirementSummary,
              operator_notes: latestTicket.operatorNotes,
              created_at: latestTicket.createdAt,
              updated_at: latestTicket.updatedAt,
            }
          : null;

        return {
          sessionId,
          message: {
            id: assistantMsg.id,
            role: "assistant",
            content: processedReply,
            createdAt: assistantMsg.createdAt.toISOString(),
          },
          lead: formattedLead,
          hitl: formattedTicket,
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
