/**
 * Minimal test: send a boleta XML directly to SUNAT BETA
 * to isolate the UBLVersionID 2074 error.
 *
 * Usage: pnpm --filter @erp/api exec tsx src/scripts/test-sunat-direct.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createHash } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');
import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';
import { ConfigService } from '@nestjs/config';

const BETA_ENDPOINT =
  'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';

// SUNAT BETA credentials are always RUC+MODDATOS / MODDATOS
const RUC = '10013415116';
const BETA_USER = `${RUC}MODDATOS`;
const BETA_PASS = 'MODDATOS';

function buildSendBillEnvelope(
  username: string,
  password: string,
  fileName: string,
  contentBase64: string,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password>${password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${fileName}</fileName>
      <contentFile>${contentBase64}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildZip(xmlFileName: string, xmlContent: string): Buffer {
  const zip = new AdmZip();
  zip.addFile(xmlFileName, Buffer.from(xmlContent, 'latin1'));
  return zip.toBuffer();
}

async function main() {
  console.log('=== SUNAT BETA DIRECT TEST ===');
  console.log(`Endpoint: ${BETA_ENDPOINT}`);
  console.log(`Username: ${BETA_USER}`);
  console.log(`Password: ${BETA_PASS}`);

  // 1) Read the latest signed XML from MinIO
  const prisma = new PrismaService();
  await prisma.$connect();

  const configService = new ConfigService(process.env);
  const storage = new FiscalStorageService(configService);

  const comp = await prisma.comprobante.findFirst({
    where: { numero: 'B001-00000007' },
  });

  if (!comp?.xmlStorageKey) {
    console.error('No xmlStorageKey for B001-00000007');
    await prisma.$disconnect();
    return;
  }

  const signedXml = await storage.readObjectText(comp.xmlStorageKey, 'latin1');
  if (!signedXml) {
    console.error('XML content is empty');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nXML length: ${signedXml.length}`);
  console.log(`XML SHA256: ${createHash('sha256').update(Buffer.from(signedXml, 'latin1')).digest('hex')}`);

  // Extract key tags for diagnostics
  const ublVer = signedXml.match(/<cbc:UBLVersionID>(.*?)<\/cbc:UBLVersionID>/)?.[1];
  const custId = signedXml.match(/<cbc:CustomizationID[^>]*>(.*?)<\/cbc:CustomizationID>/)?.[1];
  const encoding = signedXml.match(/<\?xml[^?]*encoding="([^"]+)"/)?.[1];
  const rootTag = signedXml.match(/<([A-Za-z]+)\s/)?.[1];
  console.log(`Encoding: ${encoding}`);
  console.log(`Root tag: ${rootTag}`);
  console.log(`UBLVersionID: ${ublVer}`);
  console.log(`CustomizationID: ${custId}`);

  // 2) Build ZIP with the stored signed XML
  const xmlFileName = `${RUC}-03-B001-00000007.xml`;
  const zipBuffer = buildZip(xmlFileName, signedXml);
  const zipFileName = `${RUC}-03-B001-00000007.zip`;
  console.log(`\nZIP file: ${zipFileName}`);
  console.log(`ZIP size: ${zipBuffer.length}`);

  // 3) Send to SUNAT BETA with MODDATOS credentials
  console.log('\n--- Sending with MODDATOS credentials ---');
  const envelope = buildSendBillEnvelope(
    BETA_USER,
    BETA_PASS,
    zipFileName,
    zipBuffer.toString('base64'),
  );

  try {
    const response = await fetch(BETA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'urn:sendBill',
      },
      body: envelope,
    });

    console.log(`HTTP Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`Response length: ${responseText.length}`);
    console.log(`\nFull SOAP Response:\n${responseText}`);
  } catch (err) {
    console.error('Request error:', err);
  }

  // 4) Also try with the credentials the system is using from DB
  console.log('\n\n--- Now checking what credentials the system uses ---');
  try {
    // Import dynamically to avoid import issues
    const { SunatCredentialsService } = await import(
      '../modules/facturacion/sunat-credentials.service'
    );
    const { FiscalSecretsService } = await import(
      '../modules/facturacion/fiscal-secrets.service'
    );
    
    const fiscalSecrets = new FiscalSecretsService(prisma);
    const credService = new SunatCredentialsService(fiscalSecrets, configService);
    
    const status = await credService.getSafeStatus(RUC);
    console.log('Credentials status:', JSON.stringify(status, null, 2));
    
    if (status.configured) {
      const creds = await credService.resolveCredentials(RUC);
      console.log(`Source: ${creds.source}`);
      console.log(`Username mode: ${creds.usernameMode}`);
      console.log(`Username: ${creds.username}`);
      // Don't print password in full
      console.log(`Password length: ${creds.password.length}`);
      console.log(`Password first 3 chars: ${creds.password.slice(0, 3)}...`);
    }
  } catch (err) {
    console.log('Could not check system credentials:', (err as Error).message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
