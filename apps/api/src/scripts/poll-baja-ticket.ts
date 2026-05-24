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
import { SunatDirectGateway } from '../modules/facturacion/sunat-direct.gateway';

async function main() {
  const identificadorBaja = process.argv[2] ?? 'RA-20260522-001';
  const engine = (process.argv[3] ?? 'greenter').toLowerCase();
  const prisma = new PrismaService();
  await prisma.$connect();

  const comunicacion = await prisma.comunicacionBaja.findFirst({
    where: { identificadorBaja },
    include: { comprobante: true },
  });
  if (!comunicacion?.ticketSunat) {
    throw new Error(`La baja ${identificadorBaja} no tiene ticket SUNAT.`);
  }

  const config = new ConfigService(process.env);
  const secrets = new FiscalSecretsService(prisma);
  const credentials = new SunatCredentialsService(secrets, config);
  const direct = new SunatDirectGateway(config, credentials);

  const result =
    engine === 'direct'
      ? await direct.getStatus({
          ruc: comunicacion.comprobante.emisorRuc ?? '',
          ticket: comunicacion.ticketSunat,
          ambiente: AmbienteSunat.BETA,
        })
      : await new GreenterGateway(
          config,
          new CertificadoDigitalService(prisma, secrets, direct, credentials),
          credentials,
        ).consultarTicketBaja(comunicacion as never, AmbienteSunat.BETA);

  console.log(
    JSON.stringify(
      {
        engine,
        identificadorBaja,
        ticket: comunicacion.ticketSunat,
        accepted: result.accepted,
        codigoRespuesta: result.codigoRespuesta,
        mensaje: result.mensaje,
        hasCdr: !!result.cdrContent,
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
