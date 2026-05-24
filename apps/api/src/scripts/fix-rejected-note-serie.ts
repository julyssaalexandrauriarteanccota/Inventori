import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';

async function main() {
  const id = process.argv[2];
  const serie = process.argv[3];
  if (!id || !serie) {
    throw new Error(
      'Uso: tsx src/scripts/fix-rejected-note-serie.ts <comprobanteId> <serie>',
    );
  }

  const prisma = new PrismaService();
  await prisma.$connect();

  const current = await prisma.comprobante.findUnique({ where: { id } });
  if (!current) throw new Error(`Comprobante ${id} no encontrado.`);

  const numero = `${serie}-${String(current.correlativo).padStart(8, '0')}`;
  console.log('ANTES:', current.numero, current.estado, current.codigoSunat);

  const updated = await prisma.comprobante.update({
    where: { id },
    data: {
      serie,
      numero,
      estado: 'PENDIENTE_ENVIO',
      payloadHash: null,
      hashCpe: null,
      xmlStorageKey: null,
      cdrStorageKey: null,
      pdfStorageKey: null,
      codigoSunat: null,
      mensajeSunat: null,
    },
  });

  console.log('DESPUES:', updated.numero, updated.estado);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
