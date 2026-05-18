import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const submitMock = vi.fn()

vi.mock('@/hooks/use-productos', () => ({
  useCategorias: () => ({
    data: {
      data: [
        { id: 'cat-1', nombre: 'Equipos' },
        { id: 'cat-2', nombre: 'Componentes' },
      ],
    },
  }),
  useMarcas: () => ({
    data: {
      data: [
        { id: 'marca-1', nombre: 'Marca Demo', tipos: ['EQUIPO', 'REPUESTO'] },
        { id: 'marca-2', nombre: 'Marca Alterna', tipos: ['EQUIPO'] },
      ],
    },
  }),
  useModelosCatalogo: () => ({
    data: {
      data: [
        {
          id: 'modelo-1',
          nombre: 'Modelo Pro 14',
          tipo: 'EQUIPO',
          activo: true,
          marca: { id: 'marca-1', nombre: 'Marca Demo' },
        },
      ],
    },
  }),
  useCreateModeloCatalogo: () => ({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({
      data: {
        id: 'modelo-1',
        nombre: 'Modelo Pro 14',
        tipo: 'EQUIPO',
        activo: true,
        marca: { id: 'marca-1', nombre: 'Marca Demo' },
      },
    }),
  }),
  useCreateMarca: () => ({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({
      data: {
        id: 'marca-3',
        nombre: 'Nueva Marca',
        tipos: ['EQUIPO'],
      },
    }),
  }),
  useCreateUnidadMedida: () => ({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({
      data: {
        id: 'unidad-3',
        codigo: 'KIT',
        nombre: 'Kit',
        activo: true,
      },
    }),
  }),
  useUnidadesMedida: () => ({
    data: {
      data: [
        {
          id: 'unidad-1',
          codigo: 'UND',
          nombre: 'Unidad',
          descripcion: null,
          activo: true,
        },
        {
          id: 'unidad-2',
          codigo: 'KG',
          nombre: 'Kilogramo',
          descripcion: null,
          activo: true,
        },
      ],
    },
  }),
  useNextProductoSku: () => ({
    data: { data: { sku: 'SKU-0001' } },
  }),
}))

vi.mock('@/hooks/use-inventario', () => ({
  useAlmacenes: () => ({
    data: { data: [] },
  }),
}))

import { ProductoForm } from './producto-form'

describe('ProductoForm', () => {
  beforeEach(() => {
    submitMock.mockReset()
  })

  it('renderiza los campos principales del producto', () => {
    render(<ProductoForm mode="create" onSubmit={submitMock} />)

    expect(screen.getByPlaceholderText('Auto: SKU-0001')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Nombre del producto'),
    ).toBeInTheDocument()
  })

  it('muestra "Crear registro" en modo create', () => {
    render(<ProductoForm mode="create" onSubmit={submitMock} />)
    expect(
      screen.getByRole('button', { name: /Crear registro/i }),
    ).toBeInTheDocument()
  })

  it('muestra "Guardar cambios" en modo edit', () => {
    render(
      <ProductoForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          sku: 'P-001',
          nombre: 'Producto demo',
          categoriaId: 'cat-1',
        }}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Guardar cambios/i }),
    ).toBeInTheDocument()
  })

  it('no envia si faltan campos requeridos', async () => {
    const user = userEvent.setup()
    render(<ProductoForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('button', { name: /Crear registro/i }))

    await waitFor(() => {
      expect(submitMock).not.toHaveBeenCalled()
    })
  })

  it('carga valores por defecto en modo edit', () => {
    render(
      <ProductoForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          sku: 'SKU-100',
          nombre: 'Equipo Pro 14',
          modelo: 'PRO-14',
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Auto: SKU-0001')).toHaveValue('SKU-100')
    expect(screen.getByPlaceholderText('Nombre del producto')).toHaveValue(
      'Equipo Pro 14',
    )
  })

  it('deshabilita el boton cuando isLoading es true', () => {
    render(<ProductoForm mode="create" onSubmit={submitMock} isLoading />)
    expect(screen.getByRole('button', { name: /Creando/i })).toBeDisabled()
  })
})
