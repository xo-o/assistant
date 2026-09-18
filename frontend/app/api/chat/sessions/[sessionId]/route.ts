import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const res = await fetch(`${BACKEND_URL}/api/v1/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error deleting session in proxy:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
