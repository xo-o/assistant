import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { repository } from "../src/db/repository.js";
import {
  createGuardarLeadTool,
  createSolicitarContactoHumanoTool,
  createBaseConocimientosAutosTool,
} from "../src/tools/index.js";
import { closeDatabase } from "../src/db/database.js";

describe("Agent Tools Suite", () => {
  const testSessionId = "test_sess_tools_" + Math.random().toString(36).slice(2, 9);

  before(async () => {
    await repository.ensureSession(testSessionId);
  });

  after(async () => {
    await closeDatabase();
  });

  describe("guardar_lead Tool", () => {
    it("should persist lead data into English database schema and return standard output", async () => {
      const tool = createGuardarLeadTool(testSessionId);
      const result = await tool.execute({
        session_id: testSessionId,
        nombre: "Alejandro Pérez",
        tipo_vehiculo_interes: "SUV Híbrida",
        uso_principal: "Viajes familiares y ciudad",
        etapa: "INTERES_CONCRETO",
      }) as any;

      assert.strictEqual(result.status, "success");
      assert.strictEqual(result.lead.nombre, "Alejandro Pérez");
      assert.strictEqual(result.lead.tipo_vehiculo, "SUV Híbrida");
      assert.strictEqual(result.lead.etapa, "INTERES_CONCRETO");

      // Verify in DB
      const leadFromDb = await repository.getLeadBySessionId(testSessionId);
      assert.ok(leadFromDb);
      assert.strictEqual(leadFromDb.name, "Alejandro Pérez");
      assert.strictEqual(leadFromDb.vehicleTypeInterest, "SUV Híbrida");
      assert.strictEqual(leadFromDb.primaryUse, "Viajes familiares y ciudad");
      assert.strictEqual(leadFromDb.stage, "INTERES_CONCRETO");
    });
  });

  describe("solicitar_contacto_humano Tool (HITL)", () => {
    it("should generate a valid TICK-XXXXX ticket in the hitl_tickets table", async () => {
      const tool = createSolicitarContactoHumanoTool(testSessionId);
      const result = await tool.execute({
        session_id: testSessionId,
        motivo: "TEST_DRIVE",
        resumen_requerimiento: "Cliente solicita test drive para SUV Híbrida este sábado en la mañana.",
      }) as any;

      assert.strictEqual(result.status, "ticket_created");
      assert.match(result.ticket_id, /^TICK-\d{5}$/);
      assert.strictEqual(result.motivo, "TEST_DRIVE");

      // Verify in DB
      const ticketFromDb = await repository.getHitlTicketByCode(result.ticket_id);
      assert.ok(ticketFromDb);
      assert.strictEqual(ticketFromDb.ticketCode, result.ticket_id);
      assert.strictEqual(ticketFromDb.reason, "TEST_DRIVE");
      assert.strictEqual(ticketFromDb.status, "PENDING");
    });
  });

  describe("base_conocimientos_autos Tool (RAG)", () => {
    it("should retrieve relevant documents for SUV vs Sedan comparison", async () => {
      const tool = createBaseConocimientosAutosTool();
      const result = await tool.execute({
        query: "diferencia entre suv y sedan para familia",
        top_k: 2,
      }) as any;

      assert.strictEqual(result.status, "success");
      assert.ok(result.documents.length > 0);
      assert.strictEqual(result.documents[0].category, "carrocerias");
      assert.ok(result.documents[0].content.includes("SUV"));
    });

    it("should retrieve relevant documents for Hybrid powertrains (HEV vs PHEV)", async () => {
      const tool = createBaseConocimientosAutosTool();
      const result = await tool.execute({
        query: "hibrido enchufable phev vs hev convencional",
        top_k: 2,
      }) as any;

      assert.strictEqual(result.status, "success");
      assert.ok(result.documents.length > 0);
      assert.strictEqual(result.documents[0].category, "motorizaciones");
    });
  });
});
