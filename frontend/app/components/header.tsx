"use client";

import React from "react";
import { Car, ShieldCheck, Activity, UserCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <header className="border-b border-border/80 bg-background/95 backdrop-blur px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Brand & Advisor Profile */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
            L
          </div>
          <span className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-background rounded-full" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base text-foreground leading-tight">
              Luis
            </h1>
            <Badge variant="secondary" className="text-[11px] font-medium">
              Asesor Automotriz
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Car className="size-3.5 text-primary" /> Orientación personalizada • Google ADK
          </p>
        </div>
      </div>

      {/* Controls & Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Model Picker */}
        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60 text-xs">
          <Sparkles className="size-3.5 text-amber-500" />
          <span className="text-muted-foreground font-medium">Modelo:</span>
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Latest)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Baseline)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          </select>
        </div>

        {/* Lead Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenLead}
          className="text-xs"
        >
          <UserCheck className="size-3.5 text-primary" />
          <span>{leadName ? `Lead: ${leadName}` : "Ficha de Lead"}</span>
        </Button>

        {/* HITL Badge */}
        {hitlCount > 0 && (
          <Badge
            variant="destructive"
            className="animate-pulse flex items-center gap-1 py-1"
          >
            <ShieldCheck className="size-3.5" />
            <span>{hitlCount} Ticket HITL</span>
          </Badge>
        )}

        {/* Telemetry Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTelemetry}
          className="text-xs"
          title="Ver métricas de OpenTelemetry y trazas"
        >
          <Activity className="size-3.5 text-emerald-500" />
          <span>Trazas OTel</span>
        </Button>

        {/* Dark Mode Theme Toggle */}
        <div className="border-l border-border/80 pl-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
