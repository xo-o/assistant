import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await context.params;
    const res = await fetch(`${BACKEND_URL}/api/v1/hitl/tickets/${ticketCode}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(null, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching HITL ticket in proxy:", err);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ ticketCode: string }> }
) {
  try {
    const { ticketCode } = await context.params;
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/hitl/tickets/${ticketCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error patching HITL ticket in proxy:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
