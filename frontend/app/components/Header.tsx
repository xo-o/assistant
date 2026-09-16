"use client";

import React from "react";
import { Car, ShieldCheck, Activity, UserCheck, Sparkles } from "lucide-react";

interface HeaderProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  leadName?: string | null;
  hitlCount: number;
  onOpenLead: () => void;
  onOpenTelemetry: () => void;
}

export function Header({
  currentModel,
  onModelChange,
  leadName,
  hitlCount,
  onOpenLead,
  onOpenTelemetry,
}: HeaderProps) {
  return (
    <header className="border-b border-border/80 bg-background/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Brand & Advisor Profile */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            L
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base text-foreground leading-tight">
              Luis
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
              Asesor Automotriz
            </span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Car className="w-3 h-3 text-blue-500" /> Orientación de compra personalizada • Google ADK
          </p>
        </div>
      </div>

      {/* Controls & Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Model Picker */}
        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/60 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-muted-foreground font-medium">Modelo:</span>
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Baseline)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="mock-agent">Mock Local (Test Mode)</option>
          </select>
        </div>

        {/* Lead Badge / Button */}
        <button
          onClick={onOpenLead}
          className="flex items-center gap-1.5 bg-secondary/80 hover:bg-secondary px-3 py-1.5 rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer border border-border/50"
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>{leadName ? `Lead: ${leadName}` : "Ficha de Lead"}</span>
        </button>

        {/* HITL Badge */}
        {hitlCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-800 animate-pulse">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{hitlCount} Ticket HITL</span>
          </div>
        )}

        {/* Telemetry Button */}
        <button
          onClick={onOpenTelemetry}
          className="flex items-center gap-1.5 bg-muted/80 hover:bg-muted px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer border border-border/50"
          title="Ver métricas de OpenTelemetry y trazas"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Trazas OTel</span>
        </button>
      </div>
    </header>
  );
}
