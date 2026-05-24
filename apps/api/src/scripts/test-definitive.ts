/**
 * DEFINITIVE TEST: ISO-8859-1 + standalone="no" + correct filename matching
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { promises as fs } from 'fs';
import { resolve } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { PrismaService } from '../database/prisma.service';
import { FiscalSecretsService, EncryptedPayload } from '../modules/facturacion/fiscal-secrets.service';

const BETA = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const RUC = '10013415116';

async function extractP12(buffer: Buffer, password: string) {
  const der = forge.util.createBuffer(buffer.toString('binary'));
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  const k = [...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []), ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [])];
  const c = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  return { pk: forge.pki.privateKeyToPem(k[0]!.key!), cert: forge.pki.certificateToPem(c[0]!.cert!) };
}

async function send(label: string, xml: string, fn: string, encoding: BufferEncoding = 'utf-8') {
  const z = new AdmZip(); z.addFile(fn, Buffer.from(xml, encoding));
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

function sign(xml: string, pk: string, cert: string): string {
  const cc = cert.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s+/g, '');
  const s = new SignedXml({ privateKey: pk, publicCert: cert, signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256', canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#', getKeyInfoContent: () => `<ds:X509Data><ds:X509Certificate>${cc}</ds:X509Certificate></ds:X509Data>` });
  s.addReference({ xpath: "/*[local-name(.)='Invoice']", transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'], digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256', uri: '', isEmptyUri: true });
  s.computeSignature(xml, { prefix: 'ds', location: { reference: "//*[local-name(.)='ExtensionContent']", action: 'append' } });
  return s.getSignedXml();
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const fiscalSecrets = new FiscalSecretsService(prisma);
  const cert2 = await prisma.certificadoDigital.findFirst({ where: { activo: true, revokedAt: null, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!cert2) throw new Error('No cert');
  const pr = process.env.FISCAL_PRIVATE_STORAGE_DIR || resolve(process.cwd(), 'private-fiscal-storage');
  const enc = JSON.parse(await fs.readFile(path.join(pr, cert2.storageKey), 'utf8')) as EncryptedPayload;
  const p12 = fiscalSecrets.decryptBuffer(enc);
  const pw = await fiscalSecrets.revealSecret(cert2.passwordSecretRef!, 'p12-password');
  const { pk, cert } = await extractP12(p12, pw);

  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Lima', hour12: false });
  const NUM = 'B001-00000055';
  const FN = `${RUC}-03-B001-00000055.xml`;

  // ISO-8859-1 + standalone="no" with MATCHING filename - SAME minimal XML
  const xmlISO = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${NUM}</cbc:ID>
  <cbc:IssueDate>${d}</cbc:IssueDate>
  <cbc:IssueTime>${t}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature><cbc:ID>${RUC}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>TEST</cbc:Name></cac:PartyName></cac:SignatoryParty><cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>TEST SAC</cbc:RegistrationName><cac:RegistrationAddress><cbc:AddressTypeCode>0000</cbc:AddressTypeCode></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="1">00000000</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>CLIENTE</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">11.80</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="NIU">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">11.80</cbc:PriceAmount><cbc:PriceTypeCode>01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18</cbc:Percent><cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:Item><cbc:Description>Producto</cbc:Description></cac:Item><cac:Price><cbc:PriceAmount currencyID="PEN">10.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;

  // UTF-8, no standalone
  const xmlUTF = xmlISO.replace('encoding="ISO-8859-1" standalone="no"', 'encoding="UTF-8"');

  // ZIP with latin1 for ISO-8859-1
  const signedISO = sign(xmlISO, pk, cert);
  await send('T1 - ISO-8859-1 + latin1 zip', signedISO, FN, 'latin1');

  // Same but zipped as utf-8
  await send('T2 - ISO-8859-1 + utf8 zip', signedISO, FN.replace('55', '56'), 'utf-8');

  // UTF-8
  const NUM2 = 'B001-00000057';
  const FN2 = `${RUC}-03-B001-00000057.xml`;
  const xmlUTF2 = xmlISO.replace('encoding="ISO-8859-1" standalone="no"', 'encoding="UTF-8"').replace('B001-00000055', NUM2);
  const signedUTF = sign(xmlUTF2, pk, cert);
  await send('T3 - UTF-8 + utf8 zip', signedUTF, FN2, 'utf-8');

  await prisma.$disconnect();
}

main().catch(console.error);
