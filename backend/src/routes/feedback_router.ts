import { Router, Request, Response } from "express";
import { z } from "zod";
import { repository } from "../db/repository.js";
import { recordLangfuseScore } from "../telemetry/langfuse.js";

export const feedbackRouter = Router();

const FeedbackSchema = z.object({
  session_id: z.string().min(1),
  message_id: z.string().optional(),
  trace_id: z.string().optional(),
  is_positive: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

feedbackRouter.post("/feedback", async (req: Request, res: Response) => {
  try {
    const parsed = FeedbackSchema.parse(req.body);
    const feedback = await repository.saveFeedback({
      sessionId: parsed.session_id,
      messageId: parsed.message_id,
      isPositive: parsed.is_positive,
      rating: parsed.rating,
      comment: parsed.comment,
    });

    // Mirror feedback score to Langfuse
    let targetTraceId = parsed.trace_id;
    if (!targetTraceId) {
      const traces = await repository.listTraces(parsed.session_id, 1);
      if (traces.length > 0) {
        targetTraceId = traces[0].traceId;
      }
    }

    if (targetTraceId) {
      await recordLangfuseScore({
        traceId: targetTraceId,
        name: "user_feedback",
        value: parsed.rating ? parsed.rating / 5 : parsed.is_positive ? 1 : 0,
        comment: parsed.comment || (parsed.is_positive ? "Thumbs up" : "Thumbs down"),
      });
    }

    res.status(201).json({ status: "success", feedback, trace_id: targetTraceId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation Error", details: err.errors });
    } else {
      res.status(500).json({ error: "Internal Server Error", message: String(err) });
    }
  }
});

feedbackRouter.get("/feedback", async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const feedbacks = await repository.listFeedback(limit);
  res.json({ count: feedbacks.length, feedbacks });
});
