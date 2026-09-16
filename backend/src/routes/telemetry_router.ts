import { Router, Request, Response } from "express";
import { repository } from "../db/repository.js";

export const telemetryRouter = Router();

telemetryRouter.get("/telemetry/traces", (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const traces = repository.listTraces(sessionId, limit);
  res.json({ count: traces.length, traces });
});
