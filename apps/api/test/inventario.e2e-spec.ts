import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Inventario (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const almacenes: Array<Record<string, any>> = [];
    const productos = [
      {
        id: '77777777-7777-4777-8777-000000000001',
        sku: 'INV-001',
        nombre: 'Producto Inventario',
        stockMinimo: 5,
        tipo: 'BIEN',
        manejaInventario: true,
        unidadMedida: 'UND',
        deletedAt: null,
      },
    ];
    const stocks: Array<Record<string, any>> = [];
    const movimientos: Array<Record<string, any>> = [];
    const alertas: Array<Record<string, any>> = [];
    const adjuntos: Array<Record<string, any>> = [];
    const tiposMovimientoConfig: Record<string, Record<string, any>> = {
      AJUSTE_POSITIVO: {
        codigo: 'AJUSTE_POSITIVO',
        activo: true,
        disponibleTecnico: false,
        comportamiento: 'ENTRADA',
        requiereJustificacion: true,
        requiereEvidencia: false,
      },
      AJUSTE_NEGATIVO: {
        codigo: 'AJUSTE_NEGATIVO',
        activo: true,
        disponibleTecnico: false,
        comportamiento: 'SALIDA',
        requiereJustificacion: true,
        requiereEvidencia: false,
      },
    };

    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.tipoMovimientoConfig = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        if (!where?.codigo || where.activo !== true) {
          return Promise.resolve(null);
        }

        return Promise.resolve(
          tiposMovimientoConfig[String(where.codigo)] ?? null,
        );
      }),
    };

    prismaMock.producto = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const producto = productos.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          return true;
        });
        return Promise.resolve(producto ?? null);
      }),
    };

    prismaMock.almacen = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const almacen = almacenes.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.nombre && candidate.nombre !== where.nombre) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          if (where.id?.not && candidate.id === where.id.not) return false;
          return true;
        });
        return Promise.resolve(almacen ?? null);
      }),
      findMany: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const filtered = almacenes.filter((candidate) => {
          if (!where) return true;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          return true;
        });
        return Promise.resolve(filtered);
      }),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const almacen = {
          id: `88888888-8888-4888-8888-${String(almacenes.length + 1).padStart(12, '0')}`,
          nombre: data.nombre,
          descripcion: data.descripcion ?? null,
          direccion: data.direccion ?? null,
          esPrincipal: data.esPrincipal ?? false,
          activo: data.activo ?? true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        if (almacen.esPrincipal) {
          for (const item of almacenes) item.esPrincipal = false;
        }
        almacenes.push(almacen);
        return Promise.resolve(almacen);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const almacen = almacenes.find(
            (candidate) => candidate.id === where.id,
          );
          if (!almacen) return Promise.resolve(null);
          Object.assign(almacen, data, { updatedAt: new Date() });
          return Promise.resolve(almacen);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where?: Record<string, any>;
          data: Record<string, any>;
        }) => {
          let count = 0;
          for (const almacen of almacenes) {
            if (where?.esPrincipal === true && almacen.esPrincipal !== true)
              continue;
            if (where?.deletedAt === null && almacen.deletedAt !== null)
              continue;
            if (where?.id?.not && almacen.id === where.id.not) continue;
            Object.assign(almacen, data);
            count += 1;
          }
          return Promise.resolve({ count });
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

    prismaMock.almacenStock = {
      findUnique: jest.fn(
        ({
          where,
        }: {
          where: {
            almacenId_productoId: { almacenId: string; productoId: string };
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
            almacenId_productoId: { almacenId: string; productoId: string };
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
            id: `99999999-9999-4999-8999-${String(stocks.length + 1).padStart(12, '0')}`,
            ubicacion: null,
            updatedAt: new Date(),
            ...create,
          };
          stocks.push(stock);
          return Promise.resolve(stock);
        },
      ),
      findMany: jest.fn(
        ({
          where,
          skip = 0,
          take = 20,
          include,
        }: {
          where?: Record<string, any>;
          skip?: number;
          take?: number;
          include?: Record<string, any>;
        }) => {
          let filtered = stocks.filter((item) => {
            if (!where) return true;
            if (where.almacenId && item.almacenId !== where.almacenId)
              return false;
            if (where.productoId && item.productoId !== where.productoId)
              return false;
            if (where.almacen?.deletedAt === null) {
              const almacen = almacenes.find(
                (candidate) => candidate.id === item.almacenId,
              );
              if (!almacen || almacen.deletedAt !== null) return false;
            }
            return true;
          });

          if (where?.producto?.OR) {
            const search = String(
              (Object.values(where.producto.OR[0])[0] as any).contains,
            ).toLowerCase();
            filtered = filtered.filter((item) => {
              const producto = productos.find(
                (candidate) => candidate.id === item.productoId,
              );
              return (
                producto &&
                [producto.nombre, producto.sku].some((value) =>
                  value.toLowerCase().includes(search),
                )
              );
            });
          }

          return Promise.resolve(
            filtered.slice(skip, skip + take).map((item) => ({
              ...item,
              producto: include?.producto
                ? productos.find(
                    (candidate) => candidate.id === item.productoId,
                  )
                : undefined,
              almacen: include?.almacen
                ? almacenes.find((candidate) => candidate.id === item.almacenId)
                : undefined,
            })),
          );
        },
      ),
      count: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const filtered = stocks.filter((item) => {
          if (!where) return true;
          if (where.almacenId && item.almacenId !== where.almacenId)
            return false;
          if (where.productoId && item.productoId !== where.productoId)
            return false;
          return true;
        });
        return Promise.resolve(filtered.length);
      }),
    };

    prismaMock.movimientoStock = {
      create: jest.fn(),
      findMany: jest.fn(() => Promise.resolve(movimientos)),
      count: jest.fn(() => Promise.resolve(movimientos.length)),
    };

    prismaMock.alertaStock = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const alerta = alertas.find((candidate) => {
          if (!where) return false;
          if (where.productoId && candidate.productoId !== where.productoId)
            return false;
          if (where.almacenId && candidate.almacenId !== where.almacenId)
            return false;
          if (
            typeof where.resuelta === 'boolean' &&
            candidate.resuelta !== where.resuelta
          )
            return false;
          return true;
        });
        return Promise.resolve(alerta ?? null);
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(
          alertas.find((candidate) => candidate.id === where.id) ?? null,
        );
      }),
      findMany: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const filtered = alertas
          .filter((candidate) => {
            if (!where) return true;
            if (
              typeof where.resuelta === 'boolean' &&
              candidate.resuelta !== where.resuelta
            )
              return false;
            return true;
          })
          .map((alerta) => ({
            ...alerta,
            producto: productos.find(
              (candidate) => candidate.id === alerta.productoId,
            ),
            almacen: almacenes.find(
              (candidate) => candidate.id === alerta.almacenId,
            ),
            resueltaPor: null,
          }));
        return Promise.resolve(filtered);
      }),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const alerta = {
          id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(alertas.length + 1).padStart(12, '0')}`,
          createdAt: new Date(),
          resuelta: false,
          resueltaPorId: null,
          resolvedAt: null,
          ...data,
        };
        alertas.push(alerta);
        return Promise.resolve(alerta);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const alerta = alertas.find((candidate) => candidate.id === where.id);
          if (!alerta) return Promise.resolve(null);
          Object.assign(alerta, data);
          return Promise.resolve(alerta);
        },
      ),
    };

    prismaMock.adjunto = {
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const adjunto = {
          id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(adjuntos.length + 1).padStart(12, '0')}`,
          createdAt: new Date(),
          tamano: null,
          ...data,
        };
        adjuntos.push(adjunto);
        return Promise.resolve(adjunto);
      }),
    };

    prismaMock.$transaction = jest.fn(
      async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          almacenStock: prismaMock.almacenStock,
          movimientoStock: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const movimiento = {
                id: `cccccccc-cccc-4ccc-8ccc-${String(movimientos.length + 1).padStart(12, '0')}`,
                createdAt: new Date(),
                ...data,
                producto: productos.find(
                  (candidate) => candidate.id === data.productoId,
                ),
              };
              movimientos.push(movimiento);
              return Promise.resolve(movimiento);
            }),
          },
          alertaStock: prismaMock.alertaStock,
          adjunto: prismaMock.adjunto,
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

  it('registra movimiento y actualiza stock por HTTP', async () => {
    const token = await loginAsAdmin();

    const almacen = await request(app.getHttpServer())
      .post('/api/v1/inventario/almacenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Principal', esPrincipal: true })
      .expect(201);

    const movimiento = await request(app.getHttpServer())
      .post('/api/v1/inventario/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'AJUSTE_POSITIVO',
        productoId: '77777777-7777-4777-8777-000000000001',
        almacenDestinoId: almacen.body.data.id,
        cantidad: 10,
        justificacion: 'Carga inicial validada',
      })
      .expect(201);

    expect(movimiento.body.data.cantidadPosterior).toBe(10);

    const stock = await request(app.getHttpServer())
      .get(
        '/api/v1/inventario/stock?productoId=77777777-7777-4777-8777-000000000001',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(stock.body.data).toHaveLength(1);
    expect(stock.body.data[0].cantidad).toBe(10);
  });

  it('genera alerta por stock minimo y la lista por HTTP', async () => {
    const token = await loginAsAdmin();

    const almacen = await request(app.getHttpServer())
      .post('/api/v1/inventario/almacenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Secundario' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventario/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'AJUSTE_POSITIVO',
        productoId: '77777777-7777-4777-8777-000000000001',
        almacenDestinoId: almacen.body.data.id,
        cantidad: 6,
        justificacion: 'Ingreso validado',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventario/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'AJUSTE_NEGATIVO',
        productoId: '77777777-7777-4777-8777-000000000001',
        almacenOrigenId: almacen.body.data.id,
        cantidad: 2,
        justificacion: 'Salida por merma controlada',
      })
      .expect(201);

    const alertas = await request(app.getHttpServer())
      .get('/api/v1/inventario/alertas?resuelta=false')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(alertas.body.data).toHaveLength(1);
    expect(alertas.body.data[0].stockActual).toBe(4);

    const stockBajo = await request(app.getHttpServer())
      .get('/api/v1/inventario/stock?stockBajo=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(stockBajo.body.data).toHaveLength(1);
    expect(stockBajo.body.meta.total).toBe(1);
  });
});
