import { ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { BullRegistrar } from '@nestjs/bullmq/dist/bull.registrar';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/database/prisma.service';
import { UploadsService } from '../src/modules/uploads/uploads.service';

type TestUser = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: 'ADMIN' | 'ENCARGADO' | 'TECNICO';
  activo: boolean;
  mustChangePassword: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type RefreshTokenRecord = {
  id: string;
  usuarioId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
};

function selectFields<T extends Record<string, unknown>>(
  entity: T,
  select?: Record<string, boolean>,
) {
  if (!select) {
    return entity;
  }

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, entity[key]]),
  );
}

export async function createTestApp() {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '8h';
  process.env.JWT_REFRESH_EXPIRES_IN = '30d';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const tecnicoPassword = await bcrypt.hash('Tecnico123!', 10);
  const now = new Date('2026-04-06T00:00:00.000Z');

  const users: TestUser[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@erp.local',
      password: adminPassword,
      rol: 'ADMIN',
      activo: true,
      mustChangePassword: true,
      ultimoAcceso: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      nombre: 'Tecnico',
      apellido: 'Campo',
      email: 'tecnico@erp.local',
      password: tecnicoPassword,
      rol: 'TECNICO',
      activo: true,
      mustChangePassword: false,
      ultimoAcceso: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  const refreshTokens: RefreshTokenRecord[] = [];
  const aperturaCajaActiva = {
    id: 'apertura-1',
    cajaId: 'caja-1',
    usuarioAperturaId: '11111111-1111-1111-1111-111111111111',
    estado: 'ABIERTA',
    montoInicial: 0,
    montoEsperado: 0,
    notasApertura: null,
    abiertaEn: now,
    caja: { id: 'caja-1', nombre: 'Caja Principal' },
    usuarioApertura: {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Administrador',
      apellido: 'Sistema',
    },
  };
  const movimientosCaja: Array<Record<string, unknown>> = [];

  const prismaMock = {
    auditoria: {
      create: jest.fn(() => Promise.resolve({ id: 'audit-1' })),
    },
    aperturaCaja: {
      findFirst: jest.fn(({ where }: { where?: Record<string, unknown> }) => {
        if (!where) {
          return Promise.resolve(null);
        }

        const usuarioMatches = where.usuarioAperturaId
          ? aperturaCajaActiva.usuarioAperturaId === where.usuarioAperturaId
          : true;
        const cajaMatches = where.cajaId
          ? aperturaCajaActiva.cajaId === where.cajaId
          : true;
        const estadoMatches = where.estado
          ? aperturaCajaActiva.estado === where.estado
          : true;

        return Promise.resolve(
          usuarioMatches && cajaMatches && estadoMatches
            ? aperturaCajaActiva
            : null,
        );
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === aperturaCajaActiva.id ? aperturaCajaActiva : null,
        ),
      ),
    },
    movimientoCaja: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const movimiento = {
          id: `caja-mov-${movimientosCaja.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        movimientosCaja.push(movimiento);
        return Promise.resolve(movimiento);
      }),
      findMany: jest.fn(() => Promise.resolve(movimientosCaja)),
    },
    usuario: {
      findFirst: jest.fn(
        ({
          where,
          select,
        }: {
          where?: Record<string, unknown>;
          select?: Record<string, boolean>;
        }) => {
          const user = users.find((candidate) => {
            if (!where) {
              return false;
            }

            const emailMatches = where.email
              ? candidate.email === where.email
              : true;
            const idMatches = where.id ? candidate.id === where.id : true;
            const deletedAtMatches =
              where.deletedAt === null ? candidate.deletedAt === null : true;
            const activoMatches =
              typeof where.activo === 'boolean'
                ? candidate.activo === where.activo
                : true;

            return (
              emailMatches && idMatches && deletedAtMatches && activoMatches
            );
          });

          return Promise.resolve(user ? selectFields(user, select) : null);
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
          select,
        }: {
          where: { id: string };
          data: Partial<TestUser>;
          select?: Record<string, boolean>;
        }) => {
          const user = users.find((candidate) => candidate.id === where.id);
          if (!user) {
            return Promise.resolve(null);
          }

          Object.assign(user, data);
          user.updatedAt = new Date();

          return Promise.resolve(selectFields(user, select));
        },
      ),
      findMany: jest.fn(
        ({
          where,
          select,
        }: {
          where?: Record<string, unknown>;
          select?: Record<string, boolean>;
        }) => {
          const filtered = users.filter((candidate) => {
            if (!where) {
              return true;
            }

            if (where.deletedAt === null && candidate.deletedAt !== null) {
              return false;
            }

            if (where.rol && candidate.rol !== where.rol) {
              return false;
            }

            return true;
          });

          return Promise.resolve(
            filtered.map((user) => selectFields(user, select)),
          );
        },
      ),
      count: jest.fn(() =>
        Promise.resolve(users.filter((user) => user.deletedAt === null).length),
      ),
    },
    refreshToken: {
      create: jest.fn(
        ({
          data,
        }: {
          data: Omit<RefreshTokenRecord, 'id' | 'createdAt' | 'revoked'>;
        }) => {
          refreshTokens.push({
            id: `token-${refreshTokens.length + 1}`,
            createdAt: new Date(),
            revoked: false,
            ...data,
          });

          return Promise.resolve(refreshTokens.at(-1));
        },
      ),
      findFirst: jest.fn(
        ({
          where,
          include,
        }: {
          where?: Record<string, unknown>;
          include?: Record<string, unknown>;
        }) => {
          const token = refreshTokens.find((candidate) => {
            if (!where) {
              return false;
            }

            const tokenMatches = where.token
              ? candidate.token === where.token
              : true;
            const revokedMatches =
              typeof where.revoked === 'boolean'
                ? candidate.revoked === where.revoked
                : true;
            const expiresAtFilter = where.expiresAt as
              | { gt?: Date }
              | undefined;
            const expiresAtMatches = expiresAtFilter?.gt
              ? candidate.expiresAt > expiresAtFilter.gt
              : true;

            return tokenMatches && revokedMatches && expiresAtMatches;
          });

          if (!token) {
            return Promise.resolve(null);
          }

          if (include?.usuario) {
            const user = users.find(
              (candidate) => candidate.id === token.usuarioId,
            );
            return Promise.resolve({ ...token, usuario: user });
          }

          return Promise.resolve(token);
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<RefreshTokenRecord>;
        }) => {
          const token = refreshTokens.find(
            (candidate) => candidate.id === where.id,
          );
          if (token) {
            Object.assign(token, data);
          }
          return Promise.resolve(token);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where?: Record<string, unknown>;
          data: Partial<RefreshTokenRecord>;
        }) => {
          let count = 0;
          for (const token of refreshTokens) {
            const usuarioMatches = where?.usuarioId
              ? token.usuarioId === where.usuarioId
              : true;
            const revokedMatches =
              typeof where?.revoked === 'boolean'
                ? token.revoked === where.revoked
                : true;
            if (usuarioMatches && revokedMatches) {
              Object.assign(token, data);
              count += 1;
            }
          }
          return Promise.resolve({ count });
        },
      ),
    },
  };

  const prismaMockRecord = prismaMock as Record<string, any>;
  prismaMockRecord.$transaction = jest.fn(async (input: any) => {
    if (typeof input === 'function') {
      return input(prismaMockRecord);
    }

    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    return input;
  });

  const uploadsMock = {
    saveFile: jest.fn(() => ({
      filename: 'mock-file.pdf',
      path: '/uploads/mock-file.pdf',
      originalName: 'archivo.pdf',
      mimeType: 'application/pdf',
      size: 11,
      isImage: false,
    })),
    getFilePath: jest.fn(),
    getPublicImagePath: jest.fn(),
  };

  const sunatQueueMock = {
    add: jest.fn(() => Promise.resolve({ id: 'job-1' })),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .overrideProvider(UploadsService)
    .useValue(uploadsMock)
    .overrideProvider(getQueueToken('sunat'))
    .useValue(sunatQueueMock)
    .overrideProvider(BullRegistrar)
    .useValue({ onModuleInit() {}, register() {} })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );
  await app.init();

  return {
    app,
    prismaMock,
    uploadsMock,
    sunatQueueMock,
    users,
    refreshTokens,
  };
}

export type TestAppContext = Awaited<ReturnType<typeof createTestApp>>;
