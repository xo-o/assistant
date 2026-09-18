import { getDatabase, closeDatabase } from "./database.js";
import {
  chatSessions,
  chatMessages,
  leads,
  hitlTickets,
  userFeedbacks,
  executionTraces,
} from "./schema.js";

export async function seedDatabase(): Promise<void> {
  const db = getDatabase();
  console.log("🌱 Starting database seeding with realistic Pandero & Automotive data...");

  const now = new Date();
  const timeOffset = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60 * 1000);

  // Clean existing demo records if present
  const demoSessionIds = [
    "sess_demo_carlos_suv",
    "sess_demo_maria_pandero",
    "sess_demo_jorge_pickup",
  ];

  for (const sid of demoSessionIds) {
    try {
      await db.delete(chatMessages).where(undefined as any);
    } catch {
      // ignore
    }
  }

  // =========================================================================
  // SCENARIO 1: Carlos Mendoza - Family SUV & Hybrid Technology (Pending HITL)
  // =========================================================================
  const sess1Id = "sess_demo_carlos_suv";
  console.log(`- Seeding Session 1: ${sess1Id} (Carlos Mendoza)...`);

  await db
    .insert(chatSessions)
    .values({
      id: sess1Id,
      userId: "user_carlos_01",
      title: "Carlos Mendoza - SUV Familiar Toyota RAV4",
      createdAt: timeOffset(120),
      updatedAt: timeOffset(105),
      metadata: { city: "Lima", channel: "web", device: "desktop" },
    })
    .onConflictDoNothing();

  await db
    .insert(chatMessages)
    .values([
      {
        id: "msg_carlos_01",
        sessionId: sess1Id,
        role: "user",
        content: "Hola, buenas tardes",
        tokenCount: 6,
        createdAt: timeOffset(120),
      },
      {
        id: "msg_carlos_02",
        sessionId: sess1Id,
        role: "assistant",
        content: "Hola 👋 Soy Luis, tu asesor automotriz. ¿Con quién tengo el gusto?",
        tokenCount: 18,
        createdAt: timeOffset(119),
      },
      {
        id: "msg_carlos_03",
        sessionId: sess1Id,
        role: "user",
        content: "Hola Luis, me llamo Carlos y estoy buscando una SUV cómoda para viajar con mi familia.",
        tokenCount: 21,
        createdAt: timeOffset(117),
      },
      {
        id: "msg_carlos_04",
        sessionId: sess1Id,
        role: "assistant",
        content: "¡Hola Carlos! Una SUV es una excelente opción. ¿Qué tipo de recorridos sueles hacer con más frecuencia: más ciudad o viajes en carretera?",
        tokenCount: 28,
        toolCalls: [
          {
            name: "guardar_lead",
            params: {
              session_id: sess1Id,
              nombre: "Carlos Mendoza",
              tipo_vehiculo_interes: "SUV",
              uso_principal: "Viajes familiares y ciudad",
              etapa: "INTERES_CONCRETO",
            },
          },
        ],
        toolResults: [
          {
            status: "success",
            lead: {
              session_id: sess1Id,
              nombre: "Carlos Mendoza",
              tipo_vehiculo: "SUV",
              uso: "Viajes familiares y ciudad",
              etapa: "INTERES_CONCRETO",
            },
          },
        ],
        createdAt: timeOffset(116),
      },
      {
        id: "msg_carlos_05",
        sessionId: sess1Id,
        role: "user",
        content: "¿Cuál es la diferencia entre un auto híbrido convencional y un híbrido enchufable PHEV?",
        tokenCount: 19,
        createdAt: timeOffset(112),
      },
      {
        id: "msg_carlos_06",
        sessionId: sess1Id,
        role: "assistant",
        content: "La diferencia fundamental entre un híbrido convencional y uno enchufable radica en la batería y la autonomía eléctrica:\n\n| Tecnología | Recarga de Batería | Autonomía 100% Eléctrica | Rendimiento Est. | Enchufe / Cables |\n| :--- | :--- | :--- | :--- | :--- |\n| **Híbrido Convencional (HEV)** | Automática al frenar/desacelerar | 1 a 3 km (apoyo en arranque) | ~60 a 70 km/galón | No requiere cables |\n| **Híbrido Enchufable (PHEV)** | Red eléctrica o tomacorriente | 40 a 80 km puramente eléctrico | Modo dual ultra-eficiente | Cable / Wallbox |\n\n¿Cuentas con punto de carga en tu cochera o prefieres la practicidad de un híbrido que se recargue solo al conducir?",
        tokenCount: 135,
        toolCalls: [
          {
            name: "base_conocimientos_autos",
            params: { query: "diferencia hibrido hev phev", top_k: 2 },
          },
        ],
        createdAt: timeOffset(111),
      },
      {
        id: "msg_carlos_07",
        sessionId: sess1Id,
        role: "user",
        content: "Me parece genial la explicación, ¿cómo puedo agendar un test drive para este sábado en la sede de San Isidro?",
        tokenCount: 26,
        createdAt: timeOffset(106),
      },
      {
        id: "msg_carlos_08",
        sessionId: sess1Id,
        role: "assistant",
        content: "¡Excelente iniciativa Carlos! He generado tu solicitud formal de test drive con el código TICK-48192. Un asesor humano se comunicará contigo para coordinar el día y horario que te quede más cómodo 😊",
        tokenCount: 38,
        toolCalls: [
          {
            name: "solicitar_contacto_humano",
            params: {
              session_id: sess1Id,
              motivo: "TEST_DRIVE",
              resumen_requerimiento: "Test drive presencial sábado 10:30 am para Toyota RAV4 HEV en sede San Isidro.",
            },
          },
        ],
        toolResults: [
          {
            status: "ticket_created",
            ticket_id: "TICK-48192",
            session_id: sess1Id,
            motivo: "TEST_DRIVE",
          },
        ],
        createdAt: timeOffset(105),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(leads)
    .values({
      id: "lead_carlos_01",
      sessionId: sess1Id,
      name: "Carlos Mendoza",
      contactChannel: "+51 987 654 321",
      vehicleTypeInterest: "SUV Toyota RAV4 Híbrida",
      primaryUse: "Viajes familiares y trayectos diarios",
      stage: "INTERES_CONCRETO",
      status: "QUALIFIED",
      createdAt: timeOffset(116),
      updatedAt: timeOffset(105),
    })
    .onConflictDoNothing();

  await db
    .insert(hitlTickets)
    .values({
      id: "tick_carlos_01",
      ticketCode: "TICK-48192",
      sessionId: sess1Id,
      reason: "TEST_DRIVE",
      requirementSummary: "Test drive presencial sábado 10:30 am para Toyota RAV4 HEV en sede San Isidro.",
      status: "PENDING",
      createdAt: timeOffset(105),
      updatedAt: timeOffset(105),
    })
    .onConflictDoNothing();

  await db
    .insert(userFeedbacks)
    .values({
      id: "fb_carlos_01",
      sessionId: sess1Id,
      messageId: "msg_carlos_06",
      isPositive: true,
      rating: 5,
      comment: "Explicación muy clara de la diferencia entre HEV y PHEV sin tecnicismos difíciles.",
      createdAt: timeOffset(110),
    })
    .onConflictDoNothing();

  await db
    .insert(executionTraces)
    .values([
      {
        id: "tr_carlos_01",
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        sessionId: sess1Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 412,
        inputTokens: 14,
        outputTokens: 22,
        totalTokens: 36,
        toolsCalled: [],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(119),
      },
      {
        id: "tr_carlos_02",
        traceId: "5c839f2847b34da6a3ce929d0e0e8912",
        sessionId: sess1Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 785,
        inputTokens: 38,
        outputTokens: 35,
        totalTokens: 73,
        toolsCalled: [{ name: "guardar_lead", durationMs: 45, status: "SUCCESS" }],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(116),
      },
      {
        id: "tr_carlos_03",
        traceId: "6d912f4577b34da6a3ce929d0e0e1147",
        sessionId: sess1Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 840,
        inputTokens: 52,
        outputTokens: 142,
        totalTokens: 194,
        toolsCalled: [{ name: "base_conocimientos_autos", durationMs: 62, status: "SUCCESS" }],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(111),
      },
      {
        id: "tr_carlos_04",
        traceId: "7e148a3577b34da6a3ce929d0e0e9982",
        sessionId: sess1Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 625,
        inputTokens: 48,
        outputTokens: 46,
        totalTokens: 94,
        toolsCalled: [{ name: "solicitar_contacto_humano", durationMs: 51, status: "SUCCESS" }],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(105),
      },
    ])
    .onConflictDoNothing();

  // =========================================================================
  // SCENARIO 2: María Elena Torres - Independent Entrepreneur & Pandero Funds
  // =========================================================================
  const sess2Id = "sess_demo_maria_pandero";
  console.log(`- Seeding Session 2: ${sess2Id} (María Elena Torres - Pandero Auto)...`);

  await db
    .insert(chatSessions)
    .values({
      id: sess2Id,
      userId: "user_maria_02",
      title: "María Torres - Emprendedora / Fondos Colectivos",
      createdAt: timeOffset(90),
      updatedAt: timeOffset(75),
      metadata: { city: "Lima / Gamarra", channel: "web", device: "mobile" },
    })
    .onConflictDoNothing();

  await db
    .insert(chatMessages)
    .values([
      {
        id: "msg_maria_01",
        sessionId: sess2Id,
        role: "user",
        content: "Hola Luis, soy María Elena Torres. Tengo una tienda de confecciones y no tengo boletas de pago ni historial bancario. ¿Puedo calificar a un auto nuevo?",
        tokenCount: 34,
        createdAt: timeOffset(90),
      },
      {
        id: "msg_maria_02",
        sessionId: sess2Id,
        role: "assistant",
        content: "¡Hola María! 👋 Por supuesto que sí. En el sistema de Fondos Colectivos de **Pandero Auto**, los requisitos de ingreso son mucho más accesibles que en un banco:\n\n- **Requisitos de ingreso:** Solo necesitas tu documento de identidad (DNI o Carné de Extranjería), abonar la cuota de inscripción y tu primera cuota mensual.\n- **Flexibilidad:** No exige historial crediticio bancario previo ni boletas de pago formales al afiliarte, siendo la alternativa ideal para **independientes y comerciantes**.\n- **Al adjudicarte:** Se evalúa tu capacidad de ingresos o presentas un aval para la entrega del vehículo.\n\n¿Cuánto presupuesto mensual tienes estimado para la cuota de tu auto?",
        tokenCount: 148,
        toolCalls: [
          {
            name: "guardar_lead",
            params: {
              session_id: sess2Id,
              nombre: "María Elena Torres",
              tipo_vehiculo_interes: "Sedán Económico",
              uso_principal: "Traslado diario y mercadería ligera",
              etapa: "INTERES_CONCRETO",
            },
          },
          {
            name: "base_conocimientos_autos",
            params: { query: "pandero requisitos independientes sin boleta", top_k: 2 },
          },
        ],
        createdAt: timeOffset(89),
      },
      {
        id: "msg_maria_03",
        sessionId: sess2Id,
        role: "user",
        content: "Puedo pagar unos 300 dólares al mes. ¿Cuánto sería para un auto de unos 15,000 dólares y cómo es eso del sorteo o remate?",
        tokenCount: 31,
        createdAt: timeOffset(82),
      },
      {
        id: "msg_maria_04",
        sessionId: sess2Id,
        role: "assistant",
        content: "Con ese presupuesto estás en un rango excelente María. En Pandero cuentas con certificados de **US$ 15,000** a 60 meses con cuotas referenciales desde **$289 USD al mes** (aprox. S/ 982 soles), ideales para modelos como el **Suzuki Swift**, **Toyota Yaris** o **Kia Soluto**.\n\nEn cada asamblea mensual tienes dos opciones de adjudicación:\n\n| Modalidad | Cómo Funciona | Costo Adicional | Ideal Para |\n| :--- | :--- | :--- | :--- |\n| **Sorteo** | Participas con tu número de asociado si estás al día | Cero costo adicional | Quien ahorra mes a mes con paciencia |\n| **Remate** | Propones adelantar cuotas voluntarias | Se descuenta de tu saldo final | Quien desea asegurar la entrega rápida del auto |\n\n¿Te gustaría que un promotor oficial de Pandero te ayude a simular el plan formalmente?",
        tokenCount: 175,
        toolCalls: [
          {
            name: "base_conocimientos_autos",
            params: { query: "pandero sorteo remate certificados cuotas 15000", top_k: 2 },
          },
        ],
        createdAt: timeOffset(81),
      },
      {
        id: "msg_maria_05",
        sessionId: sess2Id,
        role: "user",
        content: "Sí por favor, quiero que un promotor de Pandero me contacte para afiliarme.",
        tokenCount: 18,
        createdAt: timeOffset(76),
      },
      {
        id: "msg_maria_06",
        sessionId: sess2Id,
        role: "assistant",
        content: "¡Con mucho gusto María! He registrado tu requerimiento para asesoría directa con un promotor de Pandero (código TICK-10293). Un especialista se comunicará contigo para simular tus cuotas y orientarte en el proceso de afiliación digital sin trámites engorrosos 😊",
        tokenCount: 47,
        toolCalls: [
          {
            name: "solicitar_contacto_humano",
            params: {
              session_id: sess2Id,
              motivo: "ASESORIA_PANDERO",
              resumen_requerimiento: "Comerciante independiente interesada en Certificado Pandero $15,000 a 60 meses ($289/mes). Solicita promotor para afiliación digital.",
            },
          },
        ],
        createdAt: timeOffset(75),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(leads)
    .values({
      id: "lead_maria_02",
      sessionId: sess2Id,
      name: "María Elena Torres",
      contactChannel: "+51 991 223 344",
      vehicleTypeInterest: "Sedán Económico (Suzuki Swift / Toyota Yaris)",
      primaryUse: "Traslado diario y mercadería textil ligera",
      stage: "INTERES_CONCRETO",
      status: "IN_PROGRESS",
      createdAt: timeOffset(89),
      updatedAt: timeOffset(75),
    })
    .onConflictDoNothing();

  await db
    .insert(hitlTickets)
    .values({
      id: "tick_maria_02",
      ticketCode: "TICK-10293",
      sessionId: sess2Id,
      reason: "ASESORIA_PANDERO",
      requirementSummary: "Comerciante independiente interesada en Certificado Pandero $15,000 a 60 meses ($289/mes). Solicita promotor para afiliación digital.",
      status: "IN_PROGRESS",
      operatorNotes: "Promotora Patricia se comunicó vía WhatsApp. Cliente enviará copia de DNI para afiliación de grupo.",
      createdAt: timeOffset(75),
      updatedAt: timeOffset(60),
    })
    .onConflictDoNothing();

  await db
    .insert(userFeedbacks)
    .values({
      id: "fb_maria_02",
      sessionId: sess2Id,
      messageId: "msg_maria_04",
      isPositive: true,
      rating: 5,
      comment: "Me dio mucha tranquilidad saber que como independiente puedo acceder a un auto 0 km sin bancos.",
      createdAt: timeOffset(78),
    })
    .onConflictDoNothing();

  await db
    .insert(executionTraces)
    .values([
      {
        id: "tr_maria_01",
        traceId: "8f219b4577b34da6a3ce929d0e0e3321",
        sessionId: sess2Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 890,
        inputTokens: 58,
        outputTokens: 154,
        totalTokens: 212,
        toolsCalled: [
          { name: "guardar_lead", durationMs: 42, status: "SUCCESS" },
          { name: "base_conocimientos_autos", durationMs: 58, status: "SUCCESS" },
        ],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(89),
      },
      {
        id: "tr_maria_02",
        traceId: "9a312c5677b34da6a3ce929d0e0e4432",
        sessionId: sess2Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 760,
        inputTokens: 64,
        outputTokens: 182,
        totalTokens: 246,
        toolsCalled: [{ name: "base_conocimientos_autos", durationMs: 54, status: "SUCCESS" }],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(81),
      },
      {
        id: "tr_maria_03",
        traceId: "0b423d6777b34da6a3ce929d0e0e5543",
        sessionId: sess2Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 590,
        inputTokens: 42,
        outputTokens: 52,
        totalTokens: 94,
        toolsCalled: [{ name: "solicitar_contacto_humano", durationMs: 49, status: "SUCCESS" }],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(75),
      },
    ])
    .onConflictDoNothing();

  // =========================================================================
  // SCENARIO 3: Jorge Rivas - Heavy Duty Pickup Hilux (Resolved Ticket)
  // =========================================================================
  const sess3Id = "sess_demo_jorge_pickup";
  console.log(`- Seeding Session 3: ${sess3Id} (Jorge Rivas - Pickup Hilux)...`);

  await db
    .insert(chatSessions)
    .values({
      id: sess3Id,
      userId: "user_jorge_03",
      title: "Jorge Rivas - Pickup Toyota Hilux 4x4",
      createdAt: timeOffset(180),
      updatedAt: timeOffset(160),
      metadata: { city: "Arequipa", channel: "web", device: "desktop" },
    })
    .onConflictDoNothing();

  await db
    .insert(chatMessages)
    .values([
      {
        id: "msg_jorge_01",
        sessionId: sess3Id,
        role: "user",
        content: "Hola, soy Jorge Rivas. Busco una camioneta pickup 4x4 resistente para faena agrícola en Arequipa.",
        tokenCount: 23,
        createdAt: timeOffset(180),
      },
      {
        id: "msg_jorge_02",
        sessionId: sess3Id,
        role: "assistant",
        content: "¡Hola Jorge! Para trabajo agrícola y caminos exigentes, las camionetas utilitarias con chasis reforzado de largueros y tracción 4x4 con reductora son insuperables. En el mercado peruano, la **Toyota Hilux 4x4** (cuota referencial desde $629/mes) y la **Mitsubishi L200** (desde $569/mes) son los referentes de mayor confiabilidad y valor de reventa. ¿Requieres tolva para carga pesada o doble cabina para trasladar personal?",
        tokenCount: 110,
        toolCalls: [
          {
            name: "guardar_lead",
            params: {
              session_id: sess3Id,
              nombre: "Jorge Rivas",
              tipo_vehiculo_interes: "Pickup 4x4",
              uso_principal: "Faena agrícola y carga en trocha",
              etapa: "INTERES_CONCRETO",
            },
          },
          {
            name: "base_conocimientos_autos",
            params: { query: "pickup hilux l200 trabajo 4x4 carga", top_k: 2 },
          },
        ],
        createdAt: timeOffset(179),
      },
      {
        id: "msg_jorge_03",
        sessionId: sess3Id,
        role: "user",
        content: "Doble cabina para la Hilux. Por favor pásame con un asesor comercial para una cotización formal y cierre.",
        tokenCount: 24,
        createdAt: timeOffset(162),
      },
      {
        id: "msg_jorge_04",
        sessionId: sess3Id,
        role: "assistant",
        content: "¡Listo Jorge! He generado tu ticket de derivación asistida TICK-77341. Un asesor comercial especializado en vehículos utilitarios se comunicará contigo para remitir la cotización formal con el equipamiento de doble cabina y programar la entrega en la sede de Arequipa 😊",
        tokenCount: 52,
        toolCalls: [
          {
            name: "solicitar_contacto_humano",
            params: {
              session_id: sess3Id,
              motivo: "COTIZACION_FORMAL",
              resumen_requerimiento: "Cotización formal Toyota Hilux Doble Cabina 4x4 para faena agrícola en Arequipa.",
            },
          },
        ],
        createdAt: timeOffset(160),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(leads)
    .values({
      id: "lead_jorge_03",
      sessionId: sess3Id,
      name: "Jorge Rivas",
      contactChannel: "+51 954 112 233",
      vehicleTypeInterest: "Toyota Hilux Doble Cabina 4x4",
      primaryUse: "Faena agrícola y carga pesada en trocha",
      stage: "INTERES_CONCRETO",
      status: "RESOLVED",
      createdAt: timeOffset(179),
      updatedAt: timeOffset(160),
    })
    .onConflictDoNothing();

  await db
    .insert(hitlTickets)
    .values({
      id: "tick_jorge_03",
      ticketCode: "TICK-77341",
      sessionId: sess3Id,
      reason: "COTIZACION_FORMAL",
      requirementSummary: "Cotización formal Toyota Hilux Doble Cabina 4x4 para faena agrícola en Arequipa.",
      status: "RESOLVED",
      operatorNotes: "Asesor Luis Fernando atendió al cliente en la sede Arequipa. Plan suscrito exitosamente.",
      createdAt: timeOffset(160),
      updatedAt: timeOffset(120),
    })
    .onConflictDoNothing();

  await db
    .insert(userFeedbacks)
    .values({
      id: "fb_jorge_03",
      sessionId: sess3Id,
      messageId: "msg_jorge_02",
      isPositive: true,
      rating: 5,
      comment: "Rápido y directo al grano con los números y la derivación.",
      createdAt: timeOffset(165),
    })
    .onConflictDoNothing();

  await db
    .insert(executionTraces)
    .values([
      {
        id: "tr_jorge_01",
        traceId: "1c534e7877b34da6a3ce929d0e0e6654",
        sessionId: sess3Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 720,
        inputTokens: 45,
        outputTokens: 118,
        totalTokens: 163,
        toolsCalled: [
          { name: "guardar_lead", durationMs: 44, status: "SUCCESS" },
          { name: "base_conocimientos_autos", durationMs: 56, status: "SUCCESS" },
        ],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(179),
      },
      {
        id: "tr_jorge_02",
        traceId: "2d645f8977b34da6a3ce929d0e0e7765",
        sessionId: sess3Id,
        modelName: "gemini-1.5-pro",
        latencyMs: 580,
        inputTokens: 38,
        outputTokens: 56,
        totalTokens: 94,
        toolsCalled: [{ name: "solicitar_contacto_humano", durationMs: 50, status: "SUCCESS" }],
        guardrailsResult: { passed: true },
        createdAt: timeOffset(160),
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Seed completed successfully! 3 realistic sessions, leads, HITL tickets and traces created.");
}

// Execute standalone if called directly
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(async () => {
      await closeDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Error during database seeding:", err);
      await closeDatabase();
      process.exit(1);
    });
}
