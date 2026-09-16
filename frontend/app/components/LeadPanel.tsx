"use client";

import React from "react";
import { X, User, Car, Compass, Award, Calendar } from "lucide-react";

export interface LeadData {
  name?: string | null;
  vehicle_type_interest?: string | null;
  primary_use?: string | null;
  stage?: "DESCUBRIMIENTO" | "INTERES_CONCRETO";
  status?: string;
  updated_at?: string;
}

interface LeadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadData | null;
  sessionId: string;
}

export function LeadPanel({ isOpen, onClose, lead, sessionId }: LeadPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-sm bg-background border-l border-border h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" /> Ficha de Lead en Tiempo Real
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-3 mb-5">
            Datos estructurados capturados automáticamente por la herramienta{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-blue-600 dark:text-blue-400">
              guardar_lead
            </code>{" "}
            durante el diálogo natural.
          </p>

          <div className="space-y-4">
            {/* Name */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <User className="w-3.5 h-3.5 text-blue-500" /> Nombre del Cliente
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">
                {lead?.name || <span className="text-muted-foreground italic">No especificado aún</span>}
              </p>
            </div>

            {/* Vehicle Interest */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Car className="w-3.5 h-3.5 text-indigo-500" /> Tipo de Vehículo
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">
                {lead?.vehicle_type_interest || <span className="text-muted-foreground italic">En exploración</span>}
              </p>
            </div>

            {/* Primary Use */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Compass className="w-3.5 h-3.5 text-emerald-500" /> Uso Principal
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">
                {lead?.primary_use || <span className="text-muted-foreground italic">No definido</span>}
              </p>
            </div>

            {/* Stage */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <Award className="w-3.5 h-3.5 text-amber-500" /> Etapa del Funnel
              </span>
              <div className="mt-1.5">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    lead?.stage === "INTERES_CONCRETO"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                  }`}
                >
                  {lead?.stage || "DESCUBRIMIENTO"}
                </span>
              </div>
            </div>

            {/* Session ID */}
            <div className="bg-muted/20 rounded-lg p-2.5 border border-border/30 text-[11px] text-muted-foreground">
              <span className="font-mono">Sesión: {sessionId}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground">
            Sincronizado con SQLite • Tabla: <code className="font-mono">leads</code>
          </p>
        </div>
      </div>
    </div>
  );
}
