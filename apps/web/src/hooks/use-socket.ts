'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  SocketEventName,
  SocketEventMap,
  TicketEventPayload,
  StockAlertaPayload,
  ComprobanteEventPayload,
  ComprobanteAlertaPayload,
  CertificadoAlertaPayload,
  ComunicacionBajaEventPayload,
} from '@erp/shared'
import { SocketEvents } from '@erp/shared'
import { getToken } from '@/lib/auth'

// ── Notification types ──────────────────────────────────────────

export interface AppNotification {
  id: string
  event: SocketEventName
  title: string
  description: string
  href?: string
  read: boolean
  timestamp: Date
}

// ── Context ─────────────────────────────────────────────────────

interface SocketContextValue {
  isConnected: boolean
  notifications: AppNotification[]
  unreadCount: number
  markAllRead: () => void
  markRead: (id: string) => void
  clearNotifications: () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

const MAX_NOTIFICATIONS = 50

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ── Helpers ─────────────────────────────────────────────────────

function makeNotification(
  event: SocketEventName,
  title: string,
  description: string,
  href?: string,
): AppNotification {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    event,
    title,
    description,
    href,
    read: false,
    timestamp: new Date(),
  }
}

// ── Provider ────────────────────────────────────────────────────

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const queryClient = useQueryClient()

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => [n, ...prev].slice(0, MAX_NOTIFICATIONS))
  }, [])

  // ── Socket connection lifecycle
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const socket = io(`${API_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    // ── Ticket events
    socket.on(SocketEvents.TICKET_CREATED, (p: TicketEventPayload) => {
      const n = makeNotification(
        SocketEvents.TICKET_CREATED,
        'Nuevo ticket creado',
        `${p.codigo} — ${p.titulo}`,
        '/soporte',
      )
      addNotification(n)
      toast.success(n.title, { description: n.description })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    })

    socket.on(SocketEvents.TICKET_UPDATED, (p: TicketEventPayload) => {
      const n = makeNotification(
        SocketEvents.TICKET_UPDATED,
        'Ticket actualizado',
        `${p.codigo} → ${p.estado}`,
        '/soporte',
      )
      addNotification(n)
      toast.info(n.title, { description: n.description })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    })

    socket.on(SocketEvents.TICKET_CLOSED, (p: TicketEventPayload) => {
      const n = makeNotification(
        SocketEvents.TICKET_CLOSED,
        'Ticket cerrado',
        `${p.codigo} — ${p.titulo}`,
        '/soporte',
      )
      addNotification(n)
      toast.info(n.title, { description: n.description })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    })

    // ── Stock events
    socket.on(SocketEvents.STOCK_ALERTA, (p: StockAlertaPayload) => {
      const n = makeNotification(
        SocketEvents.STOCK_ALERTA,
        'Stock bajo mínimo',
        `${p.productoNombre} en ${p.almacenNombre}: ${p.stockActual}/${p.stockMinimo}`,
        '/inventario',
      )
      addNotification(n)
      toast.warning(n.title, { description: n.description })
      queryClient.invalidateQueries({ queryKey: ['alertas-stock'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
    })

    // ── Comprobante events
    socket.on(
      SocketEvents.COMPROBANTE_ACEPTADO,
      (p: ComprobanteEventPayload) => {
        const n = makeNotification(
          SocketEvents.COMPROBANTE_ACEPTADO,
          'Comprobante aceptado',
          `${p.numero} — ${p.clienteNombre}`,
          `/comprobantes/${p.comprobanteId}`,
        )
        addNotification(n)
        toast.success(n.title, { description: n.description })
        queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
        queryClient.invalidateQueries({ queryKey: ['ventas'] })
      },
    )

    socket.on(
      SocketEvents.COMPROBANTE_RECHAZADO,
      (p: ComprobanteEventPayload) => {
        const n = makeNotification(
          SocketEvents.COMPROBANTE_RECHAZADO,
          'Comprobante rechazado',
          `${p.numero} — ${p.motivo || 'Sin motivo'}`,
          `/comprobantes/${p.comprobanteId}`,
        )
        addNotification(n)
        toast.error(n.title, { description: n.description })
        queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
        queryClient.invalidateQueries({ queryKey: ['ventas'] })
      },
    )

    // ── Alertas operativas fiscales (Doc 06)
    socket.on(
      SocketEvents.COMPROBANTE_REQUIERE_REVISION,
      (p: ComprobanteAlertaPayload) => {
        const n = makeNotification(
          SocketEvents.COMPROBANTE_REQUIERE_REVISION,
          'Comprobante requiere revisión',
          `${p.numero} — ${p.mensaje}`,
          `/comprobantes/${p.comprobanteId}`,
        )
        addNotification(n)
        toast.warning(n.title, { description: n.description })
        queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
      },
    )

    socket.on(
      SocketEvents.COMPROBANTE_PLAZO_PROXIMO,
      (p: ComprobanteAlertaPayload) => {
        const n = makeNotification(
          SocketEvents.COMPROBANTE_PLAZO_PROXIMO,
          'Plazo SUNAT por vencer',
          `${p.numero} — ${p.mensaje}`,
          `/comprobantes/${p.comprobanteId}`,
        )
        addNotification(n)
        toast.warning(n.title, { description: n.description })
        queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
      },
    )

    socket.on(
      SocketEvents.CERTIFICADO_PROXIMO_VENCER,
      (p: CertificadoAlertaPayload) => {
        const n = makeNotification(
          SocketEvents.CERTIFICADO_PROXIMO_VENCER,
          'Certificado digital por vencer',
          `${p.nombre} vence en ${p.diasRestantes} días`,
          '/configuracion',
        )
        addNotification(n)
        toast.warning(n.title, { description: n.description })
      },
    )

    socket.on(
      SocketEvents.CERTIFICADO_VENCIDO,
      (p: CertificadoAlertaPayload) => {
        const n = makeNotification(
          SocketEvents.CERTIFICADO_VENCIDO,
          'Certificado digital vencido',
          `${p.nombre} — emisiones bloqueadas hasta renovar`,
          '/configuracion',
        )
        addNotification(n)
        toast.error(n.title, { description: n.description })
      },
    )

    socket.on(
      SocketEvents.COMUNICACION_BAJA_ACEPTADA,
      (p: ComunicacionBajaEventPayload) => {
        const n = makeNotification(
          SocketEvents.COMUNICACION_BAJA_ACEPTADA,
          'Comunicación de baja aceptada',
          `${p.identificadorBaja} — ${p.comprobanteNumero}`,
          `/comprobantes/${p.comprobanteId}`,
        )
        addNotification(n)
        toast.success(n.title, { description: n.description })
        queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
        queryClient.invalidateQueries({
          queryKey: ['facturacion', 'comunicaciones-baja'],
        })
        queryClient.invalidateQueries({ queryKey: ['ventas'] })
      },
    )

    socket.on(
      SocketEvents.COMUNICACION_BAJA_RECHAZADA,
      (p: ComunicacionBajaEventPayload) => {
        const n = makeNotification(
          SocketEvents.COMUNICACION_BAJA_RECHAZADA,
          'Comunicación de baja rechazada',
          `${p.identificadorBaja} — ${p.motivo || 'Sin motivo'}`,
          `/comprobantes/${p.comprobanteId}`,
        )
        addNotification(n)
        toast.error(n.title, { description: n.description })
        queryClient.invalidateQueries({ queryKey: ['comprobantes'] })
        queryClient.invalidateQueries({
          queryKey: ['facturacion', 'comunicaciones-baja'],
        })
      },
    )

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [addNotification, queryClient])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return React.createElement(
    SocketContext.Provider,
    {
      value: {
        isConnected,
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        clearNotifications,
      },
    },
    children,
  )
}

// ── Hook ────────────────────────────────────────────────────────

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}

// ── Typed event hook for custom subscriptions ───────────────────

export function useSocketEvent<E extends keyof SocketEventMap>(
  _event: E,
  _callback: (payload: SocketEventMap[E]) => void,
) {
  // All standard events are handled in the provider.
  // This hook is a placeholder for future custom subscriptions.
}
