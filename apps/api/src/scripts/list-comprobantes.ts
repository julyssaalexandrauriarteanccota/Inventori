import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const comprobantes = await prisma.comprobante.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  console.log('--- LATEST COMPROBANTES ---');
  for (const c of comprobantes) {
    console.log(`ID: ${c.id} | Numero: ${c.numero} | Tipo: ${c.tipo} | Estado: ${c.estado}`);
    console.log(`  SUNAT Code: ${c.codigoSunat} | Message: ${c.mensajeSunat}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
