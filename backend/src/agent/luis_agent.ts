import { LlmAgent, InMemoryRunner, BaseTool } from "@google/adk";
import { SYSTEM_PROMPT_LUIS } from "./prompts.js";
import {
  createGuardarLeadTool,
  createSolicitarContactoHumanoTool,
  createBaseConocimientosAutosTool,
} from "../tools/index.js";

export interface CreateLuisAgentOptions {
  model?: string;
  sessionId?: string;
  tools?: BaseTool[];
  knownLead?: {
    name?: string | null;
    contactChannel?: string | null;
    vehicleTypeInterest?: string | null;
    primaryUse?: string | null;
  } | null;
}

export function createLuisAgent(options: CreateLuisAgentOptions = {}) {
  const model = options.model || "gemini-3.8-flash";
  const tools = options.tools || [
    createGuardarLeadTool(options.sessionId),
    createSolicitarContactoHumanoTool(options.sessionId),
    createBaseConocimientosAutosTool(),
  ];

  let instruction = SYSTEM_PROMPT_LUIS;
  if (options.knownLead) {
    const parts: string[] = [];
    if (options.knownLead.name) parts.push(`- Nombre del cliente: ${options.knownLead.name}`);
    if (options.knownLead.vehicleTypeInterest) parts.push(`- Tipo de vehículo de interés: ${options.knownLead.vehicleTypeInterest}`);
    if (options.knownLead.primaryUse) parts.push(`- Uso principal: ${options.knownLead.primaryUse}`);

    const hasRealContact =
      options.knownLead.contactChannel &&
      !options.knownLead.contactChannel.startsWith("sess_") &&
      options.knownLead.contactChannel !== "session_default";

    if (hasRealContact) {
      parts.push(`- Canal de contacto ya registrado: ${options.knownLead.contactChannel} (Listo para derivación HITL directa con solicitar_contacto_humano)`);
    } else {
      parts.push(`- Canal de contacto: NO REGISTRADO AÚN (IMPORTANTE: Si el cliente pide test drive o cotización formal, NO invoques solicitar_contacto_humano todavía: pídele amablemente su número de WhatsApp o correo electrónico primero)`);
    }

    if (parts.length > 0) {
      instruction += `\n\n# CONTEXTO DEL CLIENTE EN ESTA SESIÓN:\n${parts.join("\n")}\n- Ya conoces estos datos. NO preguntes lo que ya sabes ni vuelvas a presentarte. Continúa la conversación con naturalidad respondiendo a su último mensaje.`;
    }
  }

  const agent = new LlmAgent({
    name: "AGENTE_LUIS",
    model,
    instruction,
    tools,
  });

  const runner = new InMemoryRunner({
    agent,
    appName: "automotive-advisor",
  });

  return { agent, runner };
}
