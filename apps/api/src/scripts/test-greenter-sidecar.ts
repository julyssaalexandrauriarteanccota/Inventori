import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { ConfigService } from '@nestjs/config';
import { AmbienteSunat } from '@erp/shared';
import { PrismaService } from '../database/prisma.service';
import { CertificadoDigitalService } from '../modules/facturacion/certificado-digital.service';
import { FiscalSecretsService } from '../modules/facturacion/fiscal-secrets.service';
import { GreenterGateway } from '../modules/facturacion/greenter.gateway';
import { SunatCredentialsService } from '../modules/facturacion/sunat-credentials.service';

async function main() {
  const id = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  const send = process.argv.includes('--send');
  const prisma = new PrismaService();
  await prisma.$connect();

  const comprobante = id
    ? await prisma.comprobante.findUnique({
        where: { id },
        include: {
          detallesFiscales: { orderBy: { item: 'asc' } },
          comprobanteOrigen: true,
        },
      })
    : await prisma.comprobante.findFirst({
        where: { tipo: { in: ['FACTURA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          detallesFiscales: { orderBy: { item: 'asc' } },
          comprobanteOrigen: true,
        },
      });

  if (!comprobante) {
    throw new Error('No hay comprobante para probar Greenter.');
  }

  const config = new ConfigService(process.env);
  const fiscalSecrets = new FiscalSecretsService(prisma);
  const credentials = new SunatCredentialsService(fiscalSecrets, config);
  const certificados = new CertificadoDigitalService(
    prisma,
    fiscalSecrets,
    null as never,
    credentials,
  );
  const greenter = new GreenterGateway(config, certificados, credentials);
  const ambiente =
    comprobante.ambiente === AmbienteSunat.PRODUCCION
      ? AmbienteSunat.PRODUCCION
      : AmbienteSunat.BETA;
  const payload = await greenter.buildPayload(
    comprobante as unknown as Record<string, unknown>,
    ambiente,
    send,
  );

  const baseUrl = config.get<string>('GREENTER_SERVICE_URL', 'http://localhost:8081');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/emitir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as Record<string, unknown>;
  const xmlBase64 = String(body.xml ?? '');
  const xml = xmlBase64
    ? Buffer.from(xmlBase64, 'base64').toString('utf8')
    : String(body.xmlText ?? '');

  console.log('=== GREENTER SIDECAR TEST ===');
  console.log('HTTP:', response.status);
  console.log('Comprobante:', comprobante.numero, comprobante.tipo, comprobante.estado);
  console.log('Send SUNAT:', send);
  console.log('Success:', body.success);
  console.log('Accepted:', body.accepted);
  console.log('File:', body.fileName);
  console.log('Diagnostico:', JSON.stringify(body.diagnostico ?? {}, null, 2));
  if (body.error) console.log('Error:', JSON.stringify(body.error, null, 2));
  if (body.cdr) console.log('CDR:', JSON.stringify(body.cdr, null, 2));
  console.log('XML bytes:', Buffer.byteLength(xml, 'utf8'));
  console.log('XML head:', xml.slice(0, 700).replace(/\s+/g, ' '));

  await prisma.$disconnect();

  if (!response.ok || body.success === false) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
