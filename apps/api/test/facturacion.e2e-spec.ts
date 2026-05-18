import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Facturacion (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const venta = {
      id: '11111111-1111-4111-8111-000000000001',
      numero: 'VTA-0001',
      estado: 'ORDEN_CONFIRMADA',
      subtotal: 100,
      total: 100,
      clienteId: 'cli-1',
      cliente: {
        id: 'cli-1',
        nombre: 'Cliente',
        apellido: 'Demo',
        razonSocial: 'Cliente SAC',
        ruc: '20987654326',
        dni: '12345678',
        direccion: 'Av. Demo 123',
      },
      detalles: [
        {
          id: 'det-1',
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: 100,
          subtotal: 100,
          producto: {
            id: 'prod-1',
            sku: 'SKU-001',
            nombre: 'Producto Demo',
            tipo: 'REPUESTO',
            unidadMedida: { codigo: 'NIU' },
          },
        },
      ],
    };

    const comprobantes: Array<Record<string, any>> = [];
    const configFiscal = {
      id: 'empresa-fiscal',
      ruc: '20123456789',
      razonSocial: 'ERP Demo SAC',
      nombreComercial: 'ERP Demo',
      direccionFiscal: 'Av. Fiscal 123',
      ubigeoFiscal: '150101',
      codigoEstablecimiento: '0000',
    };
    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.venta = {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(where.id === venta.id ? venta : null);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          if (where.id === venta.id) {
            Object.assign(venta, data);
          }
          return Promise.resolve(venta);
        },
      ),
    };

    prismaMock.comprobante = {
      findUnique: jest.fn(({ where }: { where: Record<string, string> }) => {
        if (where.ventaId) {
          return Promise.resolve(
            comprobantes.find(
              (candidate) => candidate.ventaId === where.ventaId,
            ) ?? null,
          );
        }
        if (where.id) {
          return Promise.resolve(
            comprobantes.find((candidate) => candidate.id === where.id) ?? null,
          );
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn(() => Promise.resolve(comprobantes)),
      count: jest.fn(() => Promise.resolve(comprobantes.length)),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const comprobante = comprobantes.find(
            (candidate) => candidate.id === where.id,
          );
          if (comprobante) Object.assign(comprobante, data);
          return Promise.resolve(comprobante);
        },
      ),
    };

    prismaMock.configEmpresa = {
      findFirst: jest.fn(() =>
        Promise.resolve({
          id: 'empresa',
          serieFactura: 'F001',
          serieBoleta: 'B001',
          correlativoFactura: 0,
          correlativoBoleta: 0,
          serieNotaCredito: 'FC01',
          serieNotaDebito: 'FD01',
          correlativoNotaCredito: 0,
          correlativoNotaDebito: 0,
          porcentajeIGV: 18,
          ruc: '20123456789',
          razonSocial: 'ERP Demo SAC',
          nombreComercial: 'ERP Demo',
          direccion: 'Av. Fiscal 123',
        }),
      ),
      update: jest.fn(),
    };

    prismaMock.configEmpresaFiscal = {
      findFirst: jest.fn(() => Promise.resolve(configFiscal)),
    };

    prismaMock.$transaction = jest.fn(
      async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          configEmpresa: {
            findFirst: prismaMock.configEmpresa.findFirst,
            update: jest.fn(),
          },
          configEmpresaFiscal: prismaMock.configEmpresaFiscal,
          serieDocumento: {
            findFirst: jest.fn(() => Promise.resolve(null)),
            update: jest.fn(),
          },
          comprobante: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const comprobante = {
                id: '22222222-2222-4222-8222-000000000001',
                createdAt: now,
                updatedAt: now,
                ...data,
              };
              comprobantes.push(comprobante);
              return Promise.resolve(comprobante);
            }),
          },
          comprobanteDetalle: {
            createMany: jest.fn(
              ({ data }: { data: Array<Record<string, any>> }) =>
                Promise.resolve({ count: data.length }),
            ),
          },
          venta: {
            update: jest.fn(
              ({
                where,
                data,
              }: {
                where: { id: string };
                data: Record<string, any>;
              }) => {
                if (where.id === venta.id) {
                  Object.assign(venta, data);
                }
                return Promise.resolve(venta);
              },
            ),
          },
        }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAsAdmin() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Admin123!',
      })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  it('emite comprobante y crea registro PENDIENTE', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .post('/api/v1/facturacion/emitir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ventaId: '11111111-1111-4111-8111-000000000001',
        tipo: 'FACTURA',
      })
      .expect(201);

    expect(response.body.data.estado).toBe('PENDIENTE_ENVIO');
    expect(context.sunatQueueMock.add).toHaveBeenCalled();
  });

  it('expone documento soporte de comprobante emitido', async () => {
    const token = await loginAsAdmin();

    await request(app.getHttpServer())
      .post('/api/v1/facturacion/emitir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ventaId: '11111111-1111-4111-8111-000000000001',
        tipo: 'FACTURA',
      })
      .expect(201);

    const prismaMock = context.prismaMock as Record<string, any>;
    const created = (prismaMock.comprobante.findUnique as jest.Mock).mock
      .results[1]?.value;
    void created;

    prismaMock.comprobante.findUnique = jest.fn(
      ({ where }: { where: Record<string, string> }) => {
        if (where.id === '22222222-2222-4222-8222-000000000001') {
          return Promise.resolve({
            id: '22222222-2222-4222-8222-000000000001',
            numero: 'F001-00000001',
            estado: 'PENDIENTE_ENVIO',
            hashSunat: null,
            hashCpe: null,
            xmlStorageKey: null,
            cdrStorageKey: null,
            pdfStorageKey: null,
          });
        }
        return Promise.resolve(null);
      },
    );

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/facturacion/comprobantes/22222222-2222-4222-8222-000000000001/pdf',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.numero).toBe('F001-00000001');
    expect(response.body.data.pdfUrl).toBeNull();
  });
});
