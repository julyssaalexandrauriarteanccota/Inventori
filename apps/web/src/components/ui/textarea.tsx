import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/45 aria-invalid:bg-destructive/2.5 aria-invalid:ring-2 aria-invalid:ring-destructive/12 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/55 dark:aria-invalid:bg-destructive/6 dark:aria-invalid:ring-destructive/18",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
