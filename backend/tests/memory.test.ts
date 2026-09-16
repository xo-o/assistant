import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { repository } from "../src/db/repository.js";
import { closeDatabase } from "../src/db/database.js";

describe("Memory & Session Isolation Suite", () => {
  const sessionA = "sess_laura_" + Math.random().toString(36).slice(2, 9);
  const sessionB = "sess_roberto_" + Math.random().toString(36).slice(2, 9);

  before(async () => {
    await repository.ensureSession(sessionA);
    await repository.ensureSession(sessionB);
  });

  after(async () => {
    await closeDatabase();
  });

  it("should keep concurrent sessions strictly isolated without cross-contamination", async () => {
    // Record Laura's preference in Session A
    await repository.saveOrUpdateLead({
      sessionId: sessionA,
      name: "Laura",
      vehicleTypeInterest: "Hatchback",
      primaryUse: "Ciudad y bajo consumo",
    });
    await repository.addMessage({
      sessionId: sessionA,
      role: "user",
      content: "Hola, soy Laura y busco un auto compacto para la ciudad.",
    });

    // Record Roberto's preference in Session B
    await repository.saveOrUpdateLead({
      sessionId: sessionB,
      name: "Roberto",
      vehicleTypeInterest: "Pickup 4x4",
      primaryUse: "Trabajo pesado en campo",
    });
    await repository.addMessage({
      sessionId: sessionB,
      role: "user",
      content: "Hola, soy Roberto y necesito una camioneta de trabajo rudo.",
    });

    // Verify Session A
    const leadA = await repository.getLeadBySessionId(sessionA);
    const messagesA = await repository.getSessionMessages(sessionA);
    assert.ok(leadA);
    assert.strictEqual(leadA.name, "Laura");
    assert.strictEqual(leadA.vehicleTypeInterest, "Hatchback");
    assert.strictEqual(messagesA.length, 1);
    assert.strictEqual(messagesA[0].content.includes("Laura"), true);
    assert.strictEqual(messagesA[0].content.includes("Roberto"), false);

    // Verify Session B
    const leadB = await repository.getLeadBySessionId(sessionB);
    const messagesB = await repository.getSessionMessages(sessionB);
    assert.ok(leadB);
    assert.strictEqual(leadB.name, "Roberto");
    assert.strictEqual(leadB.vehicleTypeInterest, "Pickup 4x4");
    assert.strictEqual(messagesB.length, 1);
    assert.strictEqual(messagesB[0].content.includes("Roberto"), true);
    assert.strictEqual(messagesB[0].content.includes("Laura"), false);
  });

  it("should truncate message history within configured token budget using sliding window", async () => {
    const budgetSession = "sess_budget_" + Math.random().toString(36).slice(2, 9);
    await repository.ensureSession(budgetSession);

    // Insert 10 messages with 100 tokens each
    for (let i = 1; i <= 10; i++) {
      await repository.addMessage({
        sessionId: budgetSession,
        role: i % 2 === 1 ? "user" : "assistant",
        content: `Turn ${i} with substantial conversational content to consume tokens`,
        tokenCount: 100,
      });
    }

    // Request window with budget of 350 tokens (should return only the 3 most recent messages)
    const windowed = await repository.getSlidingWindowMessages(budgetSession, 350, 10);
    assert.strictEqual(windowed.length, 3);
    // Messages must be returned in chronological order
    assert.ok(windowed[0].content.includes("Turn 8"));
    assert.ok(windowed[1].content.includes("Turn 9"));
    assert.ok(windowed[2].content.includes("Turn 10"));
  });
});
