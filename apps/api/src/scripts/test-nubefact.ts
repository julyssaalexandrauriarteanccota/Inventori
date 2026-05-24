/**
 * Test: Send the REAL Nubefact XML to SUNAT BETA as-is
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');

const BETA_ENDPOINT = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const RUC = '10013415116';
const BETA_USER = `${RUC}MODDATOS`;
const BETA_PASS = 'MODDATOS';

async function main() {
  // Read the real Nubefact XML
  const xmlPath = path.join(__dirname, '../../../../10013415116-03-BBB1-1.xml');
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  
  console.log('=== Real Nubefact XML ===');
  console.log(`Length: ${xmlContent.length}`);
  console.log(`Encoding declared: ${xmlContent.match(/encoding="([^"]+)"/)?.[1]}`);
  console.log(`UBLVersionID: ${xmlContent.match(/<cbc:UBLVersionID>(.*?)<\/cbc:UBLVersionID>/)?.[1]}`);
  console.log(`Has ds:Signature: ${xmlContent.includes('<ds:Signature')}`);
  console.log(`Signature Id: ${xmlContent.match(/<ds:Signature\s+Id="([^"]+)"/)?.[1]}`);
  console.log(`Has xsi namespace: ${xmlContent.includes('xmlns:xsi')}`);
  console.log(`Has xsd namespace: ${xmlContent.includes('xmlns:xsd')}`);
  console.log(`Has ccts namespace: ${xmlContent.includes('xmlns:ccts')}`);
  console.log(`Has qdt namespace: ${xmlContent.includes('xmlns:qdt')}`);
  console.log(`Has udt namespace: ${xmlContent.includes('xmlns:udt')}`);

  const xmlFileName = '10013415116-03-BBB1-1.xml';
  const zipFileName = '10013415116-03-BBB1-1.zip';

  // Build ZIP
  const zip = new AdmZip();
  zip.addFile(xmlFileName, Buffer.from(xmlContent, 'utf-8'));
  const zipBuffer = zip.toBuffer();

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${BETA_USER}</wsse:Username>
        <wsse:Password>${BETA_PASS}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${zipFileName}</fileName>
      <contentFile>${zipBuffer.toString('base64')}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log('\nSending to SUNAT BETA...');
  const response = await fetch(BETA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'urn:sendBill' },
    body: envelope,
  });

  console.log(`HTTP Status: ${response.status}`);
  const text = await response.text();
  const faultCode = text.match(/<faultcode>(.*?)<\/faultcode>/)?.[1];
  const faultString = text.match(/<faultstring>(.*?)<\/faultstring>/)?.[1];
  if (faultCode) {
    console.log(`FAULT: ${faultCode}`);
    console.log(`MSG: ${faultString}`);
  } else {
    const appResponse = text.match(/<applicationResponse>(.*?)<\/applicationResponse>/s)?.[1];
    if (appResponse) {
      console.log('SUCCESS! Got CDR!');
      const cdrZip = new AdmZip(Buffer.from(appResponse, 'base64'));
      for (const entry of cdrZip.getEntries()) {
        const cdrXml = entry.getData().toString('utf-8');
        const responseCode = cdrXml.match(/<cbc:ResponseCode>(.*?)<\/cbc:ResponseCode>/)?.[1];
        const description = cdrXml.match(/<cbc:Description>(.*?)<\/cbc:Description>/)?.[1];
        console.log(`CDR ResponseCode: ${responseCode}`);
        console.log(`CDR Description: ${description}`);
      }
    } else {
      console.log(`Response: ${text.slice(0, 500)}`);
    }
  }
}

main().catch(console.error);
