'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useState } from 'react'
import { AtmosphereProvider } from '@/lib/atmosphere'

const toasterClassNames = {
  toast:
    'group toast flex w-[calc(100vw-1.5rem)] items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:w-[22rem]',
  title: 'text-[13px] font-semibold leading-5 tracking-tight',
  description: 'mt-0.5 text-[12.5px] leading-[1.4] text-muted-foreground',
  actionButton:
    'h-8 rounded-lg bg-[var(--sidebar-primary)] px-3 text-xs font-medium text-[var(--sidebar-primary-foreground)] hover:opacity-90',
  cancelButton:
    'h-8 rounded-lg bg-muted px-3 text-xs font-medium text-muted-foreground hover:bg-muted/80',
  closeButton:
    '!left-auto !right-2 !top-2 !translate-x-0 !translate-y-0 !border-0 !bg-transparent !text-muted-foreground/60 hover:!text-foreground hover:!bg-muted/60 transition-colors',
  success:
    '[&>[data-icon]]:!text-emerald-500 dark:[&>[data-icon]]:!text-emerald-400',
  error:
    '[&>[data-icon]]:!text-red-500 dark:[&>[data-icon]]:!text-red-400',
  warning:
    '[&>[data-icon]]:!text-amber-500 dark:[&>[data-icon]]:!text-amber-400',
  info:
    '[&>[data-icon]]:!text-[var(--sidebar-primary)] dark:[&>[data-icon]]:!text-[var(--sidebar-primary)]',
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,       // 5 min — data stays fresh longer
            gcTime: 24 * 60 * 60 * 1000,    // 24 h — cache persists offline
            retry: 1,
            networkMode: 'offlineFirst',
          },
          mutations: {
            networkMode: 'offlineFirst',
          },
        },
      }),
  )

  return (
    <AtmosphereProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
            <Toaster
              className="toaster group"
              position="bottom-right"
              expand
              gap={10}
              visibleToasts={3}
              offset={{ bottom: 20, right: 20 }}
              mobileOffset={{ bottom: 16, left: 16, right: 16 }}
              toastOptions={{
                classNames: toasterClassNames,
              }}
            />
          </TooltipProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </NextThemesProvider>
    </AtmosphereProvider>
  )
}
