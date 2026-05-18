import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const { toasterMock } = vi.hoisted(() => ({
  toasterMock: vi.fn(),
}))

vi.mock('@/components/ui/sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    toasterMock(props)
    return <div data-testid="global-toaster" />
  },
}))

vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}))

import { Providers } from '@/components/providers'

describe('Providers', () => {
  beforeEach(() => {
    toasterMock.mockClear()
  })

  it('configura toasts compactos y expandidos para evitar solapes', () => {
    render(
      <Providers>
        <div>Contenido protegido</div>
      </Providers>,
    )

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    expect(screen.getByTestId('global-toaster')).toBeInTheDocument()
    expect(toasterMock).toHaveBeenCalled()

    const props = toasterMock.mock.calls.at(-1)?.[0] as {
      expand: boolean
      visibleToasts: number
      offset: { bottom: number; right: number }
      mobileOffset: { bottom: number; left: number; right: number }
      toastOptions: {
        classNames: Record<string, string>
      }
    }

    expect(props.expand).toBe(true)
    expect(props.visibleToasts).toBe(3)
    expect(props.offset).toEqual({ bottom: 20, right: 20 })
    expect(props.mobileOffset).toEqual({ bottom: 16, left: 16, right: 16 })
    expect(props.toastOptions.classNames.toast).toContain('bg-card')
    expect(props.toastOptions.classNames.toast).toContain('sm:w-[22rem]')
  })
})
