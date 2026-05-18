'use client'

import { useRouter } from 'next/navigation'
import {
  Bell,
  Ticket,
  PackageOpen,
  FileCheck2,
  FileX2,
  AlertTriangle,
} from 'lucide-react'
import { SocketEvents } from '@erp/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSocket, type AppNotification } from '@/hooks/use-socket'

function getNotificationIcon(event: string) {
  switch (event) {
    case SocketEvents.TICKET_CREATED:
    case SocketEvents.TICKET_UPDATED:
    case SocketEvents.TICKET_CLOSED:
      return <Ticket className="size-4 shrink-0 text-blue-500" />
    case SocketEvents.STOCK_ALERTA:
      return <AlertTriangle className="size-4 shrink-0 text-amber-500" />
    case SocketEvents.COMPROBANTE_ACEPTADO:
      return <FileCheck2 className="size-4 shrink-0 text-emerald-500" />
    case SocketEvents.COMPROBANTE_RECHAZADO:
      return <FileX2 className="size-4 shrink-0 text-red-500" />
    default:
      return <PackageOpen className="size-4 shrink-0 text-muted-foreground" />
  }
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: AppNotification
  onNavigate: (href: string) => void
}) {
  return (
    <button
      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-sidebar-accent/70 text-sidebar-foreground ${
        notification.read ? 'opacity-60' : ''
      }`}
      onClick={() => notification.href && onNavigate(notification.href)}
    >
      <div className="mt-0.5">{getNotificationIcon(notification.event)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{notification.title}</p>
          {!notification.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {notification.description}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          {formatTimeAgo(notification.timestamp)}
        </p>
      </div>
    </button>
  )
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAllRead } = useSocket()
  const router = useRouter()

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-full border border-sidebar-border/85 bg-sidebar-accent/78 text-sidebar-primary hover:bg-sidebar-accent"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 border-sidebar-border/70 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center justify-between border-b border-sidebar-border/70 px-4 py-3">
          <h4 className="text-sm font-semibold text-sidebar-foreground">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={markAllRead}
            >
              Marcar como leídas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="size-8 text-sidebar-primary/30" />
              <p className="mt-2 text-sm text-sidebar-foreground/60">
                Sin notificaciones
              </p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
