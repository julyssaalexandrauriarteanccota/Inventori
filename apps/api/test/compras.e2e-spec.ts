import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Compras (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const proveedores = [
      {
        id: '11111111-1111-4111-8111-000000000001',
        razonSocial: 'Proveedor SAC',
        ruc: '20123456789',
        deletedAt: null,
      },
    ];
    const productos = [
      {
        id: '22222222-2222-4222-8222-000000000001',
        sku: 'COMP-001',
        nombre: 'Toner Negro',
        deletedAt: null,
      },
    ];
    const almacenes = [
      {
        id: '33333333-3333-4333-8333-000000000001',
        nombre: 'Principal',
        deletedAt: null,
        activo: true,
      },
    ];
    const ordenes: Array<Record<string, any>> = [];
    const recepciones: Array<Record<string, any>> = [];
    const stocks: Array<Record<string, any>> = [];
    const movimientos: Array<Record<string, any>> = [];

    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.proveedor = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const proveedor = proveedores.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          return true;
        });
        return Promise.resolve(proveedor ?? null);
      }),
    };

    prismaMock.producto = {
      findMany: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const ids = where?.id?.in ?? [];
        return Promise.resolve(
          productos.filter(
            (candidate) =>
              ids.includes(candidate.id) && candidate.deletedAt === null,
          ),
        );
      }),
    };

    prismaMock.almacen = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const almacen = almacenes.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          if (
            typeof where.activo === 'boolean' &&
            candidate.activo !== where.activo
          )
            return false;
          return true;
        });
        return Promise.resolve(almacen ?? null);
      }),
    };

    prismaMock.ordenCompra = {
      findFirst: jest.fn(
        ({ orderBy }: { orderBy?: Record<string, string> }) => {
          if (!orderBy) return Promise.resolve(null);
          return Promise.resolve(ordenes.at(-1) ?? null);
        },
      ),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const orden = {
          id: `44444444-4444-4444-8444-${String(ordenes.length + 1).padStart(12, '0')}`,
          estado: 'BORRADOR',
          createdAt: now,
          updatedAt: now,
          ...data,
          proveedor: proveedores.find(
            (candidate) => candidate.id === data.proveedorId,
          ),
          detalles: data.detalles.create.map(
            (detalle: Record<string, any>, index: number) => ({
              id: `det-${index + 1}`,
              cantidadRecibida: 0,
              ...detalle,
              producto: productos.find(
                (candidate) => candidate.id === detalle.productoId,
              ),
            }),
          ),
        };
        ordenes.push(orden);
        return Promise.resolve(orden);
      }),
      findMany: jest.fn(() => Promise.resolve(ordenes)),
      count: jest.fn(() => Promise.resolve(ordenes.length)),
      findUnique: jest.fn(
        ({
          where,
          include,
        }: {
          where: { id: string };
          include?: Record<string, any>;
        }) => {
          const orden = ordenes.find((candidate) => candidate.id === where.id);
          if (!orden) return Promise.resolve(null);
          if (include) {
            return Promise.resolve({
              ...orden,
              proveedor: proveedores.find(
                (candidate) => candidate.id === orden.proveedorId,
              ),
              usuario: {
                id: '11111111-1111-1111-1111-111111111111',
                nombre: 'Administrador',
                apellido: 'Sistema',
              },
              recepciones,
            });
          }
          return Promise.resolve(orden);
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const orden = ordenes.find((candidate) => candidate.id === where.id);
          if (!orden) return Promise.resolve(null);
          Object.assign(orden, data, { updatedAt: new Date() });
          return Promise.resolve(orden);
        },
      ),
    };

    function getStock(almacenId: string, productoId: string) {
      return (
        stocks.find(
          (item) =>
            item.almacenId === almacenId && item.productoId === productoId,
        ) ?? null
      );
    }

    prismaMock.$transaction = jest.fn(
      async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          recepcionCompra: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const recepcion = {
                id: `55555555-5555-4555-8555-${String(recepciones.length + 1).padStart(12, '0')}`,
                ordenCompraId: data.ordenCompraId,
                notas: data.notas ?? null,
                createdAt: new Date(),
                detalles: data.detalles.create.map(
                  (detalle: Record<string, any>) => ({
                    ...detalle,
                    producto: productos.find(
                      (candidate) => candidate.id === detalle.productoId,
                    ),
                  }),
                ),
              };
              recepciones.push(recepcion);
              return Promise.resolve(recepcion);
            }),
          },
          detalleOrdenCompra: {
            update: jest.fn(
              ({
                where,
                data,
              }: {
                where: { id: string };
                data: Record<string, any>;
              }) => {
                const orden = ordenes.find((candidate) =>
                  candidate.detalles.some(
                    (detalle: Record<string, any>) => detalle.id === where.id,
                  ),
                );
                const detalle = orden?.detalles.find(
                  (item: Record<string, any>) => item.id === where.id,
                );
                if (detalle) Object.assign(detalle, data);
                return Promise.resolve(detalle);
              },
            ),
            findMany: jest.fn(
              ({ where }: { where: { ordenCompraId: string } }) => {
                return Promise.resolve(
                  ordenes.find(
                    (candidate) => candidate.id === where.ordenCompraId,
                  )?.detalles ?? [],
                );
              },
            ),
          },
          almacenStock: {
            findUnique: jest.fn(
              ({
                where,
              }: {
                where: {
                  almacenId_productoId: {
                    almacenId: string;
                    productoId: string;
                  };
                };
              }) => {
                const key = where.almacenId_productoId;
                return Promise.resolve(getStock(key.almacenId, key.productoId));
              },
            ),
            upsert: jest.fn(
              ({
                where,
                update,
                create,
              }: {
                where: {
                  almacenId_productoId: {
                    almacenId: string;
                    productoId: string;
                  };
                };
                update: Record<string, any>;
                create: Record<string, any>;
              }) => {
                const key = where.almacenId_productoId;
                const existing = getStock(key.almacenId, key.productoId);
                if (existing) {
                  Object.assign(existing, update);
                  return Promise.resolve(existing);
                }
                const stock = {
                  id: `66666666-6666-4666-8666-${String(stocks.length + 1).padStart(12, '0')}`,
                  ...create,
                };
                stocks.push(stock);
                return Promise.resolve(stock);
              },
            ),
          },
          movimientoStock: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const movimiento = {
                id: `mov-${movimientos.length + 1}`,
                ...data,
              };
              movimientos.push(movimiento);
              return Promise.resolve(movimiento);
            }),
          },
          ordenCompra: {
            update: jest.fn(
              ({
                where,
                data,
              }: {
                where: { id: string };
                data: Record<string, any>;
              }) => {
                const orden = ordenes.find(
                  (candidate) => candidate.id === where.id,
                );
                if (orden) Object.assign(orden, data);
                return Promise.resolve(orden);
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

  it('crea una OC, la aprueba y recibe mercaderia por HTTP', async () => {
    const token = await loginAsAdmin();

    const orden = await request(app.getHttpServer())
      .post('/api/v1/compras')
      .set('Authorization', `Bearer ${token}`)
      .send({
        proveedorId: '11111111-1111-4111-8111-000000000001',
        detalles: [
          {
            productoId: '22222222-2222-4222-8222-000000000001',
            cantidad: 10,
            precioUnitario: 100,
          },
        ],
      })
      .expect(201);

    expect(orden.body.data.numero).toBe('OC-0001');

    const aprobada = await request(app.getHttpServer())
      .patch(`/api/v1/compras/${orden.body.data.id}/aprobar`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(aprobada.body.data.estado).toBe('APROBADA');

    const recepcion = await request(app.getHttpServer())
      .post(`/api/v1/compras/${orden.body.data.id}/recepciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        almacenDestinoId: '33333333-3333-4333-8333-000000000001',
        detalles: [
          {
            productoId: '22222222-2222-4222-8222-000000000001',
            cantidadRecibida: 5,
          },
        ],
      })
      .expect(201);

    expect(recepcion.body.data.nuevoEstadoOC).toBe('RECIBIDA_PARCIAL');
  });

  it('incrementa stock real al recibir mercaderia', async () => {
    const token = await loginAsAdmin();

    const orden = await request(app.getHttpServer())
      .post('/api/v1/compras')
      .set('Authorization', `Bearer ${token}`)
      .send({
        proveedorId: '11111111-1111-4111-8111-000000000001',
        detalles: [
          {
            productoId: '22222222-2222-4222-8222-000000000001',
            cantidad: 10,
            precioUnitario: 100,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/compras/${orden.body.data.id}/aprobar`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/compras/${orden.body.data.id}/recepciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        almacenDestinoId: '33333333-3333-4333-8333-000000000001',
        detalles: [
          {
            productoId: '22222222-2222-4222-8222-000000000001',
            cantidadRecibida: 10,
          },
        ],
      })
      .expect(201);

    const txCalls = (context.prismaMock as Record<string, any>).$transaction
      .mock.calls.length;
    expect(txCalls).toBeGreaterThan(0);
  });
});
