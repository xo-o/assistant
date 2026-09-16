"use client";

import React from "react";
import { Plus, PanelLeftClose, PanelLeft, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface ChatSessionItem {
  id: string;
  title: string | null;
  updated_at?: string;
  updatedAt?: string;
}

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSessionItem[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  userName?: string | null;
}

export function AppSidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  userName,
}: AppSidebarProps) {
  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-3 px-2 bg-sidebar border-r border-sidebar-border">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="size-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              />
            }
          >
            <PanelLeft className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Expandir panel</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewChat}
                className="mt-3 size-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              />
            }
          >
            <Plus className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Nuevo chat</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <aside className="w-64 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-200">
      {/* Top Brand & Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center font-bold text-sm border border-sidebar-border">
              <Car className="size-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">
              Luis Advisor
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="size-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                />
              }
            >
              <PanelLeftClose className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">Ocultar panel</TooltipContent>
          </Tooltip>
        </div>

        {/* + New Chat Button */}
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 h-9 rounded-lg bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs font-medium transition-colors"
        >
          <Plus className="size-4 text-muted-foreground" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Chats List (No Recent label, No chat icons) */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 pt-1">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-0.5">
            {sessions.length === 0 ? (
              <div className="px-2 py-4 text-xs text-muted-foreground italic">
                No hay conversaciones previas
              </div>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const title = session.title || "Nueva Consulta";
                return (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer truncate ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-xs"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className="truncate block">{title}</span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom User Card */}
      <div className="p-3">
        <Separator className="bg-sidebar-border mb-3" />
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
          <Avatar className="size-8 border border-sidebar-border">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {userName ? userName.slice(0, 2).toUpperCase() : "CU"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {userName || "Cliente"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {userName ? `${userName.toLowerCase().replace(/\s+/g, ".")}@gmail.com` : "cliente@auto.pe"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
