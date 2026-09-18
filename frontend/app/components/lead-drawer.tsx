"use client";

import React from "react";
import { User, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";

export interface LeadData {
  name?: string | null;
  nombre?: string | null;
  contact_channel?: string | null;
  contactChannel?: string | null;
  canal_contacto?: string | null;
  vehicle_type_interest?: string | null;
  vehicleTypeInterest?: string | null;
  tipo_vehiculo?: string | null;
  tipo_vehiculo_interes?: string | null;
  primary_use?: string | null;
  primaryUse?: string | null;
  uso?: string | null;
  uso_principal?: string | null;
  stage?: "DESCUBRIMIENTO" | "INTERES_CONCRETO";
  etapa?: "DESCUBRIMIENTO" | "INTERES_CONCRETO";
  status?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface LeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadData | null;
  sessionId: string;
}

export function LeadDrawer({ isOpen, onClose, lead, sessionId }: LeadDrawerProps) {
  const clientName = lead?.name || lead?.nombre || null;
  const contactChannel =
    lead?.contactChannel ||
    lead?.contact_channel ||
    lead?.canal_contacto ||
    null;
  const isRealContact =
    contactChannel &&
    !contactChannel.startsWith("sess_") &&
    contactChannel !== "session_default";

  const vehicleInterest =
    lead?.vehicleTypeInterest ||
    lead?.vehicle_type_interest ||
    lead?.tipo_vehiculo ||
    lead?.tipo_vehiculo_interes ||
    null;
  const primaryUse =
    lead?.primaryUse ||
    lead?.primary_use ||
    lead?.uso ||
    lead?.uso_principal ||
    null;
  const stage = lead?.stage || lead?.etapa || "DESCUBRIMIENTO";

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
      <DrawerContent className="w-80 max-w-[85vw] border-l border-border bg-sidebar text-sidebar-foreground shadow-2xl font-sans">
        <DrawerHeader>
          <DrawerTitle>
            <User className="size-3.5 text-muted-foreground" />
            <span>Ficha del Lead</span>
          </DrawerTitle>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onClose}
                aria-label="Cerrar ficha"
                className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
              />
            }
          >
            <X className="size-3.5" />
          </DrawerClose>
        </DrawerHeader>
        <DrawerDescription className="sr-only">
          Información y datos estructurados capturados del lead en tiempo real.
        </DrawerDescription>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
            Captura estructurada en tiempo real mediante la herramienta{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground font-semibold">
              guardar_lead
            </code>.
          </div>

          <div className="space-y-3 pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Datos del Prospecto
            </div>

            <div className="space-y-2">
              {/* Nombre */}
              <div className="flex items-center justify-between gap-2 min-h-[28px] py-1 border-b border-border/40">
                <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                  Nombre
                </span>
                <span className="text-foreground font-medium text-right truncate">
                  {clientName || <span className="text-muted-foreground/50 italic">Pendiente</span>}
                </span>
              </div>

              {/* Contacto */}
              <div className="flex items-center justify-between gap-2 min-h-[28px] py-1 border-b border-border/40">
                <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                  Contacto
                </span>
                <div className="text-right truncate">
                  {isRealContact ? (
                    <span className="text-foreground font-mono font-medium">
                      {contactChannel}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50 italic">Por registrar</span>
                  )}
                </div>
              </div>

              {/* Interés */}
              <div className="flex items-center justify-between gap-2 min-h-[28px] py-1 border-b border-border/40">
                <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                  Interés
                </span>
                <span className="text-foreground font-medium text-right truncate">
                  {vehicleInterest || <span className="text-muted-foreground/50 italic">En exploración</span>}
                </span>
              </div>

              {/* Uso Principal */}
              <div className="flex items-center justify-between gap-2 min-h-[28px] py-1 border-b border-border/40">
                <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                  Uso Principal
                </span>
                <span className="text-foreground font-medium text-right truncate">
                  {primaryUse || <span className="text-muted-foreground/50 italic">No definido</span>}
                </span>
              </div>

              {/* Etapa Funnel */}
              <div className="flex items-center justify-between gap-2 min-h-[28px] py-1 border-b border-border/40">
                <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                  Etapa Funnel
                </span>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium h-5 border-border text-foreground"
                  >
                    {stage}
                  </Badge>
                </div>
              </div>

              {/* Sesión ID */}
              <div className="flex items-center justify-between gap-2 min-h-[28px] py-1">
                <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                  Sesión ID
                </span>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]" title={sessionId}>
                  {sessionId}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3 text-muted-foreground" />
            <span>SQLite Persistente</span>
          </div>
          <span className="font-mono text-[10px]">table: leads</span>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Semantic alias
export const LeadPanel = LeadDrawer;
