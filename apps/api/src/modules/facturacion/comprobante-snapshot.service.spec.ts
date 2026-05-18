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
});
