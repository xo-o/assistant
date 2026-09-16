"use client";

import React from "react";
import { PanelLeft, ShieldAlert, Activity, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CleanHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  leadName?: string | null;
  hitlCount: number;
  onOpenLead: () => void;
  onOpenHitl: () => void;
  onOpenTelemetry: () => void;
}

export function CleanHeader({
  isSidebarOpen,
  onToggleSidebar,
  leadName,
  hitlCount,
  onOpenLead,
  onOpenHitl,
  onOpenTelemetry,
}: CleanHeaderProps) {
  return (
    <header className="h-12 border-b border-border bg-background/95 backdrop-blur px-4 flex items-center justify-between gap-3 shrink-0 z-20">
      {/* Left Title & Sidebar trigger */}
      <div className="flex items-center gap-2.5">
        {!isSidebarOpen && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleSidebar}
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                />
              }
            >
              <PanelLeft className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Mostrar historial</TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            Luis
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">
            • Asesor Automotriz Virtual
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Lead Button */}
        {leadName && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onOpenLead}
            className="text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 text-xs font-normal"
          >
            <UserCheck className="size-3.5 text-primary" />
            <span className="text-xs">{leadName}</span>
          </Button>
        )}

        {/* HITL Ticket Alert */}
        {hitlCount > 0 && (
          <Button
            variant="destructive"
            size="xs"
            onClick={onOpenHitl}
            className="gap-1 animate-pulse text-[11px] font-semibold h-6"
          >
            <ShieldAlert className="size-3" />
            <span>{hitlCount} Ticket HITL</span>
          </Button>
        )}

        {/* Telemetry Button */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onOpenTelemetry}
                className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              />
            }
          >
            <Activity className="size-3.5 text-emerald-500" />
          </TooltipTrigger>
          <TooltipContent>Trazas OpenTelemetry</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
