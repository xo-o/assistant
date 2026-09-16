"use client";

import React from "react";
import { ShieldAlert, CheckCircle2, X, PhoneCall, FileText } from "lucide-react";

export interface HitlTicketData {
  ticket_code: string;
  reason: string;
  requirement_summary: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  operator_notes?: string | null;
  created_at?: string;
}

interface HitlModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: HitlTicketData | null;
  onResolveTicket: (ticketCode: string, notes: string) => void;
}

export function HitlModal({ isOpen, onClose, ticket, onResolveTicket }: HitlModalProps) {
  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Derivación Asistida (HITL) Activa
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Ticket: {ticket.ticket_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Motivo de Escalado
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                {ticket.reason}
              </span>
              <span className="text-xs text-muted-foreground">
                Estado: <span className="font-semibold text-foreground">{ticket.status}</span>
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" /> Resumen del Requerimiento
            </span>
            <div className="mt-1.5 bg-muted/50 p-3 rounded-lg border border-border text-sm text-foreground">
              {ticket.requirement_summary}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Protocolo de Derivación Asistida</p>
              <p className="mt-0.5 text-blue-800/80 dark:text-blue-300/80">
                El agente automático transfirió la intención del cliente (test drive / cotización formal). Los datos de contacto y ficha del lead han sido congelados para la atención del asesor humano.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 border-t border-border px-6 py-3.5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={() => onResolveTicket(ticket.ticket_code, "Atendido y confirmado por asesor humano")}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Atendido
          </button>
        </div>
      </div>
    </div>
  );
}
