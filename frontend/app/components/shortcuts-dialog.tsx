"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  {
    label: "Enviar consulta al asesor",
    keys: ["Enter"],
  },
  {
    label: "Salto de línea en el mensaje",
    combo: ["Shift", "Enter"],
  },
  {
    label: "Nueva conversación",
    combo: ["Alt", "N"],
  },
  {
    label: "Abrir / Ocultar panel lateral",
    combo: ["Alt", "B"],
  },
  {
    label: "Cerrar modal o panel activo",
    keys: ["Esc"],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-sans">
        <DialogHeader>
          <DialogTitle>Atajos de Teclado</DialogTitle>
          <DialogDescription>
            Navega y utiliza el Asesor Automotriz rápidamente con el teclado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2 text-xs">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.label}
              className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
            >
              <span className="text-muted-foreground">{shortcut.label}</span>
              {shortcut.combo ? (
                <KbdGroup>
                  {shortcut.combo.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </KbdGroup>
              ) : (
                <div className="flex items-center gap-1">
                  {shortcut.keys?.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
