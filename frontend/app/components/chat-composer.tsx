"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Sparkles,
  ChevronDown,
  Check,
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
  onOpenLead?: () => void;
  leadName?: string | null;
}

const MODEL_NAMES: Record<string, string> = {
  "gemini-3.8-flash": "Gemini 3.8 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.0-pro-exp-02-05": "Gemini 2.0 Pro",
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
};

export function ChatComposer({
  onSendMessage,
  isStreaming,
  currentModel,
  onModelChange,
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
    <div className="w-full max-w-3xl mx-auto px-4 pb-5 pt-2 font-sans select-none">
      <div className="relative rounded-xl bg-card border border-border shadow-lg transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring/80">
        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta sobre modelos, motores o financiamiento..."
          rows={1}
          className="w-full bg-transparent px-4 pt-3 pb-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-40 leading-relaxed font-normal select-text"
        />

        {/* Minimal & Clean Bottom Toolbar: Model Selection (Left) + Send (Right) */}
        <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
          {/* Left: Model Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-[28px] px-2.5 rounded-lg bg-muted/80 hover:bg-muted text-foreground border border-transparent hover:border-border/60 gap-1.5 text-xs font-medium shadow-none cursor-pointer"
                />
              }
            >
              <Sparkles className="size-3 text-amber-500" />
              <span>{MODEL_NAMES[currentModel] || currentModel}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="w-56 rounded-xl border border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md outline-none"
            >
              {Object.entries(MODEL_NAMES).map(([key, name]) => {
                const isSelected = key === currentModel;
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onModelChange(key)}
                    className="text-xs cursor-pointer flex items-center justify-between py-1.5"
                  >
                    <span>{name}</span>
                    {isSelected ? (
                      <Check className="size-3 text-primary" />
                    ) : key === "gemini-3.8-flash" ? (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        Latest
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right: Send Button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isStreaming}
                  aria-label="Enviar mensaje"
                  className="size-7 rounded-lg bg-primary text-primary-foreground hover:bg-[var(--brand-hover,#0088ff)] active:bg-[var(--brand-active,#0077ff)] disabled:opacity-30 disabled:hover:bg-primary transition-all shadow-xs cursor-pointer"
                />
              }
            >
              <ArrowUp className="size-3.5 stroke-[2.5]" />
            </TooltipTrigger>
            <TooltipContent side="top">Enviar mensaje (Enter)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
