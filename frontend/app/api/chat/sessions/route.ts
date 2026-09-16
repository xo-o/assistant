import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/chat/sessions?limit=30`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ count: 0, sessions: [] });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching sessions in proxy:", err);
    return NextResponse.json({ count: 0, sessions: [] });
  }
}
