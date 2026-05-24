import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FacturacionModule } from '../modules/facturacion/facturacion.module';
import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';
import * as fs from 'fs';

const logger = new Logger('InspectXml');

async function main() {
  const app = await NestFactory.createApplicationContext(FacturacionModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const storage = app.get(FiscalStorageService);

  try {
    const id = '4a9a7a1d-d985-4969-9eff-b3efa64e3bfc';
    const comp = await prisma.comprobante.findUnique({
      where: { id },
      include: {
        detallesFiscales: true,
        envioLogs: {
          orderBy: { fecha: 'desc' }
        }
      }
    });

    if (!comp) {
      logger.error(`Comprobante ${id} no encontrado`);
      return;
    }

    console.log('--- COMPROBANTE ---');
    console.log('ID:', comp.id);
    console.log('Número:', comp.numero);
    console.log('Tipo:', comp.tipo);
    console.log('Estado:', comp.estado);
    console.log('XML Storage Key:', comp.xmlStorageKey);
    console.log('CDR Storage Key:', comp.cdrStorageKey);
    console.log('Mensaje SUNAT:', comp.mensajeSunat);
    console.log('Codigo SUNAT:', comp.codigoSunat);
    console.log('Logs de envío:', comp.envioLogs.map(l => ({
      fecha: l.fecha,
      tipoEvento: l.tipoEvento,
      estado: l.estado,
      responseCode: l.responseCode,
      responseDescription: l.responseDescription,
      mensaje: l.mensaje,
      errorMessage: l.errorMessage
    })));

    if (comp.xmlStorageKey) {
      try {
        const xml = await storage.readObjectText(comp.xmlStorageKey, 'latin1');
        if (xml) {
          console.log('--- XML CONTENT ---');
          console.log(xml.slice(0, 1000));
          console.log('... [TRUNCATED] ...');
          console.log(xml.slice(-1000));
          
          fs.writeFileSync(
            path.join(__dirname, 'last-signed-invoice.xml'),
            xml,
            'latin1',
          );
          console.log('XML escrito a last-signed-invoice.xml');
        } else {
          console.log('XML está vacío');
        }
      } catch (err) {
        console.error('Error leyendo XML desde storage:', err);
      }
    } else {
      console.log('No tiene xmlStorageKey');
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Inspección falló:', error);
  process.exitCode = 1;
});
