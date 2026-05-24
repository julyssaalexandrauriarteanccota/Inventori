import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

async function main() {
  console.log('Starting direct inspection...');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  
  const prisma = new PrismaService();
  await prisma.$connect();
  console.log('Connected to PostgreSQL successfully!');

  const id =
    process.argv[2] ??
    process.env.COMPROBANTE_ID ??
    '4a9a7a1d-d985-4969-9eff-b3efa64e3bfc';
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
    console.error(`Comprobante with ID ${id} not found.`);
    await prisma.$disconnect();
    return;
  }

  console.log('================ COMPROBANTE ===============');
  console.log('ID:', comp.id);
  console.log('Numero:', comp.numero);
  console.log('Tipo:', comp.tipo);
  console.log('Estado:', comp.estado);
  console.log('XML Key:', comp.xmlStorageKey);
  console.log('CDR Key:', comp.cdrStorageKey);
  console.log('SUNAT Message:', comp.mensajeSunat);
  console.log('SUNAT Code:', comp.codigoSunat);
  console.log('\n================ SENDING LOGS ================');
  for (const log of comp.envioLogs) {
    console.log(`- [${new Date(log.fecha).toLocaleString()}] Evento: ${log.tipoEvento} | Estado: ${log.estado}`);
    if (log.responseCode || log.responseDescription) {
      console.log(`  SUNAT Resp: [${log.responseCode}] ${log.responseDescription}`);
    }
    if (log.mensaje) {
      console.log(`  Mensaje: ${log.mensaje}`);
    }
    if (log.errorMessage) {
      console.log(`  Error: ${log.errorMessage}`);
    }
    if (log.requestPayload) {
      console.log(
        `  Request payload: ${JSON.stringify(log.requestPayload, null, 2)}`,
      );
    }
    if (log.responsePayload) {
      console.log(
        `  Response payload: ${JSON.stringify(log.responsePayload, null, 2)}`,
      );
    }
    console.log('--------------------------------------------');
  }

  if (comp.xmlStorageKey) {
    console.log('\nReading XML from storage...');
    // Create an ad-hoc ConfigService to feed to FiscalStorageService
    const configService = new ConfigService(process.env);
    const storage = new FiscalStorageService(configService);
    
    try {
      const xml = await storage.readObjectText(comp.xmlStorageKey, 'latin1');
      if (xml) {
        console.log('XML length:', xml.length);
        const outPath = path.join(__dirname, 'last-signed-invoice.xml');
        fs.writeFileSync(outPath, xml, 'latin1');
        console.log(`Signed XML successfully written to: ${outPath}`);
        
        // Print first 800 chars of XML
        console.log('\nFirst 800 characters of XML:');
        console.log(xml.slice(0, 800));
        console.log('...');
      } else {
        console.log('XML content is empty.');
      }
    } catch (err) {
      console.error('Error reading XML from storage:', err);
    }
  } else {
    console.log('No xmlStorageKey set.');
  }

  await prisma.$disconnect();
  console.log('Disconnected from PostgreSQL.');
}

main().catch(console.error);
