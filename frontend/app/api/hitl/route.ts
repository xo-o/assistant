import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    const limit = req.nextUrl.searchParams.get("limit") || "10";
    const url = new URL(`${BACKEND_URL}/api/v1/hitl/tickets`);
    if (sessionId) {
      url.searchParams.set("session_id", sessionId);
    }
    url.searchParams.set("limit", limit);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ count: 0, tickets: [] });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error in /api/hitl GET proxy:", err);
    return NextResponse.json({ count: 0, tickets: [] });
  }
}
