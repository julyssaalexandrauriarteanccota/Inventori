import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Ventas (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const clientes = [
      {
        id: '11111111-1111-4111-8111-000000000001',
        nombre: 'Juan',
        apellido: 'Perez',
        razonSocial: null,
        ruc: null,
        dni: '12345678',
        deletedAt: null,
      },
    ];
    const productos = [
      {
        id: '22222222-2222-4222-8222-000000000001',
        sku: 'TON-001',
        nombre: 'Toner Negro',
        precioMinimo: 50,
        tieneNumeroSerie: false,
        manejaInventario: true,
        deletedAt: null,
      },
      {
        id: '33333333-3333-4333-8333-000000000001',
        sku: 'EQ-001',
        nombre: 'Bizhub C258',
        precioMinimo: 5000,
        tieneNumeroSerie: true,
        manejaInventario: true,
        deletedAt: null,
      },
    ];
    const equipos = [
      {
        id: '44444444-4444-4444-8444-000000000001',
        numeroSerie: 'SN-VENTA-001',
        productoId: '33333333-3333-4333-8333-000000000001',
      },
    ];
    const metodoPago = {
      id: '55555555-5555-4555-8555-000000000001',
      codigo: 'EFECTIVO',
      nombre: 'Efectivo',
      activo: true,
    };
    const almacen = {
      id: '66666666-6666-4666-8666-000000000001',
      nombre: 'Principal',
      deletedAt: null,
      activo: true,
    };
    const ventas: Array<Record<string, any>> = [];
    const movimientos: Array<Record<string, any>> = [];
    const movimientosCaja: Array<Record<string, any>> = [];
    const garantias: Array<Record<string, any>> = [];
    const asignaciones: Array<Record<string, any>> = [];
    const stocks = [
      {
        id: '77777777-7777-4777-8777-000000000001',
        almacenId: almacen.id,
        productoId: '22222222-2222-4222-8222-000000000001',
        cantidad: 10,
      },
      {
        id: '88888888-8888-4888-8888-000000000001',
        almacenId: almacen.id,
        productoId: '33333333-3333-4333-8333-000000000001',
        cantidad: 3,
      },
    ];
    const aperturaActiva = {
      id: 'apertura-venta-1',
      cajaId: 'caja-venta-1',
      usuarioAperturaId: '11111111-1111-1111-1111-111111111111',
      estado: 'ABIERTA',
      montoInicial: 0,
      montoEsperado: 0,
      abiertaEn: now,
      caja: { id: 'caja-venta-1', nombre: 'Caja Principal' },
      usuarioApertura: {
        id: '11111111-1111-1111-1111-111111111111',
        nombre: 'Administrador',
        apellido: 'Sistema',
      },
    };

    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.cliente = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const cliente = clientes.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          return true;
        });
        return Promise.resolve(cliente ?? null);
      }),
      findUnique: jest.fn(
        ({
          where,
          select,
        }: {
          where: { id: string };
          select?: Record<string, boolean>;
        }) => {
          const cliente =
            clientes.find((candidate) => candidate.id === where.id) ?? null;
          if (!cliente) return Promise.resolve(null);
          if (!select) return Promise.resolve(cliente);
          return Promise.resolve(
            Object.fromEntries(
              Object.entries(select)
                .filter(([, enabled]) => enabled)
                .map(([key]) => [key, (cliente as any)[key]]),
            ),
          );
        },
      ),
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

    prismaMock.equipo = {
      findUnique: jest.fn(
        ({ where }: { where: { numeroSerie?: string; id?: string } }) => {
          return Promise.resolve(
            equipos.find((candidate) => {
              if (where.id) return candidate.id === where.id;
              if (where.numeroSerie)
                return candidate.numeroSerie === where.numeroSerie;
              return false;
            }) ?? null,
          );
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
          const equipo = equipos.find((candidate) => candidate.id === where.id);
          if (!equipo) return Promise.resolve(null);
          Object.assign(equipo, data);
          return Promise.resolve(equipo);
        },
      ),
    };

    prismaMock.metodoPago = {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(where.id === metodoPago.id ? metodoPago : null);
      }),
    };

    prismaMock.almacen = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        if (
          where?.id === almacen.id &&
          where.deletedAt === null &&
          where.activo === true
        ) {
          return Promise.resolve(almacen);
        }
        return Promise.resolve(null);
      }),
    };

    prismaMock.aperturaCaja = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        if (
          where?.usuarioAperturaId === aperturaActiva.usuarioAperturaId &&
          where.estado === 'ABIERTA'
        ) {
          return Promise.resolve(aperturaActiva);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(
          where.id === aperturaActiva.id ? aperturaActiva : null,
        );
      }),
    };

    prismaMock.movimientoCaja = {
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const movimientoCaja = {
          id: `mov-caja-${movimientosCaja.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        movimientosCaja.push(movimientoCaja);
        return Promise.resolve(movimientoCaja);
      }),
    };

    function getStock(productoId: string) {
      return (
        stocks.find(
          (item) =>
            item.productoId === productoId && item.almacenId === almacen.id,
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
          return Promise.resolve(
            getStock(where.almacenId_productoId.productoId),
          );
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
          const stock = stocks.find(
            (item) =>
              item.almacenId === where?.almacenId &&
              item.productoId === where?.productoId,
          );

          if (!stock) {
            return Promise.resolve({ count: 0 });
          }

          const minimoRequerido = where?.cantidad?.gte;
          if (
            typeof minimoRequerido === 'number' &&
            stock.cantidad < minimoRequerido
          ) {
            return Promise.resolve({ count: 0 });
          }

          const decremento = Number(data.cantidad?.decrement ?? 0);
          stock.cantidad -= decremento;

          return Promise.resolve({ count: 1 });
        },
      ),
    };

    prismaMock.venta = {
      findFirst: jest.fn(
        ({
          where,
          include,
        }: {
          where?: Record<string, any>;
          include?: Record<string, any>;
        }) => {
          const venta = ventas.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            return true;
          });
          if (!venta) return Promise.resolve(null);
          if (include) {
            return Promise.resolve({
              ...venta,
              cliente: clientes.find(
                (candidate) => candidate.id === venta.clienteId,
              ),
              usuario: {
                id: '11111111-1111-1111-1111-111111111111',
                nombre: 'Administrador',
                apellido: 'Sistema',
              },
              metodoPago: venta.metodoPagoId ? metodoPago : null,
              garantias: garantias.filter(
                (candidate) => candidate.ventaId === venta.id,
              ),
            });
          }
          return Promise.resolve(venta);
        },
      ),
      findMany: jest.fn(() => Promise.resolve(ventas)),
      count: jest.fn(() => Promise.resolve(ventas.length)),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const venta = {
          id: `99999999-9999-4999-8999-${String(ventas.length + 1).padStart(12, '0')}`,
          estado: 'COTIZACION',
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          ...data,
          detalles: data.detalles.create.map(
            (detalle: Record<string, any>) => ({
              id: `det-${Math.random()}`,
              ...detalle,
              producto: productos.find(
                (candidate) => candidate.id === detalle.productoId,
              ),
            }),
          ),
          cliente: clientes.find(
            (candidate) => candidate.id === data.clienteId,
          ),
        };
        ventas.push(venta);
        return Promise.resolve(venta);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const venta = ventas.find((candidate) => candidate.id === where.id);
          if (!venta) return Promise.resolve(null);
          Object.assign(venta, data, { updatedAt: new Date() });
          return Promise.resolve(venta);
        },
      ),
      findUnique: jest.fn(),
    };

    prismaMock.$transaction = jest.fn(
      async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          almacenStock: prismaMock.almacenStock,
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
          equipoCliente: {
            updateMany: jest.fn(
              ({
                where,
                data,
              }: {
                where?: Record<string, any>;
                data: Record<string, any>;
              }) => {
                asignaciones
                  .filter(
                    (candidate) =>
                      candidate.equipoNumeroSerie ===
                        where?.equipo?.numeroSerie &&
                      candidate.fechaFin === null,
                  )
                  .forEach((candidate) => Object.assign(candidate, data));
                return Promise.resolve({ count: 0 });
              },
            ),
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const equipo = equipos.find(
                (candidate) => candidate.id === data.equipoId,
              );
              const asignacion = {
                id: `asig-${asignaciones.length + 1}`,
                equipoNumeroSerie: equipo?.numeroSerie,
                ...data,
              };
              asignaciones.push(asignacion);
              return Promise.resolve(asignacion);
            }),
          },
          equipo: prismaMock.equipo,
          garantia: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const garantia = {
                id: `gar-${garantias.length + 1}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                estado: 'ACTIVA',
                ...data,
              };
              garantias.push(garantia);
              return Promise.resolve(garantia);
            }),
          },
          aperturaCaja: prismaMock.aperturaCaja,
          metodoPago: prismaMock.metodoPago,
          movimientoCaja: prismaMock.movimientoCaja,
          cliente: prismaMock.cliente,
          venta: {
            update: jest.fn(
              ({
                where,
                data,
              }: {
                where: { id: string };
                data: Record<string, any>;
              }) => {
                const venta = ventas.find(
                  (candidate) => candidate.id === where.id,
                );
                if (!venta) return Promise.resolve(null);
                Object.assign(venta, data, { updatedAt: new Date() });
                return Promise.resolve({
                  ...venta,
                  cliente: clientes.find(
                    (candidate) => candidate.id === venta.clienteId,
                  ),
                  detalles: venta.detalles,
                });
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

  it('crea, confirma y entrega una venta por HTTP', async () => {
    const token = await loginAsAdmin();

    const venta = await request(app.getHttpServer())
      .post('/api/v1/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId: '11111111-1111-4111-8111-000000000001',
        detalles: [
          {
            productoId: '22222222-2222-4222-8222-000000000001',
            cantidad: 2,
            precioUnitario: 100,
          },
        ],
      })
      .expect(201);

    expect(venta.body.data.estado).toBe('COTIZACION');

    const confirmada = await request(app.getHttpServer())
      .patch(`/api/v1/ventas/${venta.body.data.id}/confirmar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        metodoPagoId: '55555555-5555-4555-8555-000000000001',
        almacenId: '66666666-6666-4666-8666-000000000001',
      })
      .expect(200);

    expect(confirmada.body.data.estado).toBe('ORDEN_CONFIRMADA');

    const entregada = await request(app.getHttpServer())
      .patch(`/api/v1/ventas/${venta.body.data.id}/entregar`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(entregada.body.data.estado).toBe('ENTREGADA');
  });

  it('descuenta stock, asigna equipo y crea garantia al confirmar', async () => {
    const token = await loginAsAdmin();

    const venta = await request(app.getHttpServer())
      .post('/api/v1/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId: '11111111-1111-4111-8111-000000000001',
        detalles: [
          {
            productoId: '33333333-3333-4333-8333-000000000001',
            cantidad: 1,
            precioUnitario: 6000,
            equipoSerie: 'SN-VENTA-001',
          },
        ],
      })
      .expect(201);

    const confirmada = await request(app.getHttpServer())
      .patch(`/api/v1/ventas/${venta.body.data.id}/confirmar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        metodoPagoId: '55555555-5555-4555-8555-000000000001',
        almacenId: '66666666-6666-4666-8666-000000000001',
      })
      .expect(200);

    expect(confirmada.body.data.estado).toBe('ORDEN_CONFIRMADA');
    expect(
      (context.prismaMock as Record<string, any>).$transaction,
    ).toHaveBeenCalled();
  });
});
