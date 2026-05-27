import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { ConfigService } from '@nestjs/config';
import { AmbienteSunat } from '@erp/shared';
import { PrismaService } from '../database/prisma.service';
import { CertificadoDigitalService } from '../modules/facturacion/certificado-digital.service';
import { FiscalSecretsService } from '../modules/facturacion/fiscal-secrets.service';
import { SunatCredentialsService } from '../modules/facturacion/sunat-credentials.service';
import { SunatDirectGateway } from '../modules/facturacion/sunat-direct.gateway';
import { SunatXmlSigner } from '../modules/facturacion/sunat-xml.signer';

const xmlPath = path.resolve(process.argv[2] ?? '');
const mode = process.argv[3] ?? 'configured';
const variant = process.argv[4] ?? 'original';

function inferFromFileName(filePath: string) {
  const xmlFileName = path.basename(filePath);
  const fileName = xmlFileName.replace(/\.xml$/i, '');
  const match = fileName.match(/^(\d{11})-(\d{2})-/);
  if (!match) {
    throw new Error(
      `El nombre del XML debe iniciar con RUC-TIPO-, recibido: ${xmlFileName}`,
    );
  }

  return { ruc: match[1], tipo: match[2], fileName, xmlFileName };
}

async function main() {
  if (!xmlPath)
    throw new Error(
      'Uso: tsx send-raw-sunat-xml.ts <xml> [configured|moddatos]',
    );
  if (!fs.existsSync(xmlPath)) throw new Error(`XML no encontrado: ${xmlPath}`);

  const inferred = inferFromFileName(xmlPath);
  const buffer = fs.readFileSync(xmlPath);
  const header = buffer.subarray(0, 128).toString('latin1');
  const originalXml = /encoding=["']UTF-?8["']/i.test(header)
    ? buffer.toString('utf8').replace(/^\uFEFF/, '')
    : buffer.toString('latin1');
  let ruc = inferred.ruc;
  let tipo = inferred.tipo;
  let fileName = inferred.fileName;
  let xmlFileName = inferred.xmlFileName;
  let signedXml =
    variant === 'no-due-date'
      ? originalXml.replace(/\r?\n\s*<cbc:DueDate>.*?<\/cbc:DueDate>/, '')
      : originalXml;
  const config = new ConfigService(process.env);
  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    const secrets = new FiscalSecretsService(prisma);
    const credentials = new SunatCredentialsService(secrets, config);
    const gateway =
      mode === 'moddatos'
        ? new SunatDirectGateway(config, {
            resolveCredentials: async (credentialRuc: string) => ({
              username: `${credentialRuc}MODDATOS`,
              password: 'moddatos',
              source: 'ENV' as const,
              usernameMode: 'RUC_PLUS_SOL_USER' as const,
            }),
          } as SunatCredentialsService)
        : new SunatDirectGateway(config, credentials);

    if (
      variant === 'resign-template' ||
      variant === 'resign-template-clean' ||
      variant === 'resign-template-keep-note-clean' ||
      variant === 'resign-template-note-no-attr-clean' ||
      variant === 'resign-template-preserve-name'
    ) {
      ruc = inferred.ruc;
      tipo = inferred.tipo;
      if (variant !== 'resign-template-preserve-name') {
        fileName = `${ruc}-${tipo}-B993-00999991`;
        xmlFileName = `${fileName}.xml`;
      }
      const templateXml = originalXml
        .replace(/\r?\n\s*<cbc:DueDate>.*?<\/cbc:DueDate>/, '')
        .replace(
          variant === 'resign-template-keep-note-clean' ||
            variant === 'resign-template-note-no-attr-clean' ||
            variant === 'resign-template-preserve-name'
            ? /$a/
            : /\r?\n\s*<cbc:Note\b[^>]*>.*?<\/cbc:Note>/,
          '',
        )
        .replace(
          variant === 'resign-template-note-no-attr-clean' ||
            variant === 'resign-template-preserve-name'
            ? /\s+languageLocaleID="[^"]*"/g
            : /$a/,
          '',
        )
        .replace(
          variant === 'resign-template-preserve-name'
            ? /$a/
            : /<cbc:ID>BBB1-1<\/cbc:ID>/,
          '<cbc:ID>B993-00999991</cbc:ID>',
        )
        .replace(/<ds:Signature\b[\s\S]*?<\/ds:Signature>/, '')
        .replace(/\s+unitCodeListID="[^"]*"/g, '')
        .replace(/\s+unitCodeListAgencyName="[^"]*"/g, '')
        .replace(
          /<ext:ExtensionContent>\s*<\/ext:ExtensionContent>/,
          '<ext:ExtensionContent></ext:ExtensionContent>',
        );
      const signer = new SunatXmlSigner(
        new CertificadoDigitalService(prisma, secrets, gateway, credentials),
      );
      signedXml = (await signer.sign(templateXml)).signedXml;
    }

    console.log(
      JSON.stringify(
        {
          xmlPath,
          xmlFileName,
          fileName,
          ruc,
          tipo,
          mode,
          variant,
          bytes: buffer.length,
          firstBytesHex: buffer.subarray(0, 24).toString('hex'),
          firstLine: signedXml.split(/\r?\n/, 1)[0],
          credentials:
            mode === 'moddatos'
              ? {
                  configured: true,
                  source: 'ENV',
                  usernameMode: 'RUC_PLUS_SOL_USER',
                  usernamePreview: `${ruc.slice(0, 2)}***OS`,
                }
              : await credentials.getSafeStatus(ruc),
        },
        null,
        2,
      ),
    );

    const result = await gateway.sendBill({
      ruc,
      fileName,
      xmlFileName,
      signedXml,
      ambiente: AmbienteSunat.BETA,
    });

    console.log(
      JSON.stringify(
        {
          accepted: result.accepted,
          codigoRespuesta: result.codigoRespuesta,
          mensaje: result.mensaje,
          requestPayload: result.requestPayload,
          responsePayload: result.responsePayload,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
