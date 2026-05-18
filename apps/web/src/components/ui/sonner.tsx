"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast flex items-center gap-3 rounded-2xl border border-border/50 bg-popover text-popover-foreground shadow-lg px-4 py-3 text-sm font-medium backdrop-blur-sm",
          title: "font-semibold text-sm",
          description: "text-xs text-muted-foreground mt-0.5",
          actionButton: "bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-lg font-medium",
          cancelButton: "bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-lg font-medium",
          closeButton: "opacity-0 group-hover:opacity-100 transition-opacity",
          success:
            "!border-emerald-200 dark:!border-emerald-800/50 !bg-emerald-50 dark:!bg-emerald-950/80 !text-emerald-900 dark:!text-emerald-100 [&>[data-icon]]:!text-emerald-600 dark:[&>[data-icon]]:!text-emerald-400",
          error:
            "!border-red-200 dark:!border-red-800/50 !bg-red-50 dark:!bg-red-950/80 !text-red-900 dark:!text-red-100 [&>[data-icon]]:!text-red-600 dark:[&>[data-icon]]:!text-red-400",
          warning:
            "!border-amber-200 dark:!border-amber-800/50 !bg-amber-50 dark:!bg-amber-950/80 !text-amber-900 dark:!text-amber-100 [&>[data-icon]]:!text-amber-600 dark:[&>[data-icon]]:!text-amber-400",
          info:
            "!border-blue-200 dark:!border-blue-800/50 !bg-blue-50 dark:!bg-blue-950/80 !text-blue-900 dark:!text-blue-100 [&>[data-icon]]:!text-blue-600 dark:[&>[data-icon]]:!text-blue-400",
        },
      }}
      style={
        {
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
