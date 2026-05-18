import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Config y Reportes (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const configEmpresa = {
      id: 'empresa',
      razonSocial: 'Empresa Demo SAC',
      ruc: '20123456789',
      direccion: 'Av. Demo 123',
      telefono: null,
      email: null,
      logo: null,
      serieFactura: 'F001',
      serieBoleta: 'B001',
      serieNotaCredito: 'FC01',
      serieNotaDebito: 'FD01',
      correlativoFactura: 0,
      correlativoBoleta: 0,
      correlativoNotaCredito: 0,
      correlativoNotaDebito: 0,
      porcentajeIGV: 18,
      updatedAt: new Date('2026-04-06T00:00:00.000Z'),
    };

    const auditorias = [
      {
        id: '11111111-1111-4111-8111-000000000001',
        accion: 'UPDATE',
        modelo: 'ConfigEmpresa',
        modeloId: 'empresa',
        createdAt: new Date('2026-04-06T00:00:00.000Z'),
        usuario: {
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Administrador',
          email: 'admin@erp.local',
        },
      },
    ];

    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.configEmpresa = {
      findFirst: jest.fn((args?: { select?: Record<string, boolean> }) => {
        const select = args?.select;
        if (!select) return Promise.resolve(configEmpresa);
        return Promise.resolve(
          Object.fromEntries(
            Object.entries(select)
              .filter(([, enabled]) => enabled)
              .map(([key]) => [key, (configEmpresa as any)[key]]),
          ),
        );
      }),
      update: jest.fn(
        ({
          data,
          select,
        }: {
          data: Record<string, any>;
          select?: Record<string, boolean>;
        }) => {
          Object.assign(configEmpresa, data);
          if (!select) return Promise.resolve(configEmpresa);
          return Promise.resolve(
            Object.fromEntries(
              Object.entries(select)
                .filter(([, enabled]) => enabled)
                .map(([key]) => [key, (configEmpresa as any)[key]]),
            ),
          );
        },
      ),
    };

    prismaMock.metodoPago = {
      findMany: jest.fn(() => Promise.resolve([])),
      findUnique: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(),
      update: jest.fn(),
    };

    const originalAuditoriaCreate = prismaMock.auditoria.create;
    prismaMock.auditoria = {
      create: originalAuditoriaCreate,
      findMany: jest.fn(() => Promise.resolve(auditorias)),
      count: jest.fn(() => Promise.resolve(auditorias.length)),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(
          auditorias.find((candidate) => candidate.id === where.id) ?? null,
        );
      }),
    };

    prismaMock.venta = {
      aggregate: jest.fn(() => Promise.resolve({ _sum: { total: 15000 } })),
      count: jest.fn(() => Promise.resolve(8)),
      groupBy: jest.fn(() => Promise.resolve([])),
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.ticket = {
      count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(12),
      groupBy: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.alertaStock = {
      count: jest.fn(() => Promise.resolve(2)),
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.cliente = {
      count: jest.fn(() => Promise.resolve(5)),
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.almacenStock = {
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.equipo = {
      findUnique: jest.fn(() => Promise.resolve(null)),
    };

    prismaMock.lecturaSNMP = {
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.usuario.findMany = jest.fn(() => Promise.resolve([]));
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

  it('devuelve dashboard consolidado', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .get('/api/v1/reportes/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.ventasMes.totalMonto).toBe(15000);
    expect(response.body.data.tickets.abiertos).toBe(3);
    expect(response.body.data.alertasStockPendientes).toBe(2);
  });

  it('actualiza configuración de empresa solo como ADMIN', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .patch('/api/v1/config/empresa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        razonSocial: 'Nueva Empresa SAC',
        direccion: 'Av. Nueva 456',
      })
      .expect(200);

    expect(response.body.data.razonSocial).toBe('Nueva Empresa SAC');
    expect(response.body.data.direccion).toBe('Av. Nueva 456');
  });
});
