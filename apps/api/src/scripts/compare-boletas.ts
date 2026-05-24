import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';
import { ConfigService } from '@nestjs/config';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const configService = new ConfigService(process.env);
  const storage = new FiscalStorageService(configService);

  const ids = {
    'B001-00000001': '34ef312a-623e-426b-8d32-78c6e2b39650',
    'B001-00000002': '4a9a7a1d-d985-4969-9eff-b3efa64e3bfc',
  };

  for (const [name, id] of Object.entries(ids)) {
    const comp = await prisma.comprobante.findUnique({
      where: { id },
    });
    if (!comp) {
      console.log(`${name} not found.`);
      continue;
    }
    console.log(`\n=================== ${name} ===================`);
    console.log(`ID: ${comp.id}`);
    console.log(`XML Key: ${comp.xmlStorageKey}`);
    console.log(`SUNAT Message: ${comp.mensajeSunat}`);
    
    if (comp.xmlStorageKey) {
      try {
        const xml = await storage.readObjectText(comp.xmlStorageKey, 'latin1');
        console.log(`XML Length: ${xml ? xml.length : 'empty'}`);
        if (xml) {
          // Print some key parts
          const ublVer = xml.match(/<cbc:UBLVersionID>.*?<\/cbc:UBLVersionID>/)?.[0];
          const custId = xml.match(/<cbc:CustomizationID.*?>.*?<\/cbc:CustomizationID>/)?.[0];
          const docId = xml.match(/<cbc:ID>.*?<\/cbc:ID>/)?.[0];
          const signature = xml.match(/<ds:Signature.*?>/)?.[0];
          console.log(`  UBLVersionID: ${ublVer}`);
          console.log(`  CustomizationID: ${custId}`);
          console.log(`  ID tag: ${docId}`);
          console.log(`  Signature tag: ${signature}`);
          
          // Print first 4 lines of XML
          console.log('  First lines:');
          console.log(xml.split('\n').slice(0, 10).join('\n'));
        }
      } catch (err) {
        console.error(`Error reading XML for ${name}:`, err);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
