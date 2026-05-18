import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh w-full bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_55%)]">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}
