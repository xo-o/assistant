import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { ragEngine } from "../knowledge/rag_engine.js";

export const BaseConocimientosAutosParamsSchema = z.object({
  query: z.string().describe("Consulta de búsqueda sobre tipos de carrocería, motores, rendimiento o mantenimiento automotriz"),
  top_k: z.number().int().min(1).max(5).optional().default(3).describe("Cantidad de documentos relevantes a recuperar"),
});

export type BaseConocimientosAutosParams = z.infer<typeof BaseConocimientosAutosParamsSchema>;

export function createBaseConocimientosAutosTool(): FunctionTool {
  return new FunctionTool({
    name: "base_conocimientos_autos",
    description:
      "Repositorio de documentación automotriz general. Contiene guías de segmentos (SUV vs. Sedán), tipos de motorización (gasolina, híbridos, eléctricos), rendimiento y glosario técnico automotriz. Consúltala antes de dar explicaciones técnicas sobre desempeño y características.",
    parameters: BaseConocimientosAutosParamsSchema as any,
    execute: async (args: any) => {
      const parsed = BaseConocimientosAutosParamsSchema.parse(args);
      const results = await ragEngine.search(parsed.query, parsed.top_k || 3);

      if (results.length === 0) {
        return {
          status: "not_found",
          message: "No se encontró información técnica específica para esa consulta en la base de conocimientos.",
          documents: [],
        };
      }

      return {
        status: "success",
        results_count: results.length,
        documents: results.map((r) => ({
          title: r.title,
          category: r.category,
          content: r.content,
          relevance: r.score,
        })),
      };
    },
  });
}
