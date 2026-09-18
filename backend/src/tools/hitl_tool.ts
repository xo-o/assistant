import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { repository } from "../db/repository.js";

export const SolicitarContactoHumanoParamsSchema = z.object({
  session_id: z.string().optional().describe("ID de la sesión actual"),
  motivo: z.string().optional().default("ESCALADO_HUMANO").describe("Motivo de la derivación: TEST_DRIVE, COTIZACION_FORMAL o ESCALADO_HUMANO"),
  resumen_requerimiento: z.string().optional().default("Sin requerimiento especificado").describe("Resumen de las necesidades del cliente y el vehículo solicitado"),
  contacto_usuario: z.string().optional().describe("Teléfono, WhatsApp o correo electrónico del cliente para que el asesor humano pueda comunicarse con él."),
});

export type SolicitarContactoHumanoParams = z.infer<typeof SolicitarContactoHumanoParamsSchema>;

export function createSolicitarContactoHumanoTool(contextSessionId?: string): FunctionTool {
  return new FunctionTool({
    name: "solicitar_contacto_humano",
    description:
      "Genera un ticket de derivación asistida (HITL) hacia un asesor humano para test drive, cotización formal o escalado. CONDICIÓN PREVIA: Solo debes invocar esta herramienta cuando el usuario YA haya proporcionado su número de teléfono, WhatsApp o correo de contacto (o se niegue expresamente a darlo). Si el usuario solicita test drive o cotización pero aún no ha brindado su contacto, NO LLAMES a esta herramienta todavía: pídele amablemente su contacto primero.",
    parameters: SolicitarContactoHumanoParamsSchema as any,
    execute: async (args: any) => {
      const parsed = SolicitarContactoHumanoParamsSchema.parse(args);
      const sessionId = parsed.session_id || contextSessionId || "session_default";
      const motivo = parsed.motivo || "ESCALADO_HUMANO";
      let resumen = parsed.resumen_requerimiento || "Sin requerimiento especificado";

      if (parsed.contacto_usuario) {
        await repository.saveOrUpdateLead({
          sessionId,
          contactChannel: parsed.contacto_usuario,
        });
        if (!resumen.includes(parsed.contacto_usuario)) {
          resumen += `\nContacto del cliente: ${parsed.contacto_usuario}`;
        }
      }

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
