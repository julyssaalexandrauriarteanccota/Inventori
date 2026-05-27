import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { ConfigService } from '@nestjs/config';
import { calcularDeadlineEnvio, TipoDocumento } from '@erp/shared';
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

async function main() {
  process.env.SUNAT_ENGINE = 'GREENTER';
  const comprobanteId = process.argv[2];
  if (!comprobanteId) {
    throw new Error(
      'Uso: tsx src/scripts/run-greenter-worker-once.ts <comprobanteId>',
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

  const processor = new SunatProcessor(
    prisma,
    config,
    events as never,
    null as never,
    storage,
    pdf,
    email,
    null as never,
    new SunatPayloadBuilder(),
    new SunatXmlSigner(certificados),
    directGateway,
    greenter,
  );
  const deadline = calcularDeadlineEnvio(
    comprobante.tipo as TipoDocumento,
    comprobante.fechaEmision,
  ).deadline.toISOString();

  console.log('=== GREENTER WORKER REAL SEND ===');
  console.log(
    'Comprobante:',
    comprobante.numero,
    comprobante.tipo,
    comprobante.estado,
  );
  await (
    processor as unknown as {
      enviarComprobante: (payload: {
        comprobanteId: string;
        deadline: string;
      }) => Promise<void>;
    }
  ).enviarComprobante({ comprobanteId, deadline });

  const after = await prisma.comprobante.findUnique({
    where: { id: comprobanteId },
    include: {
      envioLogs: { orderBy: { fecha: 'desc' }, take: 3 },
    },
  });
  console.log('=== RESULTADO DB ===');
  console.log(
    JSON.stringify(
      {
        numero: after?.numero,
        estado: after?.estado,
        codigoSunat: after?.codigoSunat,
        mensajeSunat: after?.mensajeSunat,
        xmlStorageKey: after?.xmlStorageKey,
        cdrStorageKey: after?.cdrStorageKey,
        pdfStorageKey: after?.pdfStorageKey,
        logs: after?.envioLogs.map((log) => ({
          tipoEvento: log.tipoEvento,
          estado: log.estado,
          responseCode: log.responseCode,
          responseDescription: log.responseDescription,
          errorMessage: log.errorMessage,
        })),
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
