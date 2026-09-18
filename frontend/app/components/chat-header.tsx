"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Activity,
  UserCheck,
  MoreVertical,
  Plus,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { ShortcutsDialog } from "./shortcuts-dialog";

export interface ChatHeaderProps {
  chatTitle?: string | null;
  leadName?: string | null;
  hitlCount: number;
  onOpenLead: () => void;
  onOpenHitl: () => void;
  onOpenTelemetry: () => void;
  onNewChat?: () => void;
}

export function ChatHeader({
  chatTitle,
  leadName,
  hitlCount,
  onOpenLead,
  onOpenHitl,
  onOpenTelemetry,
  onNewChat,
}: ChatHeaderProps) {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  return (
    <>
      <header className="flex h-11 items-center justify-between border-b border-border bg-background px-3 select-none text-xs shrink-0 z-10 font-sans">
        {/* Left: Chat Title Pill */}
        <div className="flex items-center gap-2 min-w-0 max-w-md lg:max-w-xl">
          <div className="flex h-[30px] items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-foreground shadow-xs select-none max-w-full">
            <span className="font-medium text-xs tracking-tight text-foreground truncate max-w-[240px] sm:max-w-[360px] md:max-w-[480px]">
              {chatTitle || "Nueva Consulta"}
            </span>
          </div>
        </div>

        {/* Right: Actions Dropdown Menu */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Opciones y herramientas del sistema"
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                />
              }
            >
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-64 rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md outline-none"
            >
              {/* Client Profile Header if Lead identified */}
              {leadName && (
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1 border-b border-border/50 rounded-lg bg-muted/40">
                  <div className="size-6 rounded-full bg-secondary text-foreground flex items-center justify-center font-bold text-[10px] shrink-0 border border-border/60">
                    {leadName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{leadName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">Prospecto identificado</p>
                  </div>
                  <Badge variant="outline" className="h-4 text-[9px] px-1.5 font-medium border-border/60 text-muted-foreground">
                    Activo
                  </Badge>
                </div>
              )}

              <DropdownMenuGroup>
                <DropdownMenuLabel>Información & Monitoreo</DropdownMenuLabel>

                {/* 1. Lead / Ficha del Lead */}
                <DropdownMenuItem
                  onClick={onOpenLead}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-3.5 text-muted-foreground" />
                    <span>Ficha del Lead</span>
                  </div>
                  {leadName ? (
                    <span className="text-[10px] font-medium text-foreground bg-secondary px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]">
                      {leadName}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70">Sin registrar</span>
                  )}
                </DropdownMenuItem>

                {/* 2. Trazabilidad / OpenTelemetry */}
                <DropdownMenuItem
                  onClick={onOpenTelemetry}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="size-3.5 text-muted-foreground" />
                    <span>Trazabilidad</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">OpenTelemetry</span>
                </DropdownMenuItem>

                {/* 3. Tickets HITL */}
                <DropdownMenuItem
                  onClick={onOpenHitl}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-3.5 text-muted-foreground" />
                    <span>Tickets (HITL)</span>
                  </div>
                  {hitlCount > 0 ? (
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-mono font-medium border-border text-foreground">
                      {hitlCount} activo{hitlCount > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70 font-mono">0 activos</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuLabel>Acciones Rápidas</DropdownMenuLabel>

                {onNewChat && (
                  <DropdownMenuItem
                    onClick={onNewChat}
                    className="flex items-center justify-between py-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="size-3.5 text-muted-foreground" />
                      <span>Nueva Consulta</span>
                    </div>
                    <DropdownMenuShortcut>⌥N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => setIsShortcutsOpen(true)}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="size-3.5 text-muted-foreground" />
                    <span>Atajos de Teclado</span>
                  </div>
                  <DropdownMenuShortcut>?</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* System Info Footer */}
              <div className="px-2 py-1 text-[10px] text-muted-foreground/80 flex items-center justify-between select-none font-mono">
                <span>Gemini 3.8 Flash</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="size-1 rounded-full bg-foreground/50 inline-block" />
                  RAG Activo
                </span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsDialog
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />
    </>
  );
}
