import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Equipos y Garantias (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const productos = [
      {
        id: '11111111-1111-4111-8111-000000000001',
        sku: 'EQ-001',
        nombre: 'Bizhub C258',
        modelo: 'C258',
        tipo: 'EQUIPO',
        tieneNumeroSerie: true,
        manejaInventario: true,
        mesesGarantia: 12,
        garantiaMaxCopias: null,
        deletedAt: null,
        marca: { nombre: 'Konica Minolta' },
      },
    ];
    const equipos: Array<Record<string, any>> = [];
    const garantias: Array<Record<string, any>> = [];
    const casos: Array<Record<string, any>> = [];

    const prismaMock = context.prismaMock as Record<string, any>;
    const clienteAsignado = {
      id: '55555555-5555-4555-8555-000000000001',
      tipoDocumento: 'RUC',
      numeroDocumento: '20123456789',
      razonSocial: 'Cliente SAC',
      nombre: 'Cliente SAC',
    };
    const buildAsignacionActual = (equipoId: string) => ({
      id: `66666666-6666-4666-8666-${String(
        equipos.findIndex((candidate) => candidate.id === equipoId) + 1,
      ).padStart(12, '0')}`,
      equipoId,
      clienteId: clienteAsignado.id,
      ventaId: null,
      fechaInicio: now,
      fechaFin: null,
      notas: null,
      cliente: clienteAsignado,
    });

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

    prismaMock.equipo = {
      findUnique: jest.fn(
        ({
          where,
          include,
        }: {
          where: Record<string, string>;
          include?: Record<string, any>;
        }) => {
          const equipo = equipos.find((candidate) => {
            if (where.id) return candidate.id === where.id;
            if (where.numeroSerie)
              return candidate.numeroSerie === where.numeroSerie;
            return false;
          });

          if (!equipo) return Promise.resolve(null);

          if (include?.producto) {
            return Promise.resolve({
              ...equipo,
              producto: productos.find(
                (candidate) => candidate.id === equipo.productoId,
              ),
              equipoClientes: [buildAsignacionActual(equipo.id)],
              garantias: garantias.filter(
                (candidate) => candidate.equipoId === equipo.id,
              ),
            });
          }

          return Promise.resolve(equipo);
        },
      ),
      findMany: jest.fn(() =>
        Promise.resolve(
          equipos.map((equipo) => ({
            ...equipo,
            producto: productos.find(
              (candidate) => candidate.id === equipo.productoId,
            ),
            equipoClientes: [buildAsignacionActual(equipo.id)],
          })),
        ),
      ),
      count: jest.fn(() => Promise.resolve(equipos.length)),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const equipo = {
          id: `22222222-2222-4222-8222-${String(equipos.length + 1).padStart(12, '0')}`,
          numeroSerie: data.numeroSerie,
          productoId: data.productoId,
          estado: data.estado ?? 'ACTIVO',
          estadoComercial: data.estadoComercial ?? 'VENDIDO',
          almacenId: data.almacenId ?? null,
          contadorInicial: data.contadorInicial ?? 0,
          contadorActual: data.contadorActual ?? 0,
          ubicacion: data.ubicacion ?? null,
          firmware: data.firmware ?? null,
          notas: data.notas ?? null,
          createdAt: now,
          updatedAt: now,
        };
        equipos.push(equipo);
        return Promise.resolve({
          ...equipo,
          producto: productos.find(
            (candidate) => candidate.id === equipo.productoId,
          ),
        });
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { numeroSerie?: string; id?: string };
          data: Record<string, any>;
        }) => {
          const equipo = equipos.find((candidate) =>
            where.id
              ? candidate.id === where.id
              : candidate.numeroSerie === where.numeroSerie,
          );
          if (!equipo) return Promise.resolve(null);
          Object.assign(equipo, data, { updatedAt: new Date() });
          return Promise.resolve({
            ...equipo,
            producto: productos.find(
              (candidate) => candidate.id === equipo.productoId,
            ),
          });
        },
      ),
    };

    prismaMock.equipoCliente = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> } = {}) => {
        const equipoId = String(where?.equipoId ?? '');
        const equipo = equipos.find((candidate) => candidate.id === equipoId);
        return Promise.resolve(
          equipo ? buildAsignacionActual(equipo.id) : null,
        );
      }),
      findMany: jest.fn(() =>
        Promise.resolve(
          equipos.map((equipo) => buildAsignacionActual(equipo.id)),
        ),
      ),
      create: jest.fn(),
      update: jest.fn(),
    };

    prismaMock.garantia = {
      findUnique: jest.fn(
        ({
          where,
          select,
          include,
        }: {
          where: Record<string, string>;
          select?: Record<string, any>;
          include?: Record<string, any>;
        }) => {
          const garantia = garantias.find((candidate) => {
            if (where.id) return candidate.id === where.id;
            if (where.codigoQR) return candidate.codigoQR === where.codigoQR;
            return false;
          });

          if (!garantia) return Promise.resolve(null);

          const equipo = equipos.find(
            (candidate) => candidate.id === garantia.equipoId,
          );
          const producto = productos.find(
            (candidate) => candidate.id === equipo?.productoId,
          );

          if (select) {
            return Promise.resolve({
              id: garantia.id,
              estado: garantia.estado,
              fechaInicio: garantia.fechaInicio,
              fechaFin: garantia.fechaFin,
              cobertura: garantia.cobertura,
              exclusiones: garantia.exclusiones,
              clienteNombre: garantia.clienteNombre,
              codigoQR: garantia.codigoQR,
              equipo: {
                numeroSerie: equipo?.numeroSerie,
                producto: {
                  nombre: producto?.nombre,
                  modelo: producto?.modelo ?? null,
                  marca: producto?.marca ?? null,
                },
              },
            });
          }

          if (include) {
            return Promise.resolve({
              ...garantia,
              equipo: {
                id: equipo?.id,
                numeroSerie: equipo?.numeroSerie,
                producto: {
                  nombre: producto?.nombre,
                  modelo: producto?.modelo ?? null,
                  marca: producto?.marca ?? null,
                },
              },
              casos: casos.filter(
                (candidate) => candidate.garantiaId === garantia.id,
              ),
              _count: {
                casos: casos.filter(
                  (candidate) => candidate.garantiaId === garantia.id,
                ).length,
              },
            });
          }

          return Promise.resolve(garantia);
        },
      ),
      findFirst: jest.fn(({ where }: { where?: Record<string, any> } = {}) => {
        const garantia = garantias.find((candidate) => {
          if (!where) return false;
          if (where.equipoId && candidate.equipoId !== where.equipoId)
            return false;
          return true;
        });
        return Promise.resolve(garantia ? { id: garantia.id } : null);
      }),
      findMany: jest.fn(() =>
        Promise.resolve(
          garantias.map((garantia) => ({
            ...garantia,
            equipo: equipos.find(
              (candidate) => candidate.id === garantia.equipoId,
            ),
            _count: {
              casos: casos.filter(
                (candidate) => candidate.garantiaId === garantia.id,
              ).length,
            },
          })),
        ),
      ),
      count: jest.fn(() => Promise.resolve(garantias.length)),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const garantia: Record<string, any> = {
          id: `33333333-3333-4333-8333-${String(garantias.length + 1).padStart(12, '0')}`,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        garantias.push(garantia);

        const equipo = equipos.find(
          (candidate) => candidate.id === garantia.equipoId,
        );
        const producto = productos.find(
          (candidate) => candidate.id === equipo?.productoId,
        );

        return Promise.resolve({
          ...garantia,
          equipo: {
            id: equipo?.id,
            numeroSerie: equipo?.numeroSerie,
            producto: {
              nombre: producto?.nombre,
              modelo: producto?.modelo ?? null,
            },
          },
        });
      }),
    };

    prismaMock.casoGarantia = {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(
          casos.find((candidate) => candidate.id === where.id) ?? null,
        );
      }),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const caso = {
          id: `44444444-4444-4444-8444-${String(casos.length + 1).padStart(12, '0')}`,
          resolucion: null,
          aceptada: null,
          motivo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
          garantia: {
            id: data.garantiaId,
            codigoQR: garantias.find(
              (candidate) => candidate.id === data.garantiaId,
            )?.codigoQR,
            equipo: {
              numeroSerie: equipos.find(
                (candidate) =>
                  candidate.id ===
                  garantias.find((g) => g.id === data.garantiaId)?.equipoId,
              )?.numeroSerie,
            },
          },
        };
        casos.push(caso);
        return Promise.resolve(caso);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const caso = casos.find((candidate) => candidate.id === where.id);
          if (!caso) return Promise.resolve(null);
          Object.assign(caso, data, { updatedAt: new Date() });
          return Promise.resolve(caso);
        },
      ),
    };
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

  it('registra un equipo serializado por HTTP', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .post('/api/v1/equipos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        numeroSerie: 'KM-SN-001',
        productoId: '11111111-1111-4111-8111-000000000001',
      })
      .expect(201);

    expect(response.body.data.numeroSerie).toBe('KM-SN-001');
    expect(response.body.data.producto.nombre).toBe('Bizhub C258');
  });

  it('permite consulta publica de garantia por QR sin login', async () => {
    const token = await loginAsAdmin();

    const equipo = await request(app.getHttpServer())
      .post('/api/v1/equipos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        numeroSerie: 'KM-SN-002',
        productoId: '11111111-1111-4111-8111-000000000001',
      })
      .expect(201);

    const garantia = await request(app.getHttpServer())
      .post('/api/v1/garantias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipoId: equipo.body.data.id,
        clienteDocTipo: 'RUC',
        clienteDocNumero: '20123456789',
        clienteNombre: 'Cliente SAC',
        fechaInicio: '2026-01-01T00:00:00.000Z',
        fechaFin: '2027-01-01T00:00:00.000Z',
        cobertura: 'Cobertura total',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/garantias/verificar/${garantia.body.data.codigoQR}`)
      .expect(200);

    expect(response.body.data.codigoQR).toBe(garantia.body.data.codigoQR);
    expect(response.body.data.equipo.numeroSerie).toBe('KM-SN-002');
    expect(response.body.data.vigente).toBe(true);
  });

  it('permite aceptar y rechazar casos de garantia por HTTP', async () => {
    const token = await loginAsAdmin();

    const equipo = await request(app.getHttpServer())
      .post('/api/v1/equipos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        numeroSerie: 'KM-SN-003',
        productoId: '11111111-1111-4111-8111-000000000001',
      })
      .expect(201);

    const garantia = await request(app.getHttpServer())
      .post('/api/v1/garantias')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipoId: equipo.body.data.id,
        fechaInicio: '2026-01-01T00:00:00.000Z',
        fechaFin: '2027-01-01T00:00:00.000Z',
        cobertura: 'Cobertura premium',
      })
      .expect(201);

    const casoAceptar = await request(app.getHttpServer())
      .post(`/api/v1/garantias/${garantia.body.data.id}/casos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ descripcion: 'Falla de fusor' })
      .expect(201);

    const aceptado = await request(app.getHttpServer())
      .patch(
        `/api/v1/garantias/${garantia.body.data.id}/casos/${casoAceptar.body.data.id}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({ aceptada: true, resolucion: 'Cambio de fusor' })
      .expect(200);

    expect(aceptado.body.data.aceptada).toBe(true);

    const casoRechazar = await request(app.getHttpServer())
      .post(`/api/v1/garantias/${garantia.body.data.id}/casos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ descripcion: 'Daño por mal uso' })
      .expect(201);

    const rechazado = await request(app.getHttpServer())
      .patch(
        `/api/v1/garantias/${garantia.body.data.id}/casos/${casoRechazar.body.data.id}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({ aceptada: false, motivo: 'Uso indebido' })
      .expect(200);

    expect(rechazado.body.data.aceptada).toBe(false);
    expect(rechazado.body.data.motivo).toBe('Uso indebido');
  });
});
