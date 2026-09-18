import { Langfuse } from "langfuse";
import { env } from "../config/env.js";

let langfuseClient: Langfuse | null = null;

export function getLangfuseClient(): Langfuse | null {
  if (langfuseClient) {
    return langfuseClient;
  }

  if (env.LANGFUSE_SECRET_KEY && env.LANGFUSE_PUBLIC_KEY) {
    try {
      langfuseClient = new Langfuse({
        secretKey: env.LANGFUSE_SECRET_KEY,
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        baseUrl: env.LANGFUSE_BASE_URL,
      });
      console.log("✓ Langfuse LLM Observability initialized:", env.LANGFUSE_BASE_URL);
    } catch (err) {
      console.warn("⚠ Failed to initialize Langfuse client:", err);
      langfuseClient = null;
    }
  }

  return langfuseClient;
}

export interface RecordLangfuseTurnParams {
  traceId: string;
  sessionId: string;
  userId?: string;
  modelName: string;
  userMessage: string;
  assistantResponse: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  startTime: Date;
  endTime: Date;
  toolsCalled: Array<{
    name: string;
    params?: unknown;
    result?: unknown;
    durationMs: number;
    status: "SUCCESS" | "ERROR";
  }>;
  guardrailsResult: {
    passed: boolean;
    reason?: string;
  };
}

export async function recordLangfuseTurn(
  params: RecordLangfuseTurnParams
): Promise<{ traceUrl?: string }> {
  const client = getLangfuseClient();
  if (!client) {
    return {};
  }

  try {
    const trace = client.trace({
      id: params.traceId,
      name: "automotive_advisor_turn",
      sessionId: params.sessionId,
      userId: params.userId || "anonymous",
      input: { message: params.userMessage },
      output: { reply: params.assistantResponse },
      metadata: {
        model: params.modelName,
        latencyMs: params.latencyMs,
      },
      tags: ["automotive-advisor", params.modelName, params.guardrailsResult.passed ? "guardrails_pass" : "guardrails_blocked"],
    });

    // 1. Guardrail evaluation span
    const guardrailSpan = trace.span({
      name: "guardrails.evaluation",
      startTime: params.startTime,
      endTime: new Date(params.startTime.getTime() + 15),
      input: { message: params.userMessage },
      output: params.guardrailsResult,
      statusMessage: params.guardrailsResult.passed ? "PASSED" : "BLOCKED",
    });
    guardrailSpan.end();

    // 2. LLM Generation
    const generationStartTime = new Date(params.startTime.getTime() + 20);
    const generation = trace.generation({
      name: "gemini_generation",
      model: params.modelName,
      startTime: generationStartTime,
      endTime: params.endTime,
      input: [
        { role: "user", content: params.userMessage }
      ],
      output: params.assistantResponse,
      usage: {
        promptTokens: params.inputTokens,
        completionTokens: params.outputTokens,
        totalTokens: params.totalTokens,
      },
      metadata: {
        guardrailsPassed: params.guardrailsResult.passed,
      },
    });
    generation.end();

    // 3. Tool execution spans
    let toolOffset = 25;
    for (const tool of params.toolsCalled) {
      const toolStart = new Date(params.startTime.getTime() + toolOffset);
      const toolEnd = new Date(toolStart.getTime() + (tool.durationMs || 50));
      toolOffset += (tool.durationMs || 50) + 10;

      const toolSpan = trace.span({
        name: `tool.${tool.name}`,
        startTime: toolStart,
        endTime: toolEnd,
        input: tool.params || {},
        output: tool.result || {},
        statusMessage: tool.status,
      });
      toolSpan.end();
    }

    // Flush asynchronously in background
    client.flushAsync().catch((err) => {
      console.warn("Langfuse flush warning:", err);
    });

    return {
      traceUrl: trace.getTraceUrl(),
    };
  } catch (err) {
    console.warn("⚠ Error recording trace in Langfuse:", err);
    return {};
  }
}

export async function recordLangfuseScore(params: {
  traceId: string;
  name: string;
  value: number;
  comment?: string;
}): Promise<void> {
  const client = getLangfuseClient();
  if (!client) return;

  try {
    client.score({
      traceId: params.traceId,
      name: params.name,
      value: params.value,
      comment: params.comment,
    });
    await client.flushAsync().catch(() => {});
  } catch (err) {
    console.warn("⚠ Error recording score in Langfuse:", err);
  }
}
