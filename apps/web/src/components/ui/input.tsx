import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  startIcon?: React.ComponentType<{ className?: string }>;
  endIcon?: React.ComponentType<{ className?: string }>;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon: StartIcon, endIcon: EndIcon, ...props }, ref) => {
    return (
      <div className="group/input relative flex items-center w-full" data-slot="input-wrapper">
        {StartIcon && (
          <div className="pointer-events-none absolute left-3 z-10 flex items-center justify-center text-muted-foreground/50 transition-colors group-focus-within/input:text-primary">
            <StartIcon className="size-4" />
          </div>
        )}
        <input
          type={type}
          ref={ref}
          data-slot="input"
          className={cn(
            "h-10 w-full min-w-0 rounded-xl border border-input bg-transparent py-1.5 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
            StartIcon ? "pl-10" : "pl-3.5",
            EndIcon ? "pr-10" : "pr-3.5",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:border-destructive/45 aria-invalid:bg-destructive/2.5 aria-invalid:ring-2 aria-invalid:ring-destructive/12 dark:aria-invalid:border-destructive/55 dark:aria-invalid:bg-destructive/6 dark:aria-invalid:ring-destructive/18",
            className,
          )}
          {...props}
        />
        {EndIcon && (
          <div className="pointer-events-none absolute right-3 z-10 flex items-center justify-center text-muted-foreground/50 transition-colors group-focus-within/input:text-primary">
            <EndIcon className="size-4" />
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

