import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_API_KEY: z.string().optional(),
  DEFAULT_MODEL: z.string().default("gemini-3.8-flash"),
  DATABASE_URL: z.string().default(
    "postgresql://postgres.xwkdsizgxtpxkeuooups:10dbnOndb10@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
  ),
  ENABLE_CLOUD_TRACE: z.coerce.boolean().default(false),
  GCP_PROJECT_ID: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),
  MAX_HISTORY_TOKENS: z.coerce.number().default(4000),
  MAX_TURNS_HISTORY: z.coerce.number().default(10),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  DEFAULT_MODEL: process.env.DEFAULT_MODEL,
  DATABASE_URL: process.env.DATABASE_URL,
  ENABLE_CLOUD_TRACE: process.env.ENABLE_CLOUD_TRACE,
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  MAX_HISTORY_TOKENS: process.env.MAX_HISTORY_TOKENS,
  MAX_TURNS_HISTORY: process.env.MAX_TURNS_HISTORY,
});
