/**
 * Send the Nubefact XML without DueDate, and also same ID/content match
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');

const BETA = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const RUC = '10013415116';

async function send(label: string, xml: string, fn: string) {
  const z = new AdmZip(); z.addFile(fn, Buffer.from(xml, 'utf-8'));
  const e = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${RUC}MODDATOS</wsse:Username><wsse:Password>MODDATOS</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><ser:sendBill><fileName>${fn.replace('.xml','.zip')}</fileName><contentFile>${z.toBuffer().toString('base64')}</contentFile></ser:sendBill></soapenv:Body></soapenv:Envelope>`;
  const r = await fetch(BETA, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'urn:sendBill' }, body: e });
  const t = await r.text();
  const fc = t.match(/<faultcode>(.*?)<\/faultcode>/)?.[1] || 'NONE';
  const fm = t.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || '';
  const rc = t.match(/<cbc:ResponseCode>(.*?)<\/cbc:ResponseCode>/)?.[1];
  const desc = t.match(/<cbc:Description>(.*?)<\/cbc:Description>/)?.[1];
  console.log(`\n=== ${label} ===`);
  if (rc) { console.log(`SUCCESS! RC=${rc} Desc=${desc}`); }
  else { console.log(`FAULT: ${fc}`); console.log(`MSG: ${fm}`); }
}

async function main() {
  // Read original Nubefact XML
  const original = fs.readFileSync('c:\\Inventori\\10013415116-03-BBB1-1.xml', 'utf-8');
  
  // Remove DueDate line and change ID to BBB1-2
  const noDueDate = original
    .replace(/\s*<cbc:DueDate>.*?<\/cbc:DueDate>\s*/g, '\n')
    .replace('<cbc:ID>BBB1-1</cbc:ID>', '<cbc:ID>BBB1-2</cbc:ID>');
  
  console.log('Has DueDate?', noDueDate.includes('DueDate'));
  console.log('ID:', noDueDate.match(/<cbc:ID>(.*?)<\/cbc:ID>/)?.[1]);
  
  await send('Nubefact XML without DueDate', noDueDate, `${RUC}-03-BBB1-2.xml`);
  
  // Also try removing languageLocaleID from Note
  const noNote = noDueDate.replace(/<cbc:Note languageLocaleID="1000">.*?<\/cbc:Note>\s*/g, '');
  console.log('\nHas Note?', noNote.includes('cbc:Note'));
  await send('Nubefact XML no DueDate no Note', noNote, `${RUC}-03-BBB1-3.xml`);
}

main().catch(console.error);
