import { Router, Request, Response } from "express";
import { z } from "zod";
import { repository } from "../db/repository.js";

export const hitlRouter = Router();

const UpdateTicketSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"]),
  operator_notes: z.string().optional(),
});

function formatTicket(ticket: any) {
  if (!ticket) return null;
  return {
    ...ticket,
    ticket_code: ticket.ticketCode,
    ticket_id: ticket.ticketCode,
    requirement_summary: ticket.requirementSummary,
    resumen: ticket.requirementSummary,
    operator_notes: ticket.operatorNotes,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
  };
}

hitlRouter.get("/hitl/tickets", async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const tickets = await repository.listHitlTickets(sessionId, limit);
  res.json({ count: tickets.length, tickets: tickets.map(formatTicket) });
});

hitlRouter.get("/hitl/tickets/:ticketCode", async (req: Request, res: Response) => {
  const code = req.params.ticketCode;
  const ticket = await repository.getHitlTicketByCode(code);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found", ticketCode: code });
    return;
  }
  res.json(formatTicket(ticket));
});

hitlRouter.patch("/hitl/tickets/:ticketCode", async (req: Request, res: Response) => {
  try {
    const code = req.params.ticketCode;
    const body = UpdateTicketSchema.parse(req.body);
    const updated = await repository.updateHitlTicket(code, body.status, body.operator_notes);
    if (!updated) {
      res.status(404).json({ error: "Ticket not found", ticketCode: code });
      return;
    }
    res.json(formatTicket(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation Error", details: err.errors });
    } else {
      res.status(500).json({ error: "Internal Server Error", message: String(err) });
    }
  }
});
