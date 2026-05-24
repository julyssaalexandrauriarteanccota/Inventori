import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const summary = await prisma.comprobante.groupBy({
    by: ['tipo', 'estado', 'codigoSunat'],
    _count: {
      id: true,
    },
  });

  console.log('--- COMPROBANTE SUMMARY ---');
  for (const s of summary) {
    console.log(`Tipo: ${s.tipo} | Estado: ${s.estado} | SUNAT Code: ${s.codigoSunat} | Count: ${s._count.id}`);
  }

  const latest = await prisma.comprobante.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      numero: true,
      tipo: true,
      estado: true,
      codigoSunat: true,
      mensajeSunat: true,
    }
  });

  console.log('\n--- LATEST 20 COMPROBANTES ---');
  for (const c of latest) {
    console.log(`ID: ${c.id} | Numero: ${c.numero} | Tipo: ${c.tipo} | Estado: ${c.estado}`);
    console.log(`  SUNAT Code: ${c.codigoSunat} | Msg: ${c.mensajeSunat}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
