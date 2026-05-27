import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { ConfigService } from '@nestjs/config';
import {
  calcularDeadlineComunicacionBaja,
  EstadoComprobante,
  TipoEnvio,
} from '@erp/shared';
import { PrismaService } from '../database/prisma.service';
import { ComprobanteEmailService } from '../modules/facturacion/comprobante-email.service';
import { ComprobantePdfService } from '../modules/facturacion/comprobante-pdf.service';
import { CertificadoDigitalService } from '../modules/facturacion/certificado-digital.service';
import { FiscalSecretsService } from '../modules/facturacion/fiscal-secrets.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';
import { GreenterGateway } from '../modules/facturacion/greenter.gateway';
import { SunatCredentialsService } from '../modules/facturacion/sunat-credentials.service';
import { SunatDirectGateway } from '../modules/facturacion/sunat-direct.gateway';
import { SunatPayloadBuilder } from '../modules/facturacion/sunat-payload.builder';
import { SunatProcessor } from '../modules/facturacion/sunat.processor';
import { SunatXmlSigner } from '../modules/facturacion/sunat-xml.signer';

const MOTIVO = 'Anulación fiscal de prueba Greenter';

function todayRaPrefix() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `RA-${yyyy}${mm}${dd}`;
}

async function main() {
  process.env.SUNAT_ENGINE = 'GREENTER';
  const comprobanteId = process.argv[2];
  if (!comprobanteId) {
    throw new Error(
      'Uso: tsx src/scripts/run-greenter-baja-once.ts <comprobanteId>',
    );
  }

  const prisma = new PrismaService();
  await prisma.$connect();

  const comprobante = await prisma.comprobante.findUnique({
    where: { id: comprobanteId },
  });
  if (!comprobante) {
    throw new Error(`Comprobante ${comprobanteId} no encontrado.`);
  }
  if (comprobante.tipo === 'BOLETA') {
    throw new Error(
      'Las boletas se anulan con nota de crédito, no con comunicación de baja RA.',
    );
  }
  let comunicacion = await prisma.comunicacionBaja.findFirst({
    where: { comprobanteId, estado: { in: ['PENDIENTE', 'EN_PROCESO'] } },
    orderBy: { createdAt: 'desc' },
  });

  if (!comunicacion && comprobante.estado !== EstadoComprobante.ACEPTADO) {
    throw new Error(
      `El comprobante ${comprobante.numero} debe estar ACEPTADO; estado actual: ${comprobante.estado}.`,
    );
  }

  if (!comunicacion) {
    const prefix = todayRaPrefix();
    const countToday = await prisma.comunicacionBaja.count({
      where: { identificadorBaja: { startsWith: `${prefix}-` } },
    });
    const identificadorBaja = `${prefix}-${String(countToday + 1).padStart(3, '0')}`;
    const deadline = calcularDeadlineComunicacionBaja(
      comprobante.cdrRecibidaAt ?? comprobante.fechaEmision,
    ).deadline;

    comunicacion = await prisma.$transaction(async (tx) => {
      const created = await tx.comunicacionBaja.create({
        data: {
          comprobanteId,
          identificadorBaja,
          motivo: MOTIVO,
          fechaReferencia: comprobante.fechaEmision,
          deadline,
          iniciadoPor: 'script-greenter',
        },
      });
      await tx.comprobante.update({
        where: { id: comprobanteId },
        data: { estado: EstadoComprobante.BAJA_PENDIENTE },
      });
      await tx.comprobanteEnvioLog.create({
        data: {
          comprobanteId,
          tipo: TipoEnvio.COMUNICACION_BAJA,
          proveedor: 'GREENTER',
          tipoEvento: 'COMUNICACION_BAJA_CREADA',
          estado: EstadoComprobante.BAJA_PENDIENTE,
          intento: 1,
          mensaje: `Comunicación de baja ${identificadorBaja} pendiente de envío a SUNAT`,
        },
      });
      return created;
    });
  }

  const config = new ConfigService(process.env);
  const fiscalSecrets = new FiscalSecretsService(prisma);
  const credentials = new SunatCredentialsService(fiscalSecrets, config);
  const directGateway = new SunatDirectGateway(config, credentials);
  const certificados = new CertificadoDigitalService(
    prisma,
    fiscalSecrets,
    directGateway,
    credentials,
  );
  const storage = new FiscalStorageService(config);
  const pdf = new ComprobantePdfService();
  const email = new ComprobanteEmailService(prisma, config, storage);
  const greenter = new GreenterGateway(config, certificados, credentials);
  const events = {
    emitToRoles: (roles: unknown[], event: string, payload: unknown) => {
      console.log('EVENT', event, JSON.stringify({ roles, payload }));
    },
  };
  const queue = {
    add: async (name: string, data: unknown) => {
      console.log('QUEUE', name, JSON.stringify(data));
    },
  };

  const processor = new SunatProcessor(
    prisma,
    config,
    events as never,
    null as never,
    storage,
    pdf,
    email,
    queue as never,
    new SunatPayloadBuilder(),
    new SunatXmlSigner(certificados),
    directGateway,
    greenter,
  );

  console.log('=== GREENTER BAJA REAL SEND ===');
  console.log('Comprobante:', comprobante.numero, comprobante.tipo);
  console.log('Baja:', comunicacion.identificadorBaja, comunicacion.estado);
  const deadline =
    comunicacion.deadline?.toISOString() ??
    new Date(Date.now() + 86_400_000).toISOString();

  await processor.comunicarBaja({
    comunicacionBajaId: comunicacion.id,
    deadline,
  });

  const afterSend = await prisma.comunicacionBaja.findUnique({
    where: { id: comunicacion.id },
  });
  console.log('=== RESULTADO ENVIO ===');
  console.log(
    JSON.stringify(
      {
        identificadorBaja: afterSend?.identificadorBaja,
        estado: afterSend?.estado,
        ticketSunat: afterSend?.ticketSunat,
        errorMessage: afterSend?.errorMessage,
        xmlStorageKey: afterSend?.xmlStorageKey,
      },
      null,
      2,
    ),
  );

  if (afterSend?.ticketSunat) {
    await processor.consultarTicketBaja({
      comunicacionBajaId: comunicacion.id,
      deadline,
      intento: 1,
    });
  }

  const afterPoll = await prisma.comunicacionBaja.findUnique({
    where: { id: comunicacion.id },
    include: {
      comprobante: {
        select: {
          numero: true,
          estado: true,
          cdrStorageKey: true,
        },
      },
    },
  });
  console.log('=== RESULTADO POLL ===');
  console.log(
    JSON.stringify(
      {
        identificadorBaja: afterPoll?.identificadorBaja,
        estado: afterPoll?.estado,
        ticketSunat: afterPoll?.ticketSunat,
        cdrCodigo: afterPoll?.cdrCodigo,
        cdrMensaje: afterPoll?.cdrMensaje,
        errorMessage: afterPoll?.errorMessage,
        xmlStorageKey: afterPoll?.xmlStorageKey,
        cdrStorageKey: afterPoll?.cdrStorageKey,
        comprobante: afterPoll?.comprobante,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
