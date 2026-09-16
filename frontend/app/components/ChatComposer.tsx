"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Sparkles,
  Mic,
  BookOpen,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatComposerProps {
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  currentModel: string;
  onModelChange: (model: string) => void;
  onOpenLead: () => void;
  leadName?: string | null;
}

const MODEL_NAMES: Record<string, string> = {
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "mock-agent": "Mock Agent",
};

export function ChatComposer({
  onSendMessage,
  isStreaming,
  currentModel,
  onModelChange,
  onOpenLead,
  leadName,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-5 pt-2">
      <div className="relative rounded-2xl bg-card border border-border shadow-md transition-all focus-within:ring-1 focus-within:ring-ring">
        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta sobre autos a Luis..."
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-40 leading-relaxed font-normal"
        />

        {/* Bottom Toolbar inside composer */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left Action Chips & Model Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Model Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 px-2.5 rounded-lg bg-muted/80 hover:bg-muted text-foreground border border-border gap-1.5 text-xs font-medium"
                  />
                }
              >
                <Sparkles className="size-3 text-amber-500" />
                <span>{MODEL_NAMES[currentModel] || currentModel}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-48 bg-popover text-popover-foreground border-border"
              >
                <DropdownMenuItem
                  onClick={() => onModelChange("gemini-1.5-pro")}
                  className="text-xs cursor-pointer"
                >
                  Gemini 1.5 Pro (Baseline)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onModelChange("gemini-2.0-flash")}
                  className="text-xs cursor-pointer"
                >
                  Gemini 2.0 Flash (Fast)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onModelChange("mock-agent")}
                  className="text-xs cursor-pointer"
                >
                  Mock Local (Test Mode)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* RAG Knowledge Badge / Chip */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 px-2 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 gap-1.5 text-xs"
                  />
                }
              >
                <BookOpen className="size-3" />
                <span>Catálogo RAG</span>
              </TooltipTrigger>
              <TooltipContent>RAG automotriz activo</TooltipContent>
            </Tooltip>

            {/* Lead Status Chip */}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onOpenLead}
              className="h-7 px-2 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 gap-1.5 text-xs"
            >
              <User className="size-3 text-primary" />
              <span>{leadName ? `Lead: ${leadName}` : "Lead"}</span>
            </Button>
          </div>

          {/* Right Controls: Send Button */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  />
                }
              >
                <Mic className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Entrada de voz</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || isStreaming}
                    className="size-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  />
                }
              >
                <ArrowUp className="size-3.5 stroke-[2.5]" />
              </TooltipTrigger>
              <TooltipContent>Enviar mensaje (Enter)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
