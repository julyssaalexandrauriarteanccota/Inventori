import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh w-full bg-[radial-gradient(circle_at_top,_var(--app-muted)_0%,_var(--app-canvas)_55%)]">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}
