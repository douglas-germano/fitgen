import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground border-transparent bg-chip focus-visible:border-ring focus-visible:bg-background aria-invalid:border-destructive flex field-sizing-content min-h-20 w-full rounded-[var(--radius-md)] border px-4 py-3 text-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
