import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isStream = req.nextUrl.searchParams.get("stream") === "true";

    if (isStream) {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error connecting to backend in /api/chat:", error);
    return NextResponse.json(
      {
        error: "Backend Connection Error",
        message: "No se pudo conectar con el backend de Google ADK en el puerto 8000.",
      },
      { status: 502 }
    );
  }
}
