import { ClipboardList } from "lucide-react"

type AuthSidePanelProps = {
  title: string
  description: string
}

export function AuthSidePanel({
  title,
  description,
}: AuthSidePanelProps) {
  return (
    <div
      className="relative hidden overflow-hidden border-l border-border/70 md:flex md:min-h-full md:items-center md:justify-center md:px-12 lg:px-14"
      style={{
        background:
          "radial-gradient(ellipse at 70% 20%, color-mix(in oklch, var(--sidebar-primary) 8%, transparent) 0%, transparent 60%), " +
          "radial-gradient(ellipse at 30% 80%, color-mix(in oklch, var(--sidebar-primary) 6%, transparent) 0%, transparent 55%), " +
          "var(--app-surface)",
      }}
    >
      {/* Decorative grid dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--sidebar-primary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative flex max-w-sm flex-col items-center gap-5 text-center animate-fade-in">
        <div
          className="flex size-[4.5rem] items-center justify-center rounded-[1.35rem] shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, var(--sidebar-primary), color-mix(in oklch, var(--sidebar-primary), black 18%))",
          }}
        >
          <ClipboardList className="size-8 text-white" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
