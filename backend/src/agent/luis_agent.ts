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
}

export function createLuisAgent(options: CreateLuisAgentOptions = {}) {
  const model = options.model || "gemini-1.5-pro";
  const tools = options.tools || [
    createGuardarLeadTool(options.sessionId),
    createSolicitarContactoHumanoTool(options.sessionId),
    createBaseConocimientosAutosTool(),
  ];

  const agent = new LlmAgent({
    name: "AGENTE_LUIS",
    model,
    instruction: SYSTEM_PROMPT_LUIS,
    tools,
  });

  const runner = new InMemoryRunner({
    agent,
    appName: "automotive-advisor",
  });

  return { agent, runner };
}
