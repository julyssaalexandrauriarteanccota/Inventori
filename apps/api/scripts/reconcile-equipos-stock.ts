import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { EstadoComercialEquipo, TipoProducto } from '@erp/shared';

config({ path: resolve(process.cwd(), '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL missing');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const serialProducts = await prisma.producto.findMany({
    where: {
      deletedAt: null,
      manejaInventario: true,
      OR: [{ tipo: TipoProducto.EQUIPO }, { tieneNumeroSerie: true }],
    },
    select: { id: true },
  });

  const productIds = serialProducts.map((product) => product.id);
  const counts = new Map<string, number>();

  if (productIds.length === 0) {
    console.log(JSON.stringify({ serialProducts: 0, syncedPairs: 0, existingRows: 0 }, null, 2));
    return;
  }

  const equipos = await prisma.equipo.findMany({
    where: {
      productoId: { in: productIds },
      almacenId: { not: null },
      estadoComercial: {
        notIn: [
          EstadoComercialEquipo.VENDIDO,
          EstadoComercialEquipo.ALQUILADO,
          EstadoComercialEquipo.BAJA,
        ],
      },
    },
    select: { productoId: true, almacenId: true },
  });

  for (const equipo of equipos) {
    const key = `${equipo.productoId}::${equipo.almacenId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const existingRows = await prisma.almacenStock.findMany({
    where: { productoId: { in: productIds } },
    select: { id: true, productoId: true, almacenId: true },
  });

  const touched = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const row of existingRows) {
      const key = `${row.productoId}::${row.almacenId}`;
      touched.add(key);
      await tx.almacenStock.update({
        where: { id: row.id },
        data: { cantidad: counts.get(key) ?? 0 },
      });
    }

    for (const [key, cantidad] of counts.entries()) {
      if (touched.has(key)) continue;
      const [productoId, almacenId] = key.split('::');
      await tx.almacenStock.create({
        data: { productoId, almacenId, cantidad },
      });
    }
  });

  console.log(JSON.stringify({
    serialProducts: productIds.length,
    syncedPairs: counts.size,
    existingRows: existingRows.length,
  }, null, 2));
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
