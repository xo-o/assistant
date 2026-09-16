import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { repository } from "../db/repository.js";

export const SolicitarContactoHumanoParamsSchema = z.object({
  session_id: z.string().optional().describe("ID de la sesión actual"),
  motivo: z.string().optional().default("ESCALADO_HUMANO").describe("Motivo de la derivación: TEST_DRIVE, COTIZACION_FORMAL o ESCALADO_HUMANO"),
  resumen_requerimiento: z.string().optional().default("Sin requerimiento especificado").describe("Resumen de las necesidades del cliente y el vehículo solicitado"),
});

export type SolicitarContactoHumanoParams = z.infer<typeof SolicitarContactoHumanoParamsSchema>;

export function createSolicitarContactoHumanoTool(contextSessionId?: string): FunctionTool {
  return new FunctionTool({
    name: "solicitar_contacto_humano",
    description:
      "Genera un ticket de derivación asistida (HITL) hacia un asesor humano cuando el usuario solicita un test drive, requiere una cotización formal o prefiere ser atendido por una persona.",
    parameters: SolicitarContactoHumanoParamsSchema as any,
    execute: async (args: any) => {
      const parsed = SolicitarContactoHumanoParamsSchema.parse(args);
      const sessionId = parsed.session_id || contextSessionId || "session_default";
      const motivo = parsed.motivo || "ESCALADO_HUMANO";
      const resumen = parsed.resumen_requerimiento || "Sin requerimiento especificado";

      const ticket = await repository.createHitlTicket({
        sessionId,
        reason: motivo,
        requirementSummary: resumen,
      });

      return {
        status: "ticket_created",
        ticket_id: ticket.ticketCode,
        session_id: sessionId,
        motivo,
        resumen,
      };
    },
  });
}
