"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-transparent bg-muted px-2.5 py-2 text-xs font-medium text-foreground transition-all outline-none placeholder:text-muted-foreground hover:border-border/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:text-destructive aria-invalid:ring-1 aria-invalid:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
