"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, PhoneCall, FileText, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface HitlTicketData {
  ticket_code?: string;
  ticketCode?: string;
  ticket_id?: string;
  reason?: string;
  motivo?: string;
  requirement_summary?: string;
  requirementSummary?: string;
  resumen?: string;
  status?: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  operator_notes?: string | null;
  operatorNotes?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface HitlModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: HitlTicketData | null;
  onResolveTicket: (ticketCode: string, notes: string) => void;
  contactChannel?: string | null;
  onUpdateContact?: (contact: string) => Promise<void>;
}

export function HitlModal({
  isOpen,
  onClose,
  ticket,
  onResolveTicket,
  contactChannel,
  onUpdateContact,
}: HitlModalProps) {
  const [inputContact, setInputContact] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!ticket) return null;

  const ticketCode = ticket.ticketCode || ticket.ticket_code || ticket.ticket_id || "TICK-PENDING";
  const requirementSummary =
    ticket.requirementSummary ||
    ticket.requirement_summary ||
    ticket.resumen ||
    "Sin requerimiento especificado";
  const reason = ticket.reason || ticket.motivo || "ESCALADO_HUMANO";
  const status = ticket.status || "PENDING";

  const hasRealContact =
    contactChannel &&
    !contactChannel.startsWith("sess_") &&
    contactChannel !== "session_default";

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContact.trim() || !onUpdateContact) return;
    setIsSaving(true);
    await onUpdateContact(inputContact.trim());
    setIsSaving(false);
    setInputContact("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border border-border/80 bg-popover shadow-2xl rounded-xl font-sans">
        {/* Minimalist Neutral Header */}
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border/60">
              <ShieldAlert className="size-3.5 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xs font-semibold text-foreground">
                Derivación Asistida (HITL)
              </DialogTitle>
              <DialogDescription className="text-[11px] font-mono text-muted-foreground">
                Ticket: {ticketCode}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Motivo & Estado */}
          <div className="flex items-center justify-between py-1 border-b border-border/40">
            <span className="font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">
              Motivo de Escalado
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-5 text-[10px] font-mono font-medium uppercase border-border text-foreground">
                {reason}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                Estado: <strong className="text-foreground font-medium">{status}</strong>
              </span>
            </div>
          </div>

          {/* Resumen */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <FileText className="size-3 text-muted-foreground" /> Resumen del Requerimiento
            </span>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/60 text-xs leading-relaxed text-foreground">
              {requirementSummary}
            </div>
          </div>

          {/* Contacto del Cliente */}
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <PhoneCall className="size-3 text-muted-foreground" /> Canal de Contacto
            </span>
            {hasRealContact ? (
              <div className="flex items-center gap-2 bg-muted/20 border border-border/40 px-3 py-2 rounded-lg text-xs">
                <Check className="size-3.5 text-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Registrado para asesor: <strong className="font-mono text-foreground font-medium">{contactChannel}</strong>
                </span>
              </div>
            ) : (
              <div className="bg-muted/30 border border-border/50 p-3 rounded-lg flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  El cliente aún no ha proporcionado un teléfono o correo de contacto.
                </p>
                {onUpdateContact && (
                  <form onSubmit={handleSaveContact} className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      value={inputContact}
                      onChange={(e) => setInputContact(e.target.value)}
                      placeholder="Ingresar WhatsApp o email..."
                      className="h-8 text-xs flex-1 bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={!inputContact.trim() || isSaving}
                      variant="secondary"
                      size="sm"
                      className="h-8 px-3 text-xs font-medium"
                    >
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : "Vincular"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Minimalist Dialog Footer */}
        <DialogFooter className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between sm:justify-between m-0 rounded-none">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cerrar
          </Button>
          <Button
            size="sm"
            onClick={() => onResolveTicket(ticketCode, "Atendido y confirmado por asesor humano")}
            className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="size-3.5" />
            <span>Marcar Atendido</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
