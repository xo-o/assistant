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

    // 2. Check for Technical / Comparison / Financing / Model questions -> RAG Tool
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
      lower.includes("tracción") ||
      lower.includes("modelos") ||
      lower.includes("financiamiento") ||
      lower.includes("fondo colectivo") ||
      lower.includes("crédito") ||
      lower.includes("credito") ||
      lower.includes("recomiendas") ||
      lower.includes("cuota");

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

      if (lower.includes("suv") && lower.includes("sed")) {
        reply = `Las **SUV** y los **Sedanes** responden a necesidades de conducción distintas en el mercado:

| Carrocería | Despeje del Suelo | Consumo / Aerodinámica | Espacio y Habitáculo | Uso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **SUV** | Elevado (~18 a 21 cm) | Moderado | Mayor altura y maletera versátil | Viajes familiares y caminos irregulares |
| **Sedán** | Bajo (~14 a 16 cm) | Óptimo (menor arrastre) | Maletera cerrada e independiente | Ciudad, autopista y trayectos diarios |

¿Qué tipo de recorridos sueles realizar con mayor frecuencia: más ciudad para el día a día o viajes familiares por carretera?`;
      } else if (lower.includes("hibrido") || lower.includes("híbrido") || lower.includes("phev") || lower.includes("hev")) {
        reply = `La diferencia fundamental entre un híbrido convencional y uno enchufable radica en la batería y la autonomía eléctrica:

| Tecnología | Recarga de Batería | Autonomía 100% Eléctrica | Rendimiento Est. | Enchufe / Cables |
| :--- | :--- | :--- | :--- | :--- |
| **Híbrido Convencional (HEV)** | Automática al frenar/desacelerar | 1 a 3 km (apoyo en arranque) | ~60 a 70 km/galón | No requiere cables |
| **Híbrido Enchufable (PHEV)** | Red eléctrica o tomacorriente | 40 a 80 km puramente eléctrico | Modo dual ultra-eficiente | Cable / Wallbox |

¿Cuentas con punto de carga en tu cochera o prefieres la practicidad de un híbrido que se recargue solo al conducir?`;
      } else if (lower.includes("financiamiento") || lower.includes("fondo") || lower.includes("credito") || lower.includes("crédito") || lower.includes("banco")) {
        reply = `En Perú dispones de tres alternativas principales para adquirir tu auto:

| Modalidad | Cuota Inicial | Intereses Financieros | Entrega del Auto | Perfil Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **Crédito Vehicular** | 10% a 20% | Intereses bancarios (TEA) | Inmediata tras aprobación | Quien necesita el vehículo hoy mismo |
| **Fondos Colectivos** | Mínima o sin inicial | Cuota administrativa plana | Sorteo o remate mensual | Quien planifica su compra y busca cuotas bajas |
| **Compra al Contado** | 100% | Cero costos financieros | Inmediata | Quien cuenta con liquidez disponible |

¿Te gustaría que evaluemos cuál de estas opciones se adapta mejor a tu flujo mensual estimado?`;
      } else if (lower.includes("suv") && (lower.includes("recomiendas") || lower.includes("modelos") || lower.includes("peru") || lower.includes("cuota"))) {
        reply = `En el mercado peruano existen opciones muy destacadas para familias según tu rango de cuota:

| Modelo | Segmento | Cuota Ref. | Motor / Potencia | Característica Destacada |
| :--- | :--- | :--- | :--- | :--- |
| **Toyota RAV4** | SUV Mediana | Desde $699 / S/ 2,376 | 2.0L o Híbrido (HEV) | Gran reventa y confiabilidad |
| **KIA Sportage NQ5** | SUV Mediana | Desde $629 / S/ 2,138 | 2.0L o 1.6L Turbo | Diseño vanguardista y confort |
| **Toyota Rush** | SUV 3 Filas | Desde $459 / S/ 1,560 | 1.5L Dual VVT-i | 7 asientos para toda la familia |
| **Volkswagen T-Cross** | SUV Compacta | Desde $459 / S/ 1,560 | 1.0 TSI Turbo | 5 estrellas Latin NCAP |

¿Buscas una SUV de 5 plazas o te interesaría evaluar alternativas de 3 filas para 7 pasajeros?`;
      } else if (docs.length > 0) {
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
