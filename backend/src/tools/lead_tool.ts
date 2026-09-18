import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { repository } from "../db/repository.js";

export const GuardarLeadParamsSchema = z.object({
  session_id: z.string().optional().describe("ID de la sesión actual"),
  nombre: z.string().optional().describe("Nombre del usuario si lo ha indicado"),
  canal_contacto: z.string().optional().describe("Canal de contacto del usuario: número de teléfono, WhatsApp o correo electrónico"),
  tipo_vehiculo_interes: z.string().optional().describe("Tipo de vehículo de interés (ej. SUV, Sedán, Pickup, Híbrido, Hatchback)"),
  uso_principal: z.string().optional().describe("Uso principal que le dará al auto (ej. Ciudad, Familia, Trabajo, Viajes)"),
  etapa: z.enum(["DESCUBRIMIENTO", "INTERES_CONCRETO"]).optional().default("DESCUBRIMIENTO").describe("Etapa del lead en el embudo"),
});

export type GuardarLeadParams = z.infer<typeof GuardarLeadParamsSchema>;

export function createGuardarLeadTool(contextSessionId?: string): FunctionTool {
  return new FunctionTool({
    name: "guardar_lead",
    description:
      "Guarda o actualiza la ficha del lead/usuario en la base de datos de gestión. Utilízala cuando el usuario proporcione su nombre, tipo de carrocería o modelo de interés, teléfono/correo de contacto o cuando avance su nivel de intención.",
    parameters: GuardarLeadParamsSchema as any,
    execute: async (args: any) => {
      const parsed = GuardarLeadParamsSchema.parse(args);
      const sessionId = contextSessionId || parsed.session_id || "session_default";
      const leadRecord = await repository.saveOrUpdateLead({
        sessionId,
        name: parsed.nombre,
        contactChannel: parsed.canal_contacto,
        vehicleTypeInterest: parsed.tipo_vehiculo_interes,
        primaryUse: parsed.uso_principal,
        stage: parsed.etapa || "DESCUBRIMIENTO",
      });

      return {
        status: "success",
        message: "Lead guardado correctamente",
        lead: {
          session_id: sessionId,
          nombre: leadRecord.name || "",
          canal_contacto: leadRecord.contactChannel || "",
          tipo_vehiculo: leadRecord.vehicleTypeInterest || "",
          uso: leadRecord.primaryUse || "",
          etapa: leadRecord.stage,
        },
      };
    },
  });
}
