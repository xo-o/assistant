import { Router, Request, Response } from "express";
import { z } from "zod";
import { repository } from "../db/repository.js";

export const leadsRouter = Router();

const UpdateContactSchema = z.object({
  contact: z.string().min(5, "El canal de contacto debe tener al menos 5 caracteres"),
});

leadsRouter.get("/leads", async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const leads = await repository.listLeads(limit);
  res.json({ count: leads.length, leads });
});

leadsRouter.get("/leads/:sessionId", async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const lead = await repository.getLeadBySessionId(sessionId);
  if (!lead) {
    res.status(404).json({ error: "Lead not found for session", sessionId });
    return;
  }
  res.json({
    ...lead,
    vehicle_type_interest: lead.vehicleTypeInterest,
    primary_use: lead.primaryUse,
    contact_channel: lead.contactChannel,
    updated_at: lead.updatedAt,
    created_at: lead.createdAt,
    tipo_vehiculo: lead.vehicleTypeInterest,
    uso: lead.primaryUse,
  });
});

leadsRouter.post("/leads/:sessionId/contact", async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    const body = UpdateContactSchema.parse(req.body);
    const updated = await repository.saveOrUpdateLead({
      sessionId,
      contactChannel: body.contact.trim(),
    });

    const activeTickets = await repository.listHitlTickets(sessionId, 1);
    const latestTicket = activeTickets.length > 0 ? activeTickets[0] : null;

    res.json({
      success: true,
      lead: {
        ...updated,
        vehicle_type_interest: updated.vehicleTypeInterest,
        primary_use: updated.primaryUse,
        contact_channel: updated.contactChannel,
        updated_at: updated.updatedAt,
        created_at: updated.createdAt,
        tipo_vehiculo: updated.vehicleTypeInterest,
        uso: updated.primaryUse,
      },
      ticket: latestTicket,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation Error", details: err.errors });
    } else {
      res.status(500).json({ error: "Internal Server Error", message: String(err) });
    }
  }
});
