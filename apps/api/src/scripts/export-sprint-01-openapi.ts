import 'reflect-metadata';

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import * as dotenv from 'dotenv';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { JwtStrategy } from '../modules/auth/jwt.strategy';
import { buildSwaggerConfig } from '../swagger/swagger.config';

function isSprint01Path(pathname: string) {
  return [
    '/api/v1/auth',
    '/api/v1/usuarios',
    '/api/v1/uploads',
    '/api/v1/health',
  ].some((prefix) => pathname.startsWith(prefix));
}

function pickSprint01Paths(document: OpenAPIObject) {
  return Object.fromEntries(
    Object.entries(document.paths).filter(([pathname]) =>
      isSprint01Path(pathname),
    ),
  );
}

async function main() {
  dotenv.config({ path: join(process.cwd(), '../../.env') });
  process.env.JWT_SECRET ??= 'export-openapi-secret';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      $queryRawUnsafe: () => Promise.resolve(1),
    })
    .overrideProvider(JwtStrategy)
    .useValue({})
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const sprint01Document: OpenAPIObject = {
    ...document,
    info: {
      ...document.info,
      title: 'ERP API - Sprint 01',
      description:
        'Contrato OpenAPI congelado para auth, usuarios, uploads y health del Sprint 01',
    },
    paths: pickSprint01Paths(document),
    tags: (document.tags ?? []).filter((tag) =>
      ['Auth', 'Usuarios', 'Uploads', 'Health'].includes(tag.name),
    ),
  };

  const outputDir = join(process.cwd(), '../../docs/contracts');
  const outputPath = join(outputDir, 'sprint-01-openapi.json');

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(sprint01Document, null, 2)}\n`,
    'utf8',
  );

  try {
    await app.close();
  } catch {
    // El documento ya fue exportado; algunos providers lazy pueden rechazar close sin init.
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
