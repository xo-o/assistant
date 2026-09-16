import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment");
  }

  const sql = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(sql);

  console.log("⏳ Running migrations on Supabase PostgreSQL...");
  let migrationsFolder = path.resolve(process.cwd(), "migrations");
  if (!fs.existsSync(migrationsFolder)) {
    migrationsFolder = path.resolve(__dirname, "../../migrations");
  }

  await migrate(db, { migrationsFolder });
  console.log("✓ Migrations applied successfully!");

  await sql.end();
}

if (process.argv[1] && process.argv[1].includes("migrate")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration error:", err);
      process.exit(1);
    });
}
