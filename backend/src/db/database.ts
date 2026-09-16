import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

let sqlClient: postgres.Sql | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  // Best practice for Supabase transaction pooler (port 6543): prepare: false
  sqlClient = postgres(env.DATABASE_URL, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  dbInstance = drizzle(sqlClient, { schema });
  return dbInstance;
}

export const db = getDatabase();

export async function closeDatabase(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
    dbInstance = null;
  }
}
