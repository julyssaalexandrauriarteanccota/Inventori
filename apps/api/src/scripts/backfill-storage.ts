import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FacturacionModule } from '../modules/facturacion/facturacion.module';
import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';

const logger = new Logger('BackfillStorage');
const BATCH_SIZE = 100;

async function main() {
  const app = await NestFactory.createApplicationContext(FacturacionModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const storage = app.get(FiscalStorageService);

  try {
    let cursor: string | undefined;
    let migrated = 0;

    while (true) {
      const batch = await prisma.comprobante.findMany({
        where: {
          OR: [
            { xmlStorageKey: null, xmlContent: { not: null } },
            { cdrStorageKey: null, cdrContent: { not: null } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (batch.length === 0) break;

      for (const comprobante of batch) {
        const data: { xmlStorageKey?: string; cdrStorageKey?: string } = {};

        if (comprobante.xmlContent && !comprobante.xmlStorageKey) {
          data.xmlStorageKey = await storage.putXml(
            comprobante,
            comprobante.xmlContent,
          );
        }

        if (comprobante.cdrContent && !comprobante.cdrStorageKey) {
          data.cdrStorageKey = await storage.putCdrZip(
            comprobante,
            Buffer.from(comprobante.cdrContent, 'base64'),
          );
        }

        if (data.xmlStorageKey || data.cdrStorageKey) {
          await prisma.comprobante.update({
            where: { id: comprobante.id },
            data,
          });
          migrated += 1;
          logger.log(`Migrado ${comprobante.numero}`);
        }
      }

      cursor = batch.at(-1)?.id;
    }

    logger.log(`Backfill completado. Comprobantes migrados: ${migrated}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  logger.error(`Backfill falló: ${(error as Error).message}`);
  process.exitCode = 1;
});
