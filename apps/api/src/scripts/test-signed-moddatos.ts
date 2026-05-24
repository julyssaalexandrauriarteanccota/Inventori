/**
 * Test: send the SIGNED boleta from storage using correct MODDATOS credentials.
 * The previous test showed the system was using wrong credentials (from FiscalSecrets DB).
 * Let's see if MODDATOS + correct signed XML works.
 *
 * Usage: pnpm --filter @erp/api exec tsx src/scripts/test-signed-moddatos.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');
import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

const BETA_ENDPOINT =
  'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';

const RUC = '10013415116';

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
  const prisma = new PrismaService();
  await prisma.$connect();

  const configService = new ConfigService(process.env);
  const storage = new FiscalStorageService(configService);

  // Read the latest signed XML from storage
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

  console.log(`XML length: ${signedXml.length}`);
  console.log(`SHA256: ${createHash('sha256').update(Buffer.from(signedXml, 'latin1')).digest('hex')}`);

  const xmlFileName = `${RUC}-03-B001-00000007.xml`;
  const zipBuffer = buildZip(xmlFileName, signedXml);
  const zipFileName = xmlFileName.replace('.xml', '.zip');

  // Credential combinations to test
  const credentials = [
    { label: 'MODDATOS', user: `${RUC}MODDATOS`, pass: 'MODDATOS' },
    { label: 'moddatos (lowercase)', user: `${RUC}moddatos`, pass: 'moddatos' },
  ];

  for (const cred of credentials) {
    console.log(`\n=== ${cred.label} ===`);
    console.log(`Username: ${cred.user}`);

    const envelope = buildSendBillEnvelope(
      cred.user,
      cred.pass,
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

      const faultCode = responseText.match(/<faultcode>(.*?)<\/faultcode>/)?.[1];
      const faultString = responseText.match(/<faultstring>(.*?)<\/faultstring>/)?.[1];

      if (faultCode) {
        console.log(`FAULT: ${faultCode}`);
        console.log(`MSG: ${faultString}`);
      } else {
        // Check for successful response
        const appResponse = responseText.match(/<applicationResponse>(.*?)<\/applicationResponse>/s)?.[1];
        if (appResponse) {
          console.log('SUCCESS! Got applicationResponse');
          // Try to decode the CDR
          try {
            const cdrBuffer = Buffer.from(appResponse, 'base64');
            const cdrZip = new AdmZip(cdrBuffer);
            const cdrEntries = cdrZip.getEntries();
            console.log(`CDR entries: ${cdrEntries.map(e => e.entryName).join(', ')}`);
            for (const entry of cdrEntries) {
              const cdrXml = entry.getData().toString('utf-8');
              const responseCode = cdrXml.match(/<cbc:ResponseCode>(.*?)<\/cbc:ResponseCode>/)?.[1];
              const description = cdrXml.match(/<cbc:Description>(.*?)<\/cbc:Description>/)?.[1];
              console.log(`CDR ResponseCode: ${responseCode}`);
              console.log(`CDR Description: ${description}`);
            }
          } catch (e) {
            console.log('Error decoding CDR:', e);
          }
        } else {
          console.log('Unexpected response:');
          console.log(responseText.slice(0, 500));
        }
      }
    } catch (err) {
      console.error('Request error:', err);
    }
  }

  // Also test with the WRONG credentials that the system was using
  console.log('\n=== DB Credentials (what system uses) ===');
  try {
    const { SunatCredentialsService } = await import(
      '../modules/facturacion/sunat-credentials.service'
    );
    const { FiscalSecretsService } = await import(
      '../modules/facturacion/fiscal-secrets.service'
    );
    
    const fiscalSecrets = new FiscalSecretsService(prisma);
    const credService = new SunatCredentialsService(fiscalSecrets, configService);
    const creds = await credService.resolveCredentials(RUC);

    console.log(`Username: ${creds.username}`);
    console.log(`Password length: ${creds.password.length}`);

    const envelope = buildSendBillEnvelope(
      creds.username,
      creds.password,
      zipFileName,
      zipBuffer.toString('base64'),
    );

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
    const faultCode = responseText.match(/<faultcode>(.*?)<\/faultcode>/)?.[1];
    const faultString = responseText.match(/<faultstring>(.*?)<\/faultstring>/)?.[1];
    if (faultCode) {
      console.log(`FAULT: ${faultCode}`);
      console.log(`MSG: ${faultString}`);
    } else {
      console.log(responseText.slice(0, 500));
    }
  } catch (err) {
    console.log('Error with DB credentials:', (err as Error).message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
