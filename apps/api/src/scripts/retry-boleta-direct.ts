import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';
import { Queue } from 'bullmq';
import { calcularDeadlineEnvio, TipoDocumento } from '@erp/shared';

async function main() {
  console.log('Starting direct manual retry script...');
  
  const prisma = new PrismaService();
  await prisma.$connect();
  console.log('Connected to PostgreSQL successfully!');

  const id = '4a9a7a1d-d985-4969-9eff-b3efa64e3bfc';
  const comprobante = await prisma.comprobante.findUnique({
    where: { id },
  });

  if (!comprobante) {
    console.error(`Comprobante with ID ${id} not found.`);
    await prisma.$disconnect();
    return;
  }

  const estadoActual = comprobante.estado;
  console.log(`Comprobante current state: ${estadoActual}`);

  const intentoNumero = Number(comprobante.intentosEnvio ?? 0) + 1;
  console.log(`Planning manual retry #${intentoNumero}`);

  // Update DB state
  await prisma.$transaction([
    prisma.comprobante.update({
      where: { id },
      data: {
        estado: 'PENDIENTE_ENVIO',
        payloadHash: null,
        hashCpe: null,
        xmlStorageKey: null,
      },
    }),
    prisma.venta.update({
      where: { id: comprobante.ventaId ?? undefined },
      data: {
        estadoFacturacion: 'EN_EMISION',
      },
    }),
    prisma.comprobanteEnvioLog.create({
      data: {
        comprobanteId: id,
        tipo: 'REINTENTO',
        proveedor: 'SISTEMA',
        tipoEvento: 'REINTENTO',
        estado: 'PENDIENTE_ENVIO',
        intento: intentoNumero,
        mensaje: `Reintento manual #${intentoNumero} desde estado ${estadoActual} (Vía script directo)`,
      },
    }),
  ]);

  console.log('Database updated successfully to PENDIENTE_ENVIO!');

  // Calculate deadline
  const deadlineResult = calcularDeadlineEnvio(
    comprobante.tipo as TipoDocumento,
    comprobante.fechaEmision,
  );
  const deadlineStr = deadlineResult.deadline.toISOString();
  console.log(`Calculated deadline: ${deadlineStr}`);

  // Directly queue the job in BullMQ
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`Connecting to Redis: ${redisUrl}`);
  
  // Parse redis connection parameters
  const urlObj = new URL(redisUrl);
  const redisConfig = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '6379', 10),
    ...(urlObj.username ? { username: urlObj.username } : {}),
    ...(urlObj.password ? { password: urlObj.password } : {}),
    maxRetriesPerRequest: null,
  };

  const queue = new Queue('cola-envio-cpe', {
    connection: redisConfig,
  });

  const remainingMs = new Date(deadlineStr).getTime() - Date.now();
  const urgent = remainingMs > 0 && remainingMs <= 6 * 60 * 60 * 1000;

  const jobOptions = {
    attempts: 4,
    backoff: { type: 'exponential', delay: 3 * 60 * 1000 },
    removeOnComplete: false,
    removeOnFail: false,
    jobId: `${id}-${intentoNumero}`,
    ...(urgent ? { priority: 1 } : {}),
  };

  console.log(`Adding job to BullMQ queue 'cola-envio-cpe'...`);
  const job = await queue.add(
    'enviar-comprobante',
    {
      comprobanteId: id,
      deadline: deadlineStr,
    },
    jobOptions,
  );

  console.log(`Job successfully queued with ID: ${job.id}`);

  await queue.close();
  await prisma.$disconnect();
  console.log('Disconnected from PostgreSQL and Redis.');
  console.log('SUCCESS: manual retry successfully triggered!');
}

main().catch(console.error);
