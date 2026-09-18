"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface ChatSessionItem {
  id: string;
  title: string | null;
  updated_at?: string;
  updatedAt?: string;
}

interface AppSidebarProps {
  sessions: ChatSessionItem[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function AppSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  return (
    <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden select-none text-xs shrink-0 font-sans z-30">
      {/* Top Sidebar: Pandero App Name and Logo */}
      <div className="flex h-11 items-center border-b border-sidebar-border px-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/assets/logo.png"
            alt="Pandero Logo"
            className="size-4 shrink-0 object-contain brightness-0 invert"
          />
          <span className="font-bold text-sm tracking-tight text-foreground font-sans">
            Pandero
          </span>
        </div>
      </div>

      {/* Action: New Chat Button */}
      <div className="p-2 border-b border-sidebar-border space-y-1.5">
        <Link
          href="/"
          onClick={() => onNewChat?.()}
          className="w-full flex items-center justify-center gap-1.5 h-[30px] rounded-lg text-xs font-semibold shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Nueva Consulta</span>
        </Link>

        {/* Search using Studio's InputGroup */}
        <InputGroup className="h-[28px] bg-muted/70">
          <InputGroupAddon align="inline-start" className="pl-2">
            <Search className="size-3 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            placeholder="Buscar en historial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[28px] text-[11px] placeholder:text-muted-foreground/80 px-1.5 font-normal"
          />
          {searchQuery && (
            <InputGroupAddon align="inline-end" className="pr-1">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setSearchQuery("")}
                aria-label="Borrar búsqueda"
                className="size-4 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-2.5" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-hidden flex flex-col p-1.5">

        <ScrollArea className="flex-1 pr-1">
          {filteredSessions.length === 0 ? (
            <Empty className="py-8">
              <EmptyMedia variant="icon">
                {searchQuery ? (
                  <Search className="size-3.5 text-muted-foreground" />
                ) : (
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                )}
              </EmptyMedia>
              <EmptyTitle className="text-xs">
                {searchQuery ? "Sin resultados" : "Sin consultas"}
              </EmptyTitle>
              <EmptyDescription className="text-[11px]">
                {searchQuery
                  ? "No se encontraron consultas con ese término."
                  : "Comienza una nueva conversación con Luis."}
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-0.5">
              {filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const title = session.title || "Nueva Consulta";
                return (
                  <Link
                    key={session.id}
                    href={`/${session.id}`}
                    onClick={() => onSelectSession?.(session.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer truncate flex items-center gap-2 block",
                      isActive
                        ? "bg-secondary text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="truncate flex-1">{title}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}
