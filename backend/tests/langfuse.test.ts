import { describe, it } from "node:test";
import assert from "node:assert";
import { recordLangfuseTurn, recordLangfuseScore, getLangfuseClient } from "../src/telemetry/langfuse.js";
import { orchestrator } from "../src/agent/orchestrator.js";
import { repository } from "../src/db/repository.js";

describe("Langfuse LLM Observability Suite", () => {
  it("should initialize Langfuse client with environment credentials", () => {
    const client = getLangfuseClient();
    assert.ok(client, "Langfuse client should be instantiated");
  });

  it("should record a turn trace and return a valid Langfuse trace URL", async () => {
    const traceId = "lf_test_" + Math.random().toString(36).slice(2, 10);
    const now = new Date();

    const result = await recordLangfuseTurn({
      traceId,
      sessionId: "session_test_lf",
      modelName: "gemini-3.8-flash",
      userMessage: "¿Cuál es la diferencia entre SUV y Sedán?",
      assistantResponse: "Una SUV ofrece mayor despeje del suelo y espacio familiar, mientras que un sedán prioriza confort de marcha y rendimiento de combustible.",
      latencyMs: 340,
      inputTokens: 15,
      outputTokens: 35,
      totalTokens: 50,
      startTime: now,
      endTime: new Date(now.getTime() + 340),
      toolsCalled: [
        {
          name: "base_conocimientos_autos",
          params: { query: "SUV vs Sedan" },
          result: { count: 2 },
          durationMs: 45,
          status: "SUCCESS",
        },
      ],
      guardrailsResult: { passed: true },
    });

    assert.ok(result.traceUrl, "Should return a traceUrl");
    assert.ok(result.traceUrl.includes(traceId), "traceUrl should contain traceId");
    assert.ok(result.traceUrl.startsWith("https://us.cloud.langfuse.com"), "traceUrl should point to Langfuse host");
  });

  it("should record user feedback score linked to trace in Langfuse", async () => {
    const traceId = "lf_score_test_" + Math.random().toString(36).slice(2, 10);

    // Recording score should not throw
    await assert.doesNotReject(async () => {
      await recordLangfuseScore({
        traceId,
        name: "user_feedback",
        value: 1,
        comment: "Excelente explicación técnica",
      });
    });
  });

  it("should return traceUrl in orchestrator turn response", async () => {
    const sessionId = "sess_lf_e2e_" + Math.random().toString(36).slice(2, 9);
    await repository.ensureSession(sessionId);

    const turnRes = await orchestrator.executeTurn({
      sessionId,
      message: "Hola, me llamo Juan y busco un auto",
      model: "mock-agent",
    });

    assert.ok(turnRes.telemetry.traceId);
    assert.ok(turnRes.telemetry.traceUrl, "Turn response must include Langfuse traceUrl");
    assert.ok(turnRes.telemetry.traceUrl.includes(turnRes.telemetry.traceId));
  });
});
