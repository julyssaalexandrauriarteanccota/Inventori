import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'

import { ServerDataTable } from './ServerDataTable'

interface Row {
  nombre: string
  email?: string
}

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
]

const visibilityColumns: ColumnDef<Row>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
]

describe('ServerDataTable', () => {
  it('muestra estado de error y permite reintentar', async () => {
    const retry = vi.fn()
    const user = userEvent.setup()

    render(
      <ServerDataTable
        columns={columns}
        data={[]}
        total={0}
        page={1}
        limit={20}
        isError
        errorMessage="Error de red"
        onRetry={retry}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText('No se pudo cargar la informacion')).toBeInTheDocument()
    expect(screen.getByText('Error de red')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Reintentar/i }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('persiste la visibilidad de columnas cuando se define una storage key', async () => {
    window.localStorage.clear()

    const user = userEvent.setup()
    const { unmount } = render(
      <ServerDataTable
        columns={visibilityColumns}
        data={[{ nombre: 'Acme', email: 'ventas@acme.test' }]}
        total={1}
        page={1}
        limit={20}
        onPageChange={vi.fn()}
        enableColumnVisibility
        columnVisibilityStorageKey="test:server-data-table:columns"
      />,
    )

    await user.click(screen.getByRole('button', { name: /Columnas/i }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Email/i }))

    await waitFor(() => {
      expect(window.localStorage.getItem('test:server-data-table:columns')).toContain('"email":false')
    })

    unmount()

    render(
      <ServerDataTable
        columns={visibilityColumns}
        data={[{ nombre: 'Acme', email: 'ventas@acme.test' }]}
        total={1}
        page={1}
        limit={20}
        onPageChange={vi.fn()}
        enableColumnVisibility
        columnVisibilityStorageKey="test:server-data-table:columns"
      />,
    )

    expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument()
  })
})
