import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

export async function cleanupDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment");
  }

  const sql = postgres(connectionString, { prepare: false });

  console.log("🧹 Starting database cleanup...");

  // 1. Delete execution traces
  const tracesDeleted = await sql`DELETE FROM execution_traces`;
  console.log(`✓ Deleted ${tracesDeleted.count} execution traces`);

  // 2. Delete all chat sessions (cascades to messages, leads, hitl_tickets, user_feedbacks)
  const sessionsDeleted = await sql`DELETE FROM chat_sessions`;
  console.log(`✓ Deleted ${sessionsDeleted.count} chat sessions (and cascaded messages, leads, HITL tickets, feedbacks)`);

  console.log("✨ Database successfully cleaned!");
  await sql.end();
}

if (process.argv[1] && process.argv[1].includes("cleanup")) {
  cleanupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Cleanup error:", err);
      process.exit(1);
    });
}
