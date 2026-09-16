import { Router, Request, Response } from "express";
import { z } from "zod";
import { repository } from "../db/repository.js";

export const feedbackRouter = Router();

const FeedbackSchema = z.object({
  session_id: z.string().min(1),
  message_id: z.string().optional(),
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
    res.status(201).json({ status: "success", feedback });
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
