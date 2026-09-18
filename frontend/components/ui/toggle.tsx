"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-pressed:bg-muted aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-transparent data-pressed:bg-muted aria-pressed:bg-muted",
        outline: "border border-border bg-transparent hover:bg-muted data-pressed:bg-muted aria-pressed:bg-muted",
        segmented:
          "h-[26px] flex-1 min-w-0 rounded-[6px] px-1 text-xs font-medium leading-[22px] border border-transparent bg-transparent text-muted-foreground hover:text-foreground transition-colors select-none cursor-pointer data-pressed:bg-secondary data-pressed:text-foreground data-pressed:font-semibold data-pressed:shadow-xs aria-pressed:bg-secondary aria-pressed:text-foreground aria-pressed:font-semibold aria-pressed:shadow-xs dark:data-pressed:bg-[#3b3b3b] dark:data-pressed:text-white dark:data-pressed:font-semibold dark:data-pressed:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:aria-pressed:bg-[#3b3b3b] dark:aria-pressed:text-white dark:aria-pressed:font-semibold dark:aria-pressed:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
      },
      size: {
        default:
          "h-[30px] min-w-[30px] px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-lg px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
