import { trace, Tracer, Span, SpanStatusCode } from "@opentelemetry/api";
import { NodeTracerProvider, SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { env } from "../config/env.js";

let tracerProvider: NodeTracerProvider | null = null;
const TRACER_NAME = "automotive-advisor-agent";

export function initTelemetry(): Tracer {
  if (tracerProvider) {
    return trace.getTracer(TRACER_NAME);
  }

  const provider = new NodeTracerProvider();

  if (env.NODE_ENV === "development") {
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  provider.register();
  tracerProvider = provider;
  return trace.getTracer(TRACER_NAME);
}

export function getTracer(): Tracer {
  return trace.getTracer(TRACER_NAME);
}

export interface TurnTelemetryData {
  traceId: string;
  sessionId: string;
  modelName: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  toolsCalled: Array<{
    name: string;
    params?: unknown;
    result?: unknown;
    durationMs: number;
    status: "SUCCESS" | "ERROR";
  }>;
  guardrailsResult: {
    passed: boolean;
    reason?: string;
  };
}

export function recordTraceSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      span.end();
    }
  });
}
