import { Router, Request, Response } from "express";
import { repository } from "../db/repository.js";

export const leadsRouter = Router();

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
  res.json(lead);
});
