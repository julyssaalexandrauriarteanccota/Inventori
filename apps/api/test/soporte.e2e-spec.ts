import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Soporte (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const clientes = [
      {
        id: '11111111-1111-4111-8111-000000000001',
        nombre: 'Cliente',
        dni: '12345678',
        ruc: null,
        telefono: '999999999',
        email: 'cliente@example.com',
        deletedAt: null,
      },
    ];
    const equipos = [
      {
        id: '22222222-2222-4222-8222-000000000001',
        numeroSerie: 'SN-SOP-001',
        productoId: '33333333-3333-4333-8333-000000000001',
        producto: {
          id: '33333333-3333-4333-8333-000000000001',
          nombre: 'Bizhub C258',
          modelo: 'C258',
        },
      },
    ];
    const productos = [
      {
        id: '44444444-4444-4444-8444-000000000000',
        nombre: 'Cambio de fusor',
        sku: 'SER-001',
        tipo: 'SERVICIO',
        requiereRepuestos: true,
        precioVenta: 100,
        deletedAt: null,
        activo: true,
      },
      {
        id: '44444444-4444-4444-8444-000000000001',
        nombre: 'Repuesto Fusor',
        sku: 'REP-001',
        tipo: 'REPUESTO',
        requiereRepuestos: false,
        precioVenta: 120,
        deletedAt: null,
        activo: true,
      },
    ];
    const almacenes = [
      {
        id: '55555555-5555-4555-8555-000000000001',
        esPrincipal: true,
        deletedAt: null,
      },
    ];
    const tickets: Array<Record<string, any>> = [];
    const historial: Array<Record<string, any>> = [];
    const detalles: Array<Record<string, any>> = [];
    const movimientos: Array<Record<string, any>> = [];
    const adjuntos: Array<Record<string, any>> = [];
    const stocks = [
      {
        almacenId: '55555555-5555-4555-8555-000000000001',
        productoId: '44444444-4444-4444-8444-000000000001',
        cantidad: 10,
      },
    ];

    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.cliente = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        return Promise.resolve(
          clientes.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            return true;
          }) ?? null,
        );
      }),
    };

    prismaMock.equipo = {
      findUnique: jest.fn(({ where }: { where: Record<string, string> }) => {
        if (where.id)
          return Promise.resolve(
            equipos.find((candidate) => candidate.id === where.id) ?? null,
          );
        return Promise.resolve(null);
      }),
    };

    const originalUsuarioFindFirst = prismaMock.usuario.findFirst;
    prismaMock.usuario.findFirst = jest.fn(
      ({
        where,
        select,
      }: {
        where?: Record<string, any>;
        select?: Record<string, boolean>;
      }) => {
        if (
          where?.id === '22222222-2222-2222-2222-222222222222' &&
          where.deletedAt === null
        ) {
          return Promise.resolve({
            id: '22222222-2222-2222-2222-222222222222',
            nombre: 'Tecnico',
          });
        }

        return originalUsuarioFindFirst({ where, select });
      },
    );

    prismaMock.producto = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        return Promise.resolve(
          productos.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            return true;
          }) ?? null,
        );
      }),
    };

    prismaMock.compatibilidad = {
      findUnique: jest.fn(() => Promise.resolve({ id: 'compat-1' })),
    };

    prismaMock.garantia = {
      findFirst: jest.fn(() => Promise.resolve(null)),
    };

    prismaMock.casoGarantia = {
      create: jest.fn(() => Promise.resolve({ id: 'caso-garantia-1' })),
    };

    prismaMock.almacen = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        return Promise.resolve(
          almacenes.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.esPrincipal === true && candidate.esPrincipal !== true)
              return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            return true;
          }) ?? null,
        );
      }),
    };

    prismaMock.almacenStock = {
      findUnique: jest.fn(
        ({
          where,
        }: {
          where: {
            almacenId_productoId: { almacenId: string; productoId: string };
          };
        }) => {
          const stock = stocks.find(
            (candidate) =>
              candidate.almacenId === where.almacenId_productoId.almacenId &&
              candidate.productoId === where.almacenId_productoId.productoId,
          );
          return Promise.resolve(stock ?? null);
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
            (candidate) =>
              candidate.almacenId === where?.almacenId &&
              candidate.productoId === where?.productoId,
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
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: {
            almacenId_productoId: { almacenId: string; productoId: string };
          };
          data: Record<string, any>;
        }) => {
          const stock = stocks.find(
            (candidate) =>
              candidate.almacenId === where.almacenId_productoId.almacenId &&
              candidate.productoId === where.almacenId_productoId.productoId,
          );
          if (stock) Object.assign(stock, data);
          return Promise.resolve(stock ?? null);
        },
      ),
    };

    prismaMock.ticket = {
      findFirst: jest.fn(
        ({
          where,
          include,
        }: {
          where?: Record<string, any>;
          include?: Record<string, any>;
        }) => {
          const ticket = tickets.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.codigo && candidate.codigo !== where.codigo) return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            return true;
          });
          if (!ticket) return Promise.resolve(null);
          if (include) {
            return Promise.resolve({
              ...ticket,
              cliente: clientes.find(
                (candidate) => candidate.id === ticket.clienteId,
              ),
              equipo: ticket.equipoId
                ? equipos.find((candidate) => candidate.id === ticket.equipoId)
                : null,
              tecnico: ticket.tecnicoId
                ? { id: ticket.tecnicoId, nombre: 'Tecnico' }
                : null,
              creadoPor: { id: ticket.creadoPorId, nombre: 'Administrador' },
              detalles: detalles.filter(
                (candidate) => candidate.ticketId === ticket.id,
              ),
              adjuntos,
              historial: historial.filter(
                (candidate) => candidate.ticketId === ticket.id,
              ),
            });
          }
          return Promise.resolve(ticket);
        },
      ),
      findMany: jest.fn(() => Promise.resolve(tickets)),
      findUnique: jest.fn(
        ({
          where,
          select,
        }: {
          where: { codigo: string };
          select?: Record<string, any>;
        }) => {
          const ticket = tickets.find(
            (candidate) =>
              candidate.codigo === where.codigo && candidate.deletedAt === null,
          );
          if (!ticket) return Promise.resolve(null);
          if (select) {
            return Promise.resolve({
              codigo: ticket.codigo,
              titulo: ticket.titulo,
              estado: ticket.estado,
              prioridad: ticket.prioridad,
              tipoServicio: ticket.tipoServicio,
              fechaRecepcion: ticket.fechaRecepcion,
              fechaPromesa: ticket.fechaPromesa,
              fechaCierre: ticket.fechaCierre,
              historial: historial.filter(
                (candidate) => candidate.ticketId === ticket.id,
              ),
            });
          }
          return Promise.resolve(ticket);
        },
      ),
      count: jest.fn(() => Promise.resolve(tickets.length)),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const ticket: Record<string, any> = {
          id: `66666666-6666-4666-8666-${String(tickets.length + 1).padStart(12, '0')}`,
          codigo: data.codigo,
          estado: 'ABIERTO',
          prioridad: data.prioridad ?? 'MEDIA',
          tipoServicio: data.tipoServicio ?? 'TALLER',
          fechaRecepcion: now,
          fechaPromesa: data.fechaPromesa ?? null,
          fechaCierre: null,
          deletedAt: null,
          ...data,
        };
        tickets.push(ticket);
        return Promise.resolve({
          ...ticket,
          cliente: clientes.find(
            (candidate) => candidate.id === ticket.clienteId,
          ),
          equipo: ticket.equipoId
            ? equipos.find((candidate) => candidate.id === ticket.equipoId)
            : null,
          tecnico: ticket.tecnicoId
            ? {
                id: ticket.tecnicoId,
                nombre: 'Tecnico',
                email: 'tecnico@erp.local',
              }
            : null,
        });
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const ticket = tickets.find((candidate) => candidate.id === where.id);
          if (!ticket) return Promise.resolve(null);
          Object.assign(ticket, data);
          return Promise.resolve(ticket);
        },
      ),
    };

    prismaMock.historialTicket = {
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const item = {
          id: `hist-${historial.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        historial.push(item);
        return Promise.resolve(item);
      }),
    };

    prismaMock.adjuntoTicket = {
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const item = {
          id: `adj-${adjuntos.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        adjuntos.push(item);
        return Promise.resolve(item);
      }),
    };

    prismaMock.$transaction = jest.fn(
      async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          ticket: {
            update: jest.fn(
              ({
                where,
                data,
              }: {
                where: { id: string };
                data: Record<string, any>;
              }) => {
                const ticket = tickets.find(
                  (candidate) => candidate.id === where.id,
                );
                if (!ticket) return Promise.resolve(null);
                Object.assign(ticket, data);
                return Promise.resolve(ticket);
              },
            ),
          },
          historialTicket: {
            create: prismaMock.historialTicket.create,
            createMany: jest.fn(
              ({ data }: { data: Array<Record<string, any>> }) => {
                data.forEach((item) =>
                  historial.push({
                    id: `hist-${historial.length + 1}`,
                    createdAt: new Date(),
                    ...item,
                  }),
                );
                return Promise.resolve({ count: data.length });
              },
            ),
          },
          detalleTicket: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const item = {
                id: `det-${detalles.length + 1}`,
                ...data,
                producto: productos.find(
                  (candidate) => candidate.id === data.productoId,
                ),
              };
              detalles.push(item);
              return Promise.resolve(item);
            }),
          },
          movimientoStock: {
            create: jest.fn(({ data }: { data: Record<string, any> }) => {
              const item = { id: `mov-${movimientos.length + 1}`, ...data };
              movimientos.push(item);
              return Promise.resolve(item);
            }),
          },
          almacenStock: prismaMock.almacenStock,
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

  it('crea un ticket por HTTP', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .post('/api/v1/soporte/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId: '11111111-1111-4111-8111-000000000001',
        equipoId: '22222222-2222-4222-8222-000000000001',
        titulo: 'Impresora no enciende',
        descripcion: 'El equipo no responde',
      })
      .expect(201);

    expect(response.body.data.codigo).toMatch(/^TKT-\d{4}-\d{4}$/);
  });

  it('consume repuesto y luego cierra ticket calculando monto total', async () => {
    const token = await loginAsAdmin();

    const ticket = await request(app.getHttpServer())
      .post('/api/v1/soporte/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId: '11111111-1111-4111-8111-000000000001',
        equipoId: '22222222-2222-4222-8222-000000000001',
        titulo: 'Falla de fusor',
        descripcion: 'Necesita cambio de repuesto',
        detalles: [
          {
            productoId: '44444444-4444-4444-8444-000000000000',
            cantidad: 1,
            precioUnitario: 100,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/soporte/tickets/${ticket.body.data.id}/repuestos`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productoId: '44444444-4444-4444-8444-000000000001',
        cantidad: 2,
        precioUnitario: 120,
      })
      .expect(201);

    const closed = await request(app.getHttpServer())
      .patch(`/api/v1/soporte/tickets/${ticket.body.data.id}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        montoManoObra: 100,
        solucion: 'Cambio de fusor',
      })
      .expect(200);

    expect(closed.body.data.estado).toBe('CERRADO');
    expect(closed.body.data.montoTotal).toBe(340);
  });

  it('expone seguimiento público por código sin JWT', async () => {
    const token = await loginAsAdmin();

    const ticket = await request(app.getHttpServer())
      .post('/api/v1/soporte/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId: '11111111-1111-4111-8111-000000000001',
        titulo: 'Consulta pública',
        descripcion: 'Seguimiento del ticket',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/soporte/tickets/${ticket.body.data.codigo}/publico`)
      .expect(200);

    expect(response.body.data.codigo).toBe(ticket.body.data.codigo);
    expect(response.body.data.estado).toBe('ABIERTO');
  });
});
