import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ── Mocks ──

const mockCatalogo = vi.fn()
const mockCategorias = vi.fn()
const mockMarcas = vi.fn()

vi.mock('@/hooks/use-public', () => ({
  useCatalogoPublico: (...args: unknown[]) => mockCatalogo(...args),
  useCategoriasPublicas: () => mockCategorias(),
  useMarcasPublicas: () => mockMarcas(),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

import { CatalogoContent } from './catalogo-content'

const sampleProducts = [
  {
    id: '1',
    nombre: 'Equipo portátil empresarial',
    modelo: 'PRO-14',
    sku: 'EQ-PRO14',
    precioVenta: 1500,
    descripcion: 'Equipo profesional para operaciones comerciales',
    categoria: { nombre: 'Equipos' },
    marca: { nombre: 'Marca Demo' },
    esConsumible: false,
  },
  {
    id: '2',
    nombre: 'Accesorio compatible',
    modelo: 'ACC-100',
    sku: 'ACC100',
    precioVenta: 120,
    descripcion: null,
    categoria: { nombre: 'Accesorios' },
    marca: { nombre: 'Genérico' },
    esConsumible: true,
  },
]

function setupMocks(overrides?: {
  loading?: boolean
  empty?: boolean
  totalPages?: number
}) {
  const loading = overrides?.loading ?? false
  const empty = overrides?.empty ?? false
  const totalPages = overrides?.totalPages ?? 1

  mockCatalogo.mockReturnValue({
    data: loading
      ? undefined
      : {
          data: empty ? [] : sampleProducts,
          meta: { page: 1, limit: 12, total: empty ? 0 : totalPages * 12 },
        },
    isLoading: loading,
  })

  mockCategorias.mockReturnValue({
    data: {
      data: [{ id: 'c1', nombre: 'Equipos', parentId: null, children: [] }],
      meta: {},
    },
  })

  mockMarcas.mockReturnValue({
    data: {
      data: [{ id: 'm1', nombre: 'Marca Demo', descripcion: null }],
      meta: {},
    },
  })
}

describe('CatalogoContent', () => {
  it('renderiza campo de búsqueda y filtros', () => {
    setupMocks()
    render(<CatalogoContent />)

    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument()
  })

  it('muestra skeleton cuando está cargando', () => {
    setupMocks({ loading: true })
    const { container } = render(<CatalogoContent />)

    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-slot="skeleton"]',
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renderiza tarjetas de productos con nombre y precio', () => {
    setupMocks()
    render(<CatalogoContent />)

    expect(screen.getByText('Equipo portátil empresarial')).toBeInTheDocument()
    expect(screen.getByText('Accesorio compatible')).toBeInTheDocument()
    expect(screen.getByText(/1500\.00/)).toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay resultados', () => {
    setupMocks({ empty: true })
    render(<CatalogoContent />)

    expect(screen.getByText(/no se encontraron productos/i)).toBeInTheDocument()
  })

  it('muestra botones de paginación con estado correcto', () => {
    setupMocks({ totalPages: 3 })
    render(<CatalogoContent />)

    const prevBtn = screen.getByRole('button', { name: /anterior/i })
    const nextBtn = screen.getByRole('button', { name: /siguiente/i })

    expect(prevBtn).toBeDisabled()
    expect(nextBtn).not.toBeDisabled()
  })
})
