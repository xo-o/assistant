"use client";

import React from "react";
import { X, Activity, Clock, Cpu, Wrench, CheckCircle } from "lucide-react";

export interface TelemetryTrace {
  trace_id: string;
  session_id: string;
  model_name: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  tools_called?: Array<{
    name: string;
    durationMs: number;
    status: string;
  }> | null;
  guardrails_result?: {
    passed: boolean;
    reason?: string;
  } | null;
  created_at?: string;
}

interface TelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestTrace: TelemetryTrace | null;
}

export function TelemetryModal({ isOpen, onClose, latestTrace }: TelemetryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Trazabilidad y Métricas de Ejecución (OpenTelemetry)
              </h3>
              <p className="text-xs text-muted-foreground">
                Spans de turno, trayectoria de herramientas y latencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {latestTrace ? (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 p-3.5 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Latencia de Turno
                  </span>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {latestTrace.latency_ms} <span className="text-xs font-normal text-muted-foreground">ms</span>
                  </p>
                </div>

                <div className="bg-muted/40 p-3.5 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-500" /> Tokens Totales
                  </span>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {latestTrace.total_tokens}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({latestTrace.input_tokens} in / {latestTrace.output_tokens} out)
                    </span>
                  </p>
                </div>

                <div className="bg-muted/40 p-3.5 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" /> Modelo LLM
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1 truncate">
                    {latestTrace.model_name}
                  </p>
                </div>
              </div>

              {/* Trace ID */}
              <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                <span className="text-[11px] text-muted-foreground uppercase font-mono font-semibold">
                  Trace ID (W3C OpenTelemetry):
                </span>
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5 break-all">
                  {latestTrace.trace_id}
                </p>
              </div>

              {/* Tools Called */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-500" /> Trayectoria de Herramientas (Tool Trajectory)
                </h4>
                {latestTrace.tools_called && latestTrace.tools_called.length > 0 ? (
                  <div className="space-y-2">
                    {latestTrace.tools_called.map((tool, idx) => (
                      <div
                        key={idx}
                        className="bg-muted/40 p-3 rounded-lg border border-border/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <code className="font-mono font-semibold text-foreground">
                            {tool.name}
                          </code>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{tool.durationMs} ms</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px]">
                            {tool.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/40">
                    No se requirió ejecución de herramientas en este turno.
                  </p>
                )}
              </div>

              {/* Guardrails Status */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Evaluación de Guardrails
                </h4>
                <div className="bg-muted/40 p-3 rounded-lg border border-border/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Filtro de Inyecciones & Out-of-Scope:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {latestTrace.guardrails_result?.passed ? "Aprobado (Pass)" : "Bloqueado"}
                    </span>
                  </div>
                  {latestTrace.guardrails_result?.reason && (
                    <p className="mt-1 text-muted-foreground font-mono text-[11px]">
                      Motivo: {latestTrace.guardrails_result.reason}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2 animate-pulse" />
              <p className="text-sm font-medium">No hay trazas registradas todavía.</p>
              <p className="text-xs">Envía un mensaje a Luis para generar la primera traza de telemetría.</p>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-3 bg-muted/20 flex justify-between items-center text-[11px] text-muted-foreground">
          <span>Compatibilidad: OpenTelemetry SDK & Google Cloud Trace</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
