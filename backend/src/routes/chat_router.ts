import { Router, Request, Response } from "express";
import { z } from "zod";
import { orchestrator } from "../agent/orchestrator.js";
import { repository } from "../db/repository.js";

export const chatRouter = Router();

const ChatRequestSchema = z.object({
  session_id: z.string().optional().default("session_default"),
  user_id: z.string().optional(),
  message: z.string().min(1, "El mensaje no puede estar vacío").max(1000, "Mensaje demasiado largo"),
  model: z.string().optional(),
});

// Synchronous JSON Turn
chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const parsed = ChatRequestSchema.parse(req.body);
    const result = await orchestrator.executeTurn({
      sessionId: parsed.session_id,
      userId: parsed.user_id,
      message: parsed.message,
      model: parsed.model,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation Error", details: error.errors });
    } else {
      console.error("Error in /chat:", error);
      res.status(500).json({ error: "Internal Server Error", message: String(error) });
    }
  }
});

// Real-Time SSE Stream Turn
chatRouter.post("/chat/stream", async (req: Request, res: Response) => {
  try {
    const parsed = ChatRequestSchema.parse(req.body);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const stream = orchestrator.executeTurnStream({
      sessionId: parsed.session_id,
      userId: parsed.user_id,
      message: parsed.message,
      model: parsed.model,
    });

    for await (const chunk of stream) {
      res.write(`event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`);
    }

    res.end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation Error", details: error.errors });
    } else {
      console.error("Error in /chat/stream:", error);
      res.status(500).json({ error: "Internal Server Error", message: String(error) });
    }
  }
});

// Session History
chatRouter.get("/chat/history/:sessionId", (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const messages = repository.getSessionMessages(sessionId);
  res.json({ sessionId, count: messages.length, messages });
});
