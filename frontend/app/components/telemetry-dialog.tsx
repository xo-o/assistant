"use client";

import React from "react";
import { Activity, Clock, Cpu, Wrench, CheckCircle, ExternalLink, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TelemetryTrace {
  trace_id?: string;
  traceId?: string;
  trace_url?: string;
  traceUrl?: string;
  session_id?: string;
  sessionId?: string;
  model_name?: string;
  modelName?: string;
  latency_ms?: number;
  latencyMs?: number;
  input_tokens?: number;
  inputTokens?: number;
  output_tokens?: number;
  outputTokens?: number;
  total_tokens?: number;
  totalTokens?: number;
  tools_called?: Array<{
    name: string;
    durationMs: number;
    status: string;
  }> | null;
  toolsCalled?: Array<{
    name: string;
    durationMs: number;
    status: string;
  }> | null;
  guardrails_result?: {
    passed: boolean;
    reason?: string;
    traceUrl?: string;
  } | null;
  guardrailsResult?: {
    passed: boolean;
    reason?: string;
    traceUrl?: string;
  } | null;
  created_at?: string;
}

export interface TelemetryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  latestTrace: TelemetryTrace | null;
}

export function TelemetryDialog({ isOpen, onClose, latestTrace }: TelemetryDialogProps) {
  const traceId = latestTrace?.traceId || latestTrace?.trace_id || "";
  const latencyMs = latestTrace?.latencyMs ?? latestTrace?.latency_ms ?? 0;
  const totalTokens = latestTrace?.totalTokens ?? latestTrace?.total_tokens ?? 0;
  const inputTokens = latestTrace?.inputTokens ?? latestTrace?.input_tokens ?? 0;
  const outputTokens = latestTrace?.outputTokens ?? latestTrace?.output_tokens ?? 0;
  const modelName = latestTrace?.modelName || latestTrace?.model_name || "gemini-3.8-flash";
  const tools = latestTrace?.toolsCalled || latestTrace?.tools_called || [];
  const guardrails = latestTrace?.guardrailsResult || latestTrace?.guardrails_result;
  const traceUrl =
    latestTrace?.traceUrl ||
    latestTrace?.trace_url ||
    guardrails?.traceUrl ||
    (traceId ? `https://us.cloud.langfuse.com/trace/${traceId}` : undefined);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border border-border/80 bg-popover shadow-2xl rounded-xl font-sans">
        {/* Minimalist Header */}
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xs font-semibold text-foreground">
                  Observabilidad & Telemetría (Langfuse & OTel)
                </DialogTitle>
                <Badge variant="outline" className="h-4 text-[9px] font-mono border-orange-500/30 text-orange-500 bg-orange-500/5">
                  Langfuse Connected
                </Badge>
              </div>
              <DialogDescription className="text-[11px] text-muted-foreground">
                Trazas de ejecución, spans de herramientas, conteo de tokens y latencia
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {latestTrace ? (
            <>
              {/* Langfuse Cloud Link Callout */}
              {traceUrl && (
                <a
                  href={traceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15 transition-all text-xs font-medium text-orange-600 dark:text-orange-400 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                    <div>
                      <p className="font-semibold text-xs leading-none">Ver traza en vivo en Langfuse Cloud Dashboard</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                        Árbol de ejecución, tokens in/out, waterfall de herramientas y scores
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono bg-background/60 px-2 py-1 rounded border border-border/50">
                    <span>Abrir</span>
                    <ExternalLink className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </a>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Clock className="size-3 text-muted-foreground" /> Latencia
                  </span>
                  <p className="text-base font-bold text-foreground mt-1">
                    {latencyMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Cpu className="size-3 text-muted-foreground" /> Tokens
                  </span>
                  <p className="text-base font-bold text-foreground mt-1">
                    {totalTokens}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({inputTokens} / {outputTokens})
                    </span>
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Activity className="size-3 text-muted-foreground" /> Modelo
                  </span>
                  <p className="text-xs font-medium text-foreground mt-1.5 truncate">
                    {modelName}
                  </p>
                </div>
              </div>

              {/* Trace ID */}
              <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">
                    Trace ID (Langfuse / OpenTelemetry):
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">W3C Compliant</span>
                </div>
                <p className="text-xs font-mono text-foreground/80 mt-0.5 break-all select-all">
                  {traceId}
                </p>
              </div>

              {/* Tools Trajectory */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Wrench className="size-3 text-muted-foreground" /> Trayectoria de Herramientas
                </h4>
                {tools && tools.length > 0 ? (
                  <div className="space-y-1.5">
                    {tools.map((tool, idx) => (
                      <div
                        key={idx}
                        className="bg-muted/30 p-2.5 rounded-lg border border-border/60 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="size-1 rounded-full bg-foreground/60" />
                          <code className="font-mono text-xs text-foreground font-medium">
                            {tool.name}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono text-[11px]">{tool.durationMs} ms</span>
                          <Badge variant="outline" className="h-4 text-[9px] font-mono border-border text-foreground">
                            {tool.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    No se ejecutaron herramientas en este turno.
                  </p>
                )}
              </div>

              {/* Guardrails Status */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="size-3 text-muted-foreground" /> Evaluación de Guardrails
                </h4>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Prompt Injection & Scope Filter:</span>
                    <Badge variant="outline" className="h-4 text-[9px] font-mono border-border text-foreground">
                      {guardrails?.passed ? "Passed" : "Blocked"}
                    </Badge>
                  </div>
                  {guardrails?.reason && (
                    <p className="mt-1 text-muted-foreground font-mono text-[11px]">
                      Motivo: {guardrails.reason}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="size-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium">No hay trazas registradas todavía.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Envía un mensaje para generar la primera traza en Langfuse.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between sm:justify-between m-0 rounded-none">
          <span className="text-[11px] text-muted-foreground">
            Langfuse Cloud + OpenTelemetry SDK
          </span>
          <Button size="sm" onClick={onClose} className="h-8 text-xs font-semibold">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Semantic alias
export const TelemetryModal = TelemetryDialog;
