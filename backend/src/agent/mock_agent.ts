import { repository } from "../db/repository.js";
import { Lead } from "../db/schema.js";
import { ragEngine } from "../knowledge/rag_engine.js";

export interface MockAgentExecutionResult {
  reply: string;
  leadSaved?: unknown;
  hitlTicket?: unknown;
  ragDocs?: unknown;
  toolsCalled: Array<{
    name: string;
    params?: unknown;
    result?: unknown;
    durationMs: number;
    status: "SUCCESS" | "ERROR";
  }>;
}

export class MockAgent {
  async execute(sessionId: string, message: string, existingLead: Lead | null): Promise<MockAgentExecutionResult> {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const toolsCalled: MockAgentExecutionResult["toolsCalled"] = [];
    let leadSaved: unknown = undefined;
    let hitlTicket: unknown = undefined;
    let ragDocs: unknown = undefined;
    let reply = "";

    // 1. Check for Test Drive / Formal Quotation request -> HITL Tool
    if (lower.includes("test drive") || lower.includes("manejo") || lower.includes("cotizacion") || lower.includes("cotización") || lower.includes("comprar ya") || lower.includes("asesor humano")) {
      const start = Date.now();
      const motivo = lower.includes("test drive") ? "TEST_DRIVE" : lower.includes("cotizacion") ? "COTIZACION_FORMAL" : "ESCALADO_HUMANO";
      const resumen = `El cliente solicita ${motivo === "TEST_DRIVE" ? "agendar un test drive" : "una cotización formal"} para el vehículo de su interés.`;
      
      const ticket = await repository.createHitlTicket({
        sessionId,
        reason: motivo,
        requirementSummary: resumen,
      });

      hitlTicket = {
        status: "ticket_created",
        ticket_id: ticket.ticketCode,
        session_id: sessionId,
        motivo,
        resumen,
      };

      toolsCalled.push({
        name: "solicitar_contacto_humano",
        params: { session_id: sessionId, motivo, resumen_requerimiento: resumen },
        result: hitlTicket,
        durationMs: Date.now() - start,
        status: "SUCCESS",
      });

      if (motivo === "TEST_DRIVE") {
        reply = `¡Excelente iniciativa! He generado tu solicitud formal de test drive con el código ${ticket.ticketCode}. Un asesor humano se comunicará contigo para coordinar el día y horario que te quede más cómodo 😊`;
      } else {
        reply = `¡Con gusto! He derivado tu requerimiento para una cotización formal detallada (código ${ticket.ticketCode}). Un especialista del concesionario te enviará los números exactos a la brevedad 😊`;
      }

      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 2. Check for Technical / Comparison questions -> RAG Tool (Prioritize questions before slot extraction)
    const isTechnicalQuery =
      lower.includes("diferencia") ||
      lower.includes("cuál es") ||
      lower.includes("cual es") ||
      lower.includes("qué es") ||
      lower.includes("que es") ||
      lower.includes("cómo funciona") ||
      lower.includes("mantenimiento") ||
      lower.includes("torque") ||
      lower.includes("traccion") ||
      lower.includes("tracción");

    if (isTechnicalQuery) {
      const start = Date.now();
      const docs = await ragEngine.search(message, 2);

      ragDocs = {
        status: docs.length > 0 ? "success" : "not_found",
        results_count: docs.length,
        documents: docs,
      };

      toolsCalled.push({
        name: "base_conocimientos_autos",
        params: { query: message, top_k: 2 },
        result: ragDocs,
        durationMs: Date.now() - start,
        status: "SUCCESS",
      });

      if (docs.length > 0) {
        // Synthesize in 2-3 concise sentences
        const best = docs[0];
        reply = `${best.content} ¿Te gustaría profundizar en algún detalle específico de este modelo o equipamiento?`;
      } else {
        reply = "Por el momento no cuento con el detalle técnico exacto sobre ese modelo, pero puedo anotarlo para que un especialista te dé el dato preciso 😊";
      }

      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 3. Check for Name and vehicle preference -> Guardar Lead Tool
    const nameMatch = trimmed.match(/(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)/i);
    const vehicleMatch = trimmed.match(/\b(suv|sed[aá]n|pickup|camioneta|hatchback|crossover|h[ií]brido|el[eé]ctrico)\b/i);
    const useMatch = trimmed.match(/\b(familia|viajes|ciudad|trabajo|carga|diario)\b/i);

    if (nameMatch || vehicleMatch || useMatch) {
      const start = Date.now();
      const name = nameMatch ? nameMatch[1] : (existingLead?.name || undefined);
      const vehicle = vehicleMatch ? vehicleMatch[1].toUpperCase() : (existingLead?.vehicleTypeInterest || undefined);
      const use = useMatch ? useMatch[1] : (existingLead?.primaryUse || undefined);
      const stage = (vehicle && use) ? "INTERES_CONCRETO" : "DESCUBRIMIENTO";

      const updated = await repository.saveOrUpdateLead({
        sessionId,
        name,
        vehicleTypeInterest: vehicle,
        primaryUse: use,
        stage,
      });

      leadSaved = {
        status: "success",
        lead: {
          session_id: sessionId,
          nombre: updated.name || "",
          tipo_vehiculo: updated.vehicleTypeInterest || "",
          uso: updated.primaryUse || "",
          etapa: updated.stage,
        },
      };

      toolsCalled.push({
        name: "guardar_lead",
        params: { session_id: sessionId, nombre: name, tipo_vehiculo_interes: vehicle, uso_principal: use, etapa: stage },
        result: leadSaved,
        durationMs: Date.now() - start,
        status: "SUCCESS",
      });

      if (name && vehicle) {
        reply = `¡Hola ${name}! Un ${vehicle} es una excelente opción. ¿Qué tipo de recorridos sueles hacer con más frecuencia: más ciudad o viajes en carretera?`;
      } else if (name) {
        reply = `¡Hola ${name}! 👋 Cuéntame, ¿qué tipo de auto estás buscando o qué uso principal le darías en tu día a día?`;
      } else {
        reply = `¡Excelente elección el ${vehicle}! ¿Para cuántos pasajeros o qué tipo de uso lo necesitas principalmente?`;
      }

      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 4. Browsing / "solo estoy mirando"
    if (lower.includes("mirando") || lower.includes("viendo") || lower.includes("curioseando")) {
      reply = "¡Perfecto! Aquí estoy si en cualquier momento quieres comparar modelos, revisar consumos o resolver dudas 😊";
      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 5. Default Greeting / Discovery
    if (existingLead && existingLead.name) {
      reply = `¡Hola ${existingLead.name}! 👋 ¿En qué te puedo asesorar hoy con tu próximo auto?`;
    } else {
      reply = "Hola 👋 Soy Luis, tu asesor automotriz. ¿Con quién tengo el gusto?";
    }

    return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
  }
}

export const mockAgent = new MockAgent();
