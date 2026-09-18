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

    // 1. Check for Test Drive / Formal Quotation request / Pandero Promoter -> HITL Tool
    const isEscalationRequest =
      lower.includes("test drive") ||
      lower.includes("manejo") ||
      lower.includes("cotizacion") ||
      lower.includes("cotización") ||
      lower.includes("comprar ya") ||
      lower.includes("asesor humano") ||
      lower.includes("promotor") ||
      lower.includes("inscribirme") ||
      lower.includes("afiliarme") ||
      lower.includes("simular mi cuota") ||
      lower.includes("simulacion formal");

    const phoneInMsg = trimmed.match(/(?:\+?51\s*)?(?:9\d{8}|[1-9]\d{6,7})/);
    const emailInMsg = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const msgContact = phoneInMsg ? phoneInMsg[0] : emailInMsg ? emailInMsg[0] : null;
    const existingContact =
      existingLead?.contactChannel &&
      !existingLead.contactChannel.startsWith("sess_") &&
      existingLead.contactChannel !== "session_default"
        ? existingLead.contactChannel
        : null;
    const effectiveContact = msgContact || existingContact;

    if (isEscalationRequest) {
      const start = Date.now();
      const motivo = lower.includes("test drive")
        ? "TEST_DRIVE"
        : lower.includes("promotor") || lower.includes("afiliar") || lower.includes("inscribir")
        ? "ASESORIA_PANDERO"
        : lower.includes("cotizacion") || lower.includes("cotización") || lower.includes("simula")
        ? "COTIZACION_FORMAL"
        : "ESCALADO_HUMANO";

      // If user hasn't provided contact yet, ask for it FIRST before generating ticket
      if (!effectiveContact) {
        const updatedLead = await repository.saveOrUpdateLead({
          sessionId,
          stage: "INTERES_CONCRETO",
        });

        leadSaved = {
          status: "success",
          lead: {
            session_id: sessionId,
            nombre: updatedLead.name || "",
            etapa: "INTERES_CONCRETO",
          },
        };

        toolsCalled.push({
          name: "guardar_lead",
          params: { session_id: sessionId, etapa: "INTERES_CONCRETO" },
          result: leadSaved,
          durationMs: Date.now() - start,
          status: "SUCCESS",
        });

        const clientGreeting = existingLead?.name ? `¡Excelente elección, ${existingLead.name}! ` : "¡Excelente decisión! ";
        if (motivo === "TEST_DRIVE") {
          reply = `${clientGreeting}Con mucho gusto coordinamos tu prueba de manejo. Para que un asesor pueda comunicarse contigo y agendar la fecha, hora y sede más conveniente, ¿a qué número de WhatsApp o teléfono prefieres que te contactemos? 😊`;
        } else if (motivo === "ASESORIA_PANDERO") {
          reply = `${clientGreeting}Con mucho gusto coordinamos la asesoría con un promotor de Pandero. Para enviarte la simulación formal de cuotas y requisitos, ¿a qué número de WhatsApp o correo electrónico te gustaría que te contactemos? 😊`;
        } else {
          reply = `${clientGreeting}Con gusto te preparamos la cotización formal detallada. Para remitirte los números exactos y versiones disponibles, ¿a qué número de WhatsApp o correo prefieres que te escribamos? 😊`;
        }

        return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
      }

      // If contact IS known or provided in this message, generate the ticket WITH contact
      if (msgContact) {
        await repository.saveOrUpdateLead({
          sessionId,
          contactChannel: msgContact,
          stage: "INTERES_CONCRETO",
        });
      }

      const resumen = `El cliente solicita ${
        motivo === "TEST_DRIVE"
          ? "agendar un test drive"
          : motivo === "ASESORIA_PANDERO"
          ? "asesoría directa con un promotor de Pandero para afiliación"
          : "una cotización formal y plan de financiamiento"
      } para el vehículo de su interés.\nContacto del cliente: ${effectiveContact}`;

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
        params: {
          session_id: sessionId,
          motivo,
          resumen_requerimiento: resumen,
          contacto_usuario: effectiveContact,
        },
        result: hitlTicket,
        durationMs: Date.now() - start,
        status: "SUCCESS",
      });

      const clientName = existingLead?.name ? `, ${existingLead.name}` : "";
      if (motivo === "TEST_DRIVE") {
        reply = `¡Excelente iniciativa${clientName}! He generado tu solicitud formal de test drive con el código ${ticket.ticketCode} y tu contacto registrado (${effectiveContact}). Un asesor humano se comunicará contigo para coordinar el día y la sede 😊`;
      } else if (motivo === "ASESORIA_PANDERO") {
        reply = `¡Con mucho gusto${clientName}! He registrado tu solicitud para asesoría con un promotor de Pandero (código ${ticket.ticketCode}) con tu contacto (${effectiveContact}). Te enviarán la simulación formal a la brevedad 😊`;
      } else {
        reply = `¡Con gusto${clientName}! He derivado tu requerimiento para una cotización formal detallada (código ${ticket.ticketCode}) con tu contacto (${effectiveContact}). Un especialista te enviará los números exactos a la brevedad 😊`;
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
      lower.includes("como funciona") ||
      lower.includes("mantenimiento") ||
      lower.includes("torque") ||
      lower.includes("traccion") ||
      lower.includes("tracción") ||
      lower.includes("modelos") ||
      lower.includes("marcas") ||
      lower.includes("financiamiento") ||
      lower.includes("fondo colectivo") ||
      lower.includes("fondos colectivos") ||
      lower.includes("pandero") ||
      lower.includes("sorteo") ||
      lower.includes("remate") ||
      lower.includes("asamblea") ||
      lower.includes("certificado") ||
      lower.includes("administracion") ||
      lower.includes("administración") ||
      lower.includes("requisito") ||
      lower.includes("independiente") ||
      lower.includes("sin boleta") ||
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
      } else if (lower.includes("sorteo") || lower.includes("remate") || lower.includes("asamblea")) {
        reply = `En el sistema de Fondos Colectivos (como Pandero) cuentas con dos formas para adjudicarte tu auto nuevo en la asamblea mensual:

| Modalidad | Cómo Funciona | Costo Adicional | Ideal Para |
| :--- | :--- | :--- | :--- |
| **Sorteo** | Participas con tu número de asociado si estás al día | Cero costo adicional | Quien prefiere tentar la suerte y ahorrar mes a mes |
| **Remate** | Propones adelantar un número de cuotas voluntarias | Se descuenta de tu saldo final | Quien desea asegurar la entrega rápida del vehículo |

¿Te interesaría planificar tu adjudicación mediante sorteo o prefieres contemplar la opción de remate anticipado?`;
      } else if (
        (lower.includes("pandero") && (lower.includes("certificado") || lower.includes("cuota") || lower.includes("precio") || lower.includes("monto") || lower.includes("funciona"))) ||
        (lower.includes("certificado") && lower.includes("cuota"))
      ) {
        reply = `Pandero Auto funciona mediante certificados vehiculares desde **US$ 11,827 hasta más de US$ 50,000** a un plazo estándar de **60 meses**:

| Rango de Certificado | Cuota Ref. Mensual (USD) | Cuota Ref. Mensual (Soles) | Modelos Representativos |
| :--- | :--- | :--- | :--- |
| **US$ 11,800 - 14,000** | Desde $229 - $259/mes | Desde S/ 778 - S/ 880 | Suzuki Celerio, Toyota Agya, Kia Soluto |
| **US$ 15,000 - 19,000** | Desde $289 - $389/mes | Desde S/ 982 - S/ 1,322 | Suzuki Swift, Toyota Yaris, VW Virtus |
| **US$ 20,000 - 26,000** | Desde $409 - $509/mes | Desde S/ 1,390 - S/ 1,730 | VW T-Cross, Kia Seltos, Toyota Rush |
| **US$ 27,000 - 35,000** | Desde $569 - $699/mes | Desde S/ 1,934 - S/ 2,376 | Mazda CX-5, Kia Sportage, Toyota RAV4 |

No cobra intereses bancarios (TEA), sino una cuota de administración plana. ¿En qué rango de cuota mensual te sentirías más cómodo?`;
      } else if (lower.includes("requisito") || lower.includes("independiente") || lower.includes("sin boleta")) {
        reply = `Una de las principales ventajas de los Fondos Colectivos (como Pandero) es su **alta flexibilidad crediticia**:

- **Requisitos de ingreso:** Solo necesitas tu documento de identidad (DNI o Carné de Extranjería), abonar la cuota de inscripción (~3% a 4% + IGV) y tu primera cuota mensual.
- **Perfil:** No exige historial crediticio bancario riguroso ni boletas de pago formales al inicio, por lo que es la opción predilecta para **emprendedores, independientes y comerciantes**.
- **Al adjudicarte:** Se sustenta la capacidad de pago o un aval solidario para la entrega de la unidad.

¿Trabajas de forma independiente o dependiente en planilla?`;
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
    const useMatch = trimmed.match(/\b(familia|viajes|ciudad|trabajo|carga|diario|autopista|carretera)\b/i);

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

      if (lower.includes("autopista") || lower.includes("carretera")) {
        reply = "Para tramos de autopista y carretera, un sedán ofrece excelente estabilidad y gran ahorro de combustible, mientras que una SUV compacta te da mejor visibilidad y altura. Entre estas dos alternativas, ¿cuál te llama más la atención?";
      } else if (name && vehicle) {
        reply = `¡Hola ${name}! Un ${vehicle} es una excelente opción. ¿Qué tipo de recorridos sueles hacer con más frecuencia: más ciudad o viajes en carretera?`;
      } else if (name) {
        reply = `¡Hola ${name}! 👋 Cuéntame, ¿qué tipo de auto estás buscando o qué uso principal le darías en tu día a día?`;
      } else {
        reply = `¡Excelente elección el ${vehicle}! ¿Para cuántos pasajeros o qué tipo de uso lo necesitas principalmente?`;
      }

      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 3c. Check for contact information (phone, WhatsApp, email)
    const phoneMatch = trimmed.match(/(?:\+?51\s*)?(?:9\d{8}|[1-9]\d{6,7})/);
    const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (phoneMatch || emailMatch) {
      const contactChannel = phoneMatch ? phoneMatch[0] : emailMatch![0];
      const start = Date.now();
      const updated = await repository.saveOrUpdateLead({
        sessionId,
        contactChannel,
      });

      leadSaved = {
        status: "success",
        lead: {
          session_id: sessionId,
          nombre: updated.name || "",
          canal_contacto: updated.contactChannel || "",
          tipo_vehiculo: updated.vehicleTypeInterest || "",
          uso: updated.primaryUse || "",
          etapa: updated.stage,
        },
      };

      toolsCalled.push({
        name: "guardar_lead",
        params: { session_id: sessionId, canal_contacto: contactChannel },
        result: leadSaved,
        durationMs: Date.now() - start,
        status: "SUCCESS",
      });

      // Generate or update HITL ticket with the contact channel
      const existingTickets = await repository.listHitlTickets(sessionId, 1);
      let ticketCode = "";
      if (existingTickets.length > 0) {
        ticketCode = existingTickets[0].ticketCode;
        hitlTicket = {
          status: "ticket_updated",
          ticket_id: ticketCode,
          session_id: sessionId,
          resumen: existingTickets[0].requirementSummary,
        };
      } else {
        const vehicle = updated.vehicleTypeInterest || "Vehículo en exploración";
        const resumen = `Solicitud de atención para ${updated.name || "el cliente"}.\nVehículo de interés: ${vehicle}\nContacto: ${contactChannel}`;
        const newTicket = await repository.createHitlTicket({
          sessionId,
          reason: "TEST_DRIVE",
          requirementSummary: resumen,
        });
        ticketCode = newTicket.ticketCode;
        hitlTicket = {
          status: "ticket_created",
          ticket_id: ticketCode,
          session_id: sessionId,
          motivo: "TEST_DRIVE",
          resumen,
        };
        toolsCalled.push({
          name: "solicitar_contacto_humano",
          params: { session_id: sessionId, motivo: "TEST_DRIVE", resumen_requerimiento: resumen, contacto_usuario: contactChannel },
          result: hitlTicket,
          durationMs: Date.now() - start,
          status: "SUCCESS",
        });
      }

      const clientName = existingLead?.name ? `, ${existingLead.name}` : "";
      reply = `¡Muchas gracias${clientName}! He registrado tu contacto (${contactChannel}) y generado tu solicitud formal (${ticketCode}). Un asesor humano se comunicará contigo a la brevedad para coordinar todos los detalles 😊`;
      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 4. Browsing / "solo estoy mirando"
    if (lower.includes("mirando") || lower.includes("viendo") || lower.includes("curioseando")) {
      reply = "¡Perfecto! Aquí estoy si en cualquier momento quieres comparar modelos, revisar consumos o resolver dudas 😊";
      return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
    }

    // 5. Default Greeting / Ongoing Discovery
    if (existingLead && existingLead.name) {
      reply = `Entendido, ${existingLead.name}. Para orientarte con la mejor alternativa, ¿tienes algún rango de presupuesto o cuota mensual estimada?`;
    } else {
      reply = "Hola 👋 Soy Luis, tu asesor automotriz. ¿Con quién tengo el gusto?";
    }

    return { reply, leadSaved, hitlTicket, ragDocs, toolsCalled };
  }
}

export const mockAgent = new MockAgent();
