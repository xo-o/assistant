import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { initTelemetry } from "./telemetry/tracer.js";
import { chatRouter } from "./routes/chat_router.js";
import { leadsRouter } from "./routes/leads_router.js";
import { hitlRouter } from "./routes/hitl_router.js";
import { feedbackRouter } from "./routes/feedback_router.js";
import { telemetryRouter } from "./routes/telemetry_router.js";
import { closeDatabase } from "./db/database.js";

// Initialize OpenTelemetry
initTelemetry();

const app = express();

// Middlewares
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// Healthcheck
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "automotive-advisor-backend",
    version: "1.0.0",
    engine: "Google ADK + Gen AI SDK",
    cloudTraceEnabled: env.ENABLE_CLOUD_TRACE,
  });
});

// API Routes
app.use("/api/v1", chatRouter);
app.use("/api/v1", leadsRouter);
app.use("/api/v1", hitlRouter);
app.use("/api/v1", feedbackRouter);
app.use("/api/v1", telemetryRouter);

export { app };

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Automotive Advisor Agent Backend running at http://${env.HOST}:${env.PORT}`);
    console.log(`📡 OpenTelemetry Cloud Trace: ${env.ENABLE_CLOUD_TRACE ? "ACTIVE" : "Console Fallback"}`);
    console.log(`🤖 Default Model: ${env.DEFAULT_MODEL}`);
    console.log(`💾 Database: Supabase PostgreSQL (Port 6543 Pooler)`);
    console.log(`=======================================================`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log("✓ HTTP server stopped accepting incoming connections.");
      try {
        await closeDatabase();
        console.log("✓ Database pool drained and disconnected.");
      } catch (err) {
        console.error("⚠ Error closing database connection:", err);
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error("⚠ Forced termination due to timeout on graceful shutdown.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
