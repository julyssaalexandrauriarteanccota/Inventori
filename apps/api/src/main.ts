import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { Express, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { buildSwaggerConfig } from './swagger/swagger.config';

function stringifyUnknownError(error: unknown) {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

function registerProcessDiagnostics() {
  const logger = new Logger('Process');

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', stringifyUnknownError(reason));
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception; API process will exit', error.stack);
    process.exit(1);
  });

  process.once('SIGINT', () => {
    logger.warn('Received SIGINT; shutting down API process');
  });

  process.once('SIGTERM', () => {
    logger.warn('Received SIGTERM; shutting down API process');
  });

  process.on('exit', (code) => {
    logger.warn(`API process exiting with code ${code}`);
  });
}

registerProcessDiagnostics();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const httpAdapter = app.getHttpAdapter().getInstance() as Express;
  app.enableShutdownHooks();

  // Detrás de un proxy/CDN (nginx, cloudflare, vercel), confiar en X-Forwarded-*
  // para que el rate limiter, los logs y `req.ip` reflejen la IP real del cliente.
  // Sólo se activa cuando explícitamente se configura para evitar IP spoofing
  // en entornos sin proxy.
  if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
    httpAdapter.set('trust proxy', 1);
  }

  // Make the API root browser-friendly by sending users to the docs instead of a 404.
  httpAdapter.get('/', (_req: Request, res: Response) => {
    res.redirect('/api/docs');
  });

  // Prefijo global
  app.setGlobalPrefix('api/v1');

  // Seguridad
  app.use(helmet());

  // Las imágenes públicas subidas se renderizan desde el frontend (otro origin
  // en desarrollo: localhost:3000 -> localhost:4000). Helmet envía CORP
  // same-origin por defecto, por eso se permite cross-origin solo en esta ruta.
  httpAdapter.use(
    '/api/v1/uploads/public',
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      next();
    },
  );

  // CORS — admite una lista de orígenes separada por coma en FRONTEND_URL para
  // soportar varios entornos (dev, staging, prod) sin reconfigurar el server.
  const corsOriginEnv = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = corsOriginEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin Origin (curl, mobile apps, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} no permitido por CORS`), false);
    },
    credentials: true,
  });

  // Pipes globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtros e interceptores globales
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );

  // Swagger
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT_API || 4000;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const stack = error instanceof Error ? error.stack : String(error);

  logger.error('Failed to start API', stack);
  process.exit(1);
});
