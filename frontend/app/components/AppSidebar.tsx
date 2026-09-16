"use client";

import React from "react";
import {
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Car,
} from "lucide-react";
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
      <div className="hidden md:flex flex-col items-center py-3 px-2 bg-[#09090b] border-r border-white/10">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="size-9 text-neutral-400 hover:text-white hover:bg-neutral-800"
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
                className="mt-3 size-9 text-neutral-400 hover:text-white hover:bg-neutral-800"
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
    <aside className="w-64 h-full bg-[#09090b] border-r border-white/10 flex flex-col justify-between shrink-0 select-none z-30 transition-all duration-200">
      {/* Top Brand & Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-neutral-800 text-white flex items-center justify-center font-bold text-sm border border-white/10">
              <Car className="size-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-neutral-200 tracking-tight">
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
                  className="size-7 text-neutral-400 hover:text-white hover:bg-neutral-800"
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
          className="w-full justify-start gap-2 h-9 rounded-lg bg-neutral-900/60 border-white/10 text-neutral-200 hover:bg-neutral-800 hover:text-white text-xs font-medium transition-colors"
        >
          <Plus className="size-4 text-neutral-400" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Recent Chats List */}
      <div className="flex-1 overflow-hidden flex flex-col px-3">
        <div className="px-1 py-1.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
          Recent
        </div>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-0.5">
            {sessions.length === 0 ? (
              <div className="px-2 py-4 text-xs text-neutral-500 italic">
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
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors cursor-pointer truncate group ${
                      isActive
                        ? "bg-neutral-800 text-white font-medium shadow-xs"
                        : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                    }`}
                  >
                    <MessageSquare className="size-3.5 shrink-0 text-neutral-500 group-hover:text-neutral-300" />
                    <span className="truncate">{title}</span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom User Card */}
      <div className="p-3">
        <Separator className="bg-white/10 mb-3" />
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer">
          <Avatar className="size-8 border border-white/10">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" />
            <AvatarFallback className="bg-neutral-800 text-neutral-200 text-xs font-semibold">
              {userName ? userName.slice(0, 2).toUpperCase() : "CU"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-200 truncate">
              {userName || "Cliente"}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">
              {userName ? `${userName.toLowerCase().replace(/\s+/g, ".")}@gmail.com` : "cliente@auto.pe"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
