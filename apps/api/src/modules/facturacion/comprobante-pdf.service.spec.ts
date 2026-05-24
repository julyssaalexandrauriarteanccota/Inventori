import {
  ComprobantePdfService,
  ComprobantePdfInput,
} from './comprobante-pdf.service';

describe('ComprobantePdfService — Doc 09 §6 (QR SUNAT)', () => {
  const service = new ComprobantePdfService();

  const baseInput: ComprobantePdfInput = {
    numero: 'F001-00000123',
    tipo: 'FACTURA',
    serie: 'F001',
    correlativo: 123,
    fechaEmision: new Date('2026-05-09T14:30:00'),
    emisorRuc: '20123456789',
    emisorRazonSocial: 'MI EMPRESA SAC',
    emisorDireccion: 'Av. Emisor 123',
    clienteDocTipo: '6',
    clienteDocNum: '20987654321',
    clienteNombre: 'CLIENTE SAC',
    subtotal: 200,
    igv: 36,
    total: 236,
    estado: 'ACEPTADO',
    hashFirma: 'a1b2c3d4',
    detalles: [
      {
        item: 1,
        descripcion: 'Producto ejemplo',
        cantidad: 2,
        precioUnitario: 100,
        total: 200,
      },
    ],
  };

  it('arma el payload del QR con todos los campos requeridos', () => {
    const payload = service.buildQrPayload(baseInput);
    expect(payload).toBe(
      '20123456789|01|F001|00000123|36.00|236.00|2026-05-09|6|20987654321|a1b2c3d4',
    );
  });

  it('mapea tipos de documento al código SUNAT', () => {
    expect(service.buildQrPayload({ ...baseInput, tipo: 'BOLETA' })).toMatch(
      /\|03\|/,
    );
    expect(
      service.buildQrPayload({ ...baseInput, tipo: 'NOTA_CREDITO' }),
    ).toMatch(/\|07\|/);
    expect(
      service.buildQrPayload({ ...baseInput, tipo: 'NOTA_DEBITO' }),
    ).toMatch(/\|08\|/);
  });

  it('admite hashFirma vacío sin romper el payload', () => {
    const payload = service.buildQrPayload({ ...baseInput, hashFirma: null });
    expect(payload.endsWith('|')).toBe(true);
  });

  it('renderiza un PDF no vacío con QR y hash', async () => {
    const buf = await service.render(baseInput);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  }, 15000);
});
