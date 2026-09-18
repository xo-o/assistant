import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

function cleanEnv(val: string | undefined): string | undefined {
  if (!val) return val;
  return val.replace(/^["']|["']$/g, "").trim();
}

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_API_KEY: z.string().optional(),
  DEFAULT_MODEL: z.string().default("gemini-3.8-flash"),
  DATABASE_URL: z.string().default(
    "postgresql://postgres.xwkdsizgxtpxkeuooups:10dbnOndb10@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
  ),
  CORS_ORIGIN: z.string().default("*"),
  MAX_HISTORY_TOKENS: z.coerce.number().default(4000),
  MAX_TURNS_HISTORY: z.coerce.number().default(10),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().default("https://us.cloud.langfuse.com"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  PORT: process.env.PORT,
  HOST: cleanEnv(process.env.HOST),
  NODE_ENV: cleanEnv(process.env.NODE_ENV),
  GEMINI_API_KEY: cleanEnv(process.env.GEMINI_API_KEY),
  DEFAULT_MODEL: cleanEnv(process.env.DEFAULT_MODEL),
  DATABASE_URL: cleanEnv(process.env.DATABASE_URL),
  CORS_ORIGIN: cleanEnv(process.env.CORS_ORIGIN),
  MAX_HISTORY_TOKENS: process.env.MAX_HISTORY_TOKENS,
  MAX_TURNS_HISTORY: process.env.MAX_TURNS_HISTORY,
  LANGFUSE_SECRET_KEY: cleanEnv(process.env.LANGFUSE_SECRET_KEY),
  LANGFUSE_PUBLIC_KEY: cleanEnv(process.env.LANGFUSE_PUBLIC_KEY),
  LANGFUSE_BASE_URL: cleanEnv(process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_BASEURL || "https://us.cloud.langfuse.com"),
});
