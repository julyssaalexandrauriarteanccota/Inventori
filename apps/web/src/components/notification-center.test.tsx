import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SocketEvents } from '@erp/shared'

// Mock useSocket with controllable return value
const mockMarkAllRead = vi.fn()
const mockSocketValue = {
  isConnected: true,
  notifications: [] as Array<{
    id: string
    event: string
    title: string
    description: string
    href?: string
    read: boolean
    timestamp: Date
  }>,
  unreadCount: 0,
  markAllRead: mockMarkAllRead,
  markRead: vi.fn(),
  clearNotifications: vi.fn(),
}

vi.mock('@/hooks/use-socket', () => ({
  useSocket: () => mockSocketValue,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { NotificationCenter } from './notification-center'

describe('NotificationCenter', () => {
  beforeEach(() => {
    mockSocketValue.notifications = []
    mockSocketValue.unreadCount = 0
    vi.clearAllMocks()
  })

  it('renders bell icon button', () => {
    render(<NotificationCenter />)
    expect(
      screen.getByRole('button', { name: /notificaciones/i }),
    ).toBeInTheDocument()
  })

  it('shows no badge when unreadCount is 0', () => {
    render(<NotificationCenter />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows badge with unread count', () => {
    mockSocketValue.unreadCount = 3
    render(<NotificationCenter />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 9+ when unread count exceeds 9', () => {
    mockSocketValue.unreadCount = 15
    render(<NotificationCenter />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('shows empty state when no notifications', async () => {
    const user = userEvent.setup()
    render(<NotificationCenter />)
    await user.click(screen.getByRole('button', { name: /notificaciones/i }))
    expect(screen.getByText('Sin notificaciones')).toBeInTheDocument()
  })

  it('renders notification items when present', async () => {
    const user = userEvent.setup()
    mockSocketValue.unreadCount = 1
    mockSocketValue.notifications = [
      {
        id: 'n1',
        event: SocketEvents.TICKET_CREATED,
        title: 'Nuevo ticket creado',
        description: 'T-001 — Equipo no enciende',
        href: '/soporte',
        read: false,
        timestamp: new Date(),
      },
    ]

    render(<NotificationCenter />)
    await user.click(screen.getByRole('button', { name: /notificaciones/i }))

    expect(screen.getByText('Nuevo ticket creado')).toBeInTheDocument()
    expect(screen.getByText('T-001 — Equipo no enciende')).toBeInTheDocument()
  })

  it('shows "Marcar como leídas" button when there are unread notifications', async () => {
    const user = userEvent.setup()
    mockSocketValue.unreadCount = 2
    mockSocketValue.notifications = [
      {
        id: 'n1',
        event: SocketEvents.STOCK_ALERTA,
        title: 'Stock bajo',
        description: 'Insumo demo: 2/5',
        read: false,
        timestamp: new Date(),
      },
    ]

    render(<NotificationCenter />)
    await user.click(screen.getByRole('button', { name: /notificaciones/i }))

    const markBtn = screen.getByText('Marcar como leídas')
    expect(markBtn).toBeInTheDocument()

    await user.click(markBtn)
    expect(mockMarkAllRead).toHaveBeenCalled()
  })
})
