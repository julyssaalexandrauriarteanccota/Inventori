import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const submitMock = vi.fn()
const mocks = vi.hoisted(() => ({
  consultarDocumento: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { rol: 'ADMIN' } }),
}))

vi.mock('@/components/location/location-picker', () => ({
  LocationPicker: () => <div data-testid="location-picker" />,
}))

vi.mock('@/hooks/use-clientes', () => ({
  useConsultarDocumentoCliente: () => ({
    mutate: mocks.consultarDocumento,
    isPending: false,
  }),
}))

import { TipoCliente } from '@erp/shared'
import { ClienteForm } from './cliente-form'

describe('ClienteForm', () => {
  beforeEach(() => {
    submitMock.mockReset()
    mocks.consultarDocumento.mockReset()
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renderiza los campos de persona natural por defecto', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    expect(screen.getByPlaceholderText('Ej: Juan Carlos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: García López')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('12345678')).toBeInTheDocument()
    expect(screen.queryByTestId('location-picker')).not.toBeInTheDocument()
  })

  it('muestra el boton con texto "Crear cliente" en modo create', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} />)
    expect(screen.getByRole('button', { name: /Crear cliente/i })).toBeInTheDocument()
  })

  it('muestra el boton con texto "Guardar cambios" en modo edit', () => {
    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{ nombre: 'Juan', apellido: 'Perez', dni: '12345678' }}
      />,
    )
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('muestra errores de validacion si se envia vacio', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('button', { name: /Crear cliente/i }))

    await waitFor(() => {
      expect(submitMock).not.toHaveBeenCalled()
    })
  })

  it('permite escribir en los campos de texto', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    const nombreInput = screen.getByPlaceholderText('Ej: Juan Carlos')
    await user.type(nombreInput, 'Juan')
    expect(nombreInput).toHaveValue('Juan')

    const apellidoInput = screen.getByPlaceholderText('Ej: García López')
    await user.type(apellidoInput, 'Perez')
    expect(apellidoInput).toHaveValue('Perez')
  })

  it('carga valores por defecto en modo edit', () => {
    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          nombre: 'Maria',
          apellido: 'Lopez',
          dni: '87654321',
          email: 'maria@test.com',
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Ej: Juan Carlos')).toHaveValue('Maria')
    expect(screen.getByPlaceholderText('Ej: García López')).toHaveValue('Lopez')
    expect(screen.getByPlaceholderText('12345678')).toHaveValue('87654321')
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toHaveValue('maria@test.com')
  })

  it('deshabilita el boton cuando isLoading es true', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} isLoading />)
    expect(screen.getByRole('button', { name: /Creando/i })).toBeDisabled()
  })

  it('usa Puno como ubigeo por defecto en modo create', () => {
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    expect(screen.getByRole('combobox', { name: 'Departamento' })).toHaveTextContent('Puno')
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveTextContent('Puno')
    expect(screen.getByRole('combobox', { name: 'Distrito' })).toHaveTextContent('Puno')
  })

  it('limpia provincia y distrito cuando cambia el departamento', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('combobox', { name: 'Departamento' }))
    await user.click(screen.getByRole('option', { name: 'Lima' }))

    expect(screen.getByRole('combobox', { name: 'Departamento' })).toHaveTextContent('Lima')
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveTextContent('Seleccionar provincia')
    expect(screen.getByRole('combobox', { name: 'Distrito' })).toHaveTextContent('Seleccionar distrito')
  })

  it('muestra el bloque de mapa solo cuando se activa el boton', async () => {
    const user = userEvent.setup()
    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.click(screen.getByRole('button', { name: /Mapa y coordenadas/i }))

    expect(screen.getByTestId('location-picker')).toBeInTheDocument()
  })

  it('consulta DNI y rellena nombre y apellido', async () => {
    const user = userEvent.setup()
    mocks.consultarDocumento.mockImplementation(
      (
        _payload: unknown,
        options: { onSuccess: (response: unknown) => void },
      ) => {
        options.onSuccess({
          data: {
            tipoDocumento: 'DNI',
            tipoDocumentoSunat: '1',
            numeroDocumento: '12345678',
            proveedor: 'DECOLECTA',
            consultadoAt: '2026-05-22T00:00:00.000Z',
            nombres: 'JUAN CARLOS',
            apellidoPaterno: 'PEREZ',
            apellidoMaterno: 'ROJAS',
            estado: 'VALIDO',
          },
        })
      },
    )

    render(<ClienteForm mode="create" onSubmit={submitMock} />)

    await user.type(screen.getByPlaceholderText('12345678'), '12345678')
    await user.click(screen.getByRole('button', { name: /Consultar DNI/i }))

    expect(mocks.consultarDocumento).toHaveBeenCalledWith(
      { tipoDocumento: 'DNI', numeroDocumento: '12345678', modo: 'AUTO' },
      expect.any(Object),
    )
    expect(screen.getByPlaceholderText('Ej: Juan Carlos')).toHaveValue(
      'JUAN CARLOS',
    )
    expect(screen.getByPlaceholderText('Ej: García López')).toHaveValue(
      'PEREZ ROJAS',
    )
  })

  it('consulta RUC y rellena ubicacion operativa con ubigeo', async () => {
    const user = userEvent.setup()
    mocks.consultarDocumento.mockImplementation(
      (
        _payload: unknown,
        options: { onSuccess: (response: unknown) => void },
      ) => {
        options.onSuccess({
          data: {
            tipoDocumento: 'RUC',
            tipoDocumentoSunat: '6',
            numeroDocumento: '20514492825',
            proveedor: 'DECOLECTA',
            consultadoAt: '2026-05-22T00:00:00.000Z',
            razonSocial: 'GLOBANT PERU S.A.C.',
            direccion: 'AV. REPUBLICA DE PANAMA NRO 3591 URB. LIMATAMBO',
            departamento: 'LIMA',
            provincia: 'LIMA',
            distrito: 'SAN ISIDRO',
            ubigeo: '150131',
            estado: 'ACTIVO',
            condicionDomicilio: 'HABIDO',
          },
        })
      },
    )

    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          tipo: TipoCliente.EMPRESA,
          razonSocial: 'Cliente sin validar',
          ruc: '20514492825',
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Buscar RUC en padrón/i }))

    expect(mocks.consultarDocumento).toHaveBeenCalledWith(
      { tipoDocumento: 'RUC', numeroDocumento: '20514492825', modo: 'LOCAL_ONLY' },
      expect.any(Object),
    )
    expect(screen.getByPlaceholderText('Ej: Soluciones Digitales S.A.C.')).toHaveValue(
      'GLOBANT PERU S.A.C.',
    )
    expect(screen.getByPlaceholderText('Av. Principal 123, Of. 401')).toHaveValue(
      'AV. REPUBLICA DE PANAMA NRO 3591 URB. LIMATAMBO',
    )
    expect(screen.getByRole('combobox', { name: 'Departamento' })).toHaveTextContent('Lima')
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveTextContent('Lima')
    expect(screen.getByRole('combobox', { name: 'Distrito' })).toHaveTextContent('San Isidro')
    expect(screen.getByLabelText('Ubigeo operativo')).toHaveValue('150131')
  })

  it('habilita consulta externa solo si el RUC no esta en padron local', async () => {
    const user = userEvent.setup()
    mocks.consultarDocumento
      .mockImplementationOnce(
        (
          _payload: unknown,
          options: { onError: (error: Error) => void },
        ) => {
          options.onError(new Error('RUC no encontrado en padrón SUNAT local'))
        },
      )
      .mockImplementationOnce(
        (
          _payload: unknown,
          options: { onSuccess: (response: unknown) => void },
        ) => {
          options.onSuccess({
            data: {
              tipoDocumento: 'RUC',
              tipoDocumentoSunat: '6',
              numeroDocumento: '20514492825',
              proveedor: 'APISPERU',
              consultadoAt: '2026-05-22T00:00:00.000Z',
              razonSocial: 'GLOBANT PERU S.A.C.',
              estado: 'ACTIVO',
            },
          })
        },
      )

    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          tipo: TipoCliente.EMPRESA,
          razonSocial: 'Cliente sin validar',
          ruc: '20514492825',
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Buscar RUC en padrón/i }))
    await user.click(screen.getByRole('button', { name: /Consultar RUC en API externa/i }))

    expect(mocks.consultarDocumento).toHaveBeenLastCalledWith(
      { tipoDocumento: 'RUC', numeroDocumento: '20514492825', modo: 'EXTERNAL_ONLY' },
      expect.any(Object),
    )
  })

  it('muestra validacion fiscal guardada al editar cliente', () => {
    render(
      <ClienteForm
        mode="edit"
        onSubmit={submitMock}
        defaultValues={{
          tipo: TipoCliente.EMPRESA,
          razonSocial: 'GLOBANT PERU S.A.C.',
          ruc: '20514492825',
        }}
        validacionFiscal={{
          id: '77777777-7777-4777-8777-000000000001',
          tipoDocumentoSunat: '6',
          numeroDocumento: '20514492825',
          proveedor: 'SUNAT_PADRON_LOCAL',
          nombreNormalizado: 'GLOBANT PERU S.A.C.',
          direccionFiscal: 'AV. REPUBLICA DE PANAMA NRO 3591',
          ubigeo: '150131',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'SAN ISIDRO',
          estado: 'ACTIVO',
          condicionDomicilio: 'HABIDO',
          ultimaValidacionAt: '2026-05-22T20:11:00.000Z',
        }}
      />,
    )

    expect(screen.getByText(/Datos fiscales consultados con Padrón SUNAT local/i)).toBeInTheDocument()
    expect(screen.getByText('Estado: ACTIVO')).toBeInTheDocument()
    expect(screen.getByText('Condición: HABIDO')).toBeInTheDocument()
    expect(screen.getByText('AV. REPUBLICA DE PANAMA NRO 3591')).toBeInTheDocument()
    expect(screen.getByText(/SAN ISIDRO \/ LIMA \/ LIMA/i)).toBeInTheDocument()
    expect(screen.getByText(/Ubigeo 150131/i)).toBeInTheDocument()
  })
})
