import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const res = await fetch(`${BACKEND_URL}/api/v1/chat/history/${sessionId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ sessionId, count: 0, messages: [] });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching session history in proxy:", err);
    return NextResponse.json({ count: 0, messages: [] });
  }
}
