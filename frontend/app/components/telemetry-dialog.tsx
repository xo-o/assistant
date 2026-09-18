"use client";

import React from "react";
import { Activity, Clock, Cpu, Wrench, CheckCircle } from "lucide-react";
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

export interface TelemetryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  latestTrace: TelemetryTrace | null;
}

export function TelemetryDialog({ isOpen, onClose, latestTrace }: TelemetryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border border-border/80 bg-popover shadow-2xl rounded-xl font-sans">
        {/* Minimalist Header */}
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border/60">
              <Activity className="size-3.5 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xs font-semibold text-foreground">
                Trazabilidad OpenTelemetry
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                Spans de turno, llamadas a herramientas y métricas de latencia
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {latestTrace ? (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Clock className="size-3 text-muted-foreground" /> Latencia
                  </span>
                  <p className="text-base font-bold text-foreground mt-1">
                    {latestTrace.latency_ms} <span className="text-xs font-normal text-muted-foreground">ms</span>
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Cpu className="size-3 text-muted-foreground" /> Tokens
                  </span>
                  <p className="text-base font-bold text-foreground mt-1">
                    {latestTrace.total_tokens}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({latestTrace.input_tokens} / {latestTrace.output_tokens})
                    </span>
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <Activity className="size-3 text-muted-foreground" /> Modelo
                  </span>
                  <p className="text-xs font-medium text-foreground mt-1.5 truncate">
                    {latestTrace.model_name}
                  </p>
                </div>
              </div>

              {/* Trace ID */}
              <div className="bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">
                  Trace ID (W3C OpenTelemetry):
                </span>
                <p className="text-xs font-mono text-foreground/80 mt-0.5 break-all">
                  {latestTrace.trace_id}
                </p>
              </div>

              {/* Tools Trajectory */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Wrench className="size-3 text-muted-foreground" /> Trayectoria de Herramientas
                </h4>
                {latestTrace.tools_called && latestTrace.tools_called.length > 0 ? (
                  <div className="space-y-1.5">
                    {latestTrace.tools_called.map((tool, idx) => (
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
                      {latestTrace.guardrails_result?.passed ? "Passed" : "Blocked"}
                    </Badge>
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
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="size-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium">No hay trazas registradas todavía.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Envía un mensaje para generar la primera traza.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between sm:justify-between m-0 rounded-none">
          <span className="text-[11px] text-muted-foreground">
            OTel SDK + Google Cloud Trace
          </span>
          <Button size="sm" onClick={onClose} className="h-8 text-xs font-semibold">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Semantic alias
export const TelemetryModal = TelemetryDialog;
