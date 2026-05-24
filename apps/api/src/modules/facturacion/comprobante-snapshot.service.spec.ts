import { ComprobanteSnapshotService } from './comprobante-snapshot.service';

describe('ComprobanteSnapshotService', () => {
  let service: ComprobanteSnapshotService;

  beforeEach(() => {
    service = new ComprobanteSnapshotService();
  });

  it('usa consumidor final para boleta sin DNI válido', () => {
    const snapshot = service.buildClienteSnapshot(
      {
        cliente: {
          nombre: null,
          apellido: null,
          razonSocial: null,
          dni: null,
          ruc: null,
          direccion: null,
        },
        detalles: [],
      },
      'BOLETA',
    );

    expect(snapshot).toEqual({
      clienteNombre: 'PUBLICO GENERAL',
      clienteDocTipo: '0',
      clienteDocNum: '00000000',
      clienteDireccion: null,
    });
  });

  it('usa DNI para boleta cuando el cliente tiene documento válido', () => {
    const snapshot = service.buildClienteSnapshot(
      {
        cliente: {
          nombre: 'Ana',
          apellido: 'Díaz',
          razonSocial: null,
          dni: '12345678',
          ruc: null,
          direccion: 'Av. Cliente 123',
        },
        detalles: [],
      },
      'BOLETA',
    );

    expect(snapshot).toEqual({
      clienteNombre: 'Ana Díaz',
      clienteDocTipo: '1',
      clienteDocNum: '12345678',
      clienteDireccion: 'Av. Cliente 123',
    });
  });

  it('normaliza unidad legacy UND a código SUNAT NIU para bienes', () => {
    const [detalle] = service.buildDetalleSnapshots(
      {
        cliente: {},
        detalles: [
          {
            productoId: 'producto-1',
            cantidad: 1,
            precioUnitario: 118,
            subtotal: 100,
            producto: {
              id: 'producto-1',
              sku: 'EQ-001',
              nombre: 'Equipo',
              descripcion: 'Equipo',
              tipo: 'EQUIPO',
              unidadMedida: { codigo: 'UND' },
            },
          },
        ],
      },
      18,
    );

    expect(detalle.unidadSunat).toBe('NIU');
  });

  it('normaliza unidades de servicio sin código SUNAT a ZZ', () => {
    const [detalle] = service.buildDetalleSnapshots(
      {
        cliente: {},
        detalles: [
          {
            productoId: 'servicio-1',
            cantidad: 1,
            precioUnitario: 118,
            subtotal: 100,
            producto: {
              id: 'servicio-1',
              sku: 'SRV-001',
              nombre: 'Diagnóstico',
              descripcion: 'Diagnóstico',
              tipo: 'SERVICIO',
              unidadMedida: { codigo: 'SERV' },
            },
          },
        ],
      },
      18,
    );

    expect(detalle.unidadSunat).toBe('ZZ');
  });
});
