/**
 * Test: try sending to SUNAT BETA with the standard test RUC 20000000001
 * to eliminate certificate-specific issues.
 * Also try the standard demo RUC 20123456789.
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
import {
  FiscalSecretsService,
  EncryptedPayload,
} from '../modules/facturacion/fiscal-secrets.service';

const BETA_ENDPOINT =
  'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';

async function extractP12(buffer: Buffer, password: string) {
  const der = forge.util.createBuffer(buffer.toString('binary'));
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[
      forge.pki.oids.keyBag
    ] ?? []),
  ];
  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ??
    [];
  return {
    privateKeyPem: forge.pki.privateKeyToPem(keyBags[0].key!),
    certificatePem: forge.pki.certificateToPem(certBags[0].cert!),
  };
}

async function sendTest(
  label: string,
  ruc: string,
  signedXml: string,
  xmlFileName: string,
) {
  console.log(`\n===== ${label} =====`);
  const user = `${ruc}MODDATOS`;
  console.log(`RUC: ${ruc}, User: ${user}`);

  const zip = new AdmZip();
  zip.addFile(xmlFileName, Buffer.from(signedXml, 'latin1'));
  const zipFileName = xmlFileName.replace('.xml', '.zip');

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${user}</wsse:Username>
        <wsse:Password>MODDATOS</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${zipFileName}</fileName>
      <contentFile>${zip.toBuffer().toString('base64')}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(BETA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:sendBill',
    },
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
    console.log(`Response: ${text.slice(0, 500)}`);
  }
}

function signXml(
  xml: string,
  privateKeyPem: string,
  certificatePem: string,
): string {
  const cleanCert = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  const signer = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    getKeyInfoContent: () =>
      `<ds:X509Data><ds:X509Certificate>${cleanCert}</ds:X509Certificate></ds:X509Data>`,
  });
  signer.addReference({
    xpath: "/*[local-name(.)='Invoice']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: '',
    isEmptyUri: true,
  });
  signer.computeSignature(xml, {
    prefix: 'ds',
    location: {
      reference: "//*[local-name(.)='ExtensionContent']",
      action: 'append',
    },
  });
  return signer.getSignedXml();
}

function buildBoletaXml(ruc: string, numero: string): string {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
  const time = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Lima',
    hour12: false,
  });
  return `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${numero}</cbc:ID>
  <cbc:IssueDate>${today}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${ruc}-${numero}</cbc:ID>
    <cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${ruc}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name><![CDATA[TEST]]></cbc:Name></cac:PartyName></cac:SignatoryParty>
    <cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${ruc}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName><![CDATA[TEST SAC]]></cbc:RegistrationName><cac:RegistrationAddress><cbc:AddressTypeCode>0000</cbc:AddressTypeCode></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="1">00000000</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName><![CDATA[CLIENTE GENERICO]]></cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">11.80</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount>
    <cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">11.80</cbc:PriceAmount><cbc:PriceTypeCode>01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference>
    <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18</cbc:Percent><cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
    <cac:Item><cbc:Description><![CDATA[Producto de prueba]]></cbc:Description><cac:SellersItemIdentification><cbc:ID>PROD001</cbc:ID></cac:SellersItemIdentification><cac:CommodityClassification><cbc:ItemClassificationCode listID="UNSPSC" listAgencyName="GS1 US" listName="Item Classification">82101500</cbc:ItemClassificationCode></cac:CommodityClassification></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="PEN">10.00</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const fiscalSecrets = new FiscalSecretsService(prisma);
  const cert = await prisma.certificadoDigital.findFirst({
    where: { activo: true, revokedAt: null, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!cert) throw new Error('No cert');
  const privateRoot =
    process.env.FISCAL_PRIVATE_STORAGE_DIR ||
    resolve(process.cwd(), 'private-fiscal-storage');
  const encrypted = JSON.parse(
    await fs.readFile(path.join(privateRoot, cert.storageKey), 'utf8'),
  ) as EncryptedPayload;
  const p12Buffer = fiscalSecrets.decryptBuffer(encrypted);
  const p12Password = await fiscalSecrets.revealSecret(
    cert.passwordSecretRef!,
    'p12-password',
  );
  const { privateKeyPem, certificatePem } = await extractP12(
    p12Buffer,
    p12Password,
  );

  const REAL_RUC = '10013415116';
  const TEST_RUC = '20000000001';

  // Test 1: Real RUC with Boleta
  const xml1 = buildBoletaXml(REAL_RUC, 'B001-00000085');
  const signed1 = signXml(xml1, privateKeyPem, certificatePem);
  await sendTest(
    'Real RUC Boleta',
    REAL_RUC,
    signed1,
    `${REAL_RUC}-03-B001-00000085.xml`,
  );

  // Test 2: Real RUC with Factura (01)
  const xmlF = buildBoletaXml(REAL_RUC, 'F001-00000085').replace(
    '<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>',
    '<cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>',
  );
  const signedF = signXml(xmlF, privateKeyPem, certificatePem);
  await sendTest(
    'Real RUC Factura',
    REAL_RUC,
    signedF,
    `${REAL_RUC}-01-F001-00000085.xml`,
  );

  // Test 3: Test RUC 20000000001 with Boleta
  const xml3 = buildBoletaXml(TEST_RUC, 'B001-00000085');
  const signed3 = signXml(xml3, privateKeyPem, certificatePem);
  await sendTest(
    'Test RUC 20000000001',
    TEST_RUC,
    signed3,
    `${TEST_RUC}-03-B001-00000085.xml`,
  );

  // Test 4: Try with encoding=UTF-8 instead of ISO-8859-1
  const xml4 = buildBoletaXml(REAL_RUC, 'B001-00000084').replace(
    'encoding="ISO-8859-1"',
    'encoding="UTF-8"',
  );
  const signed4 = signXml(xml4, privateKeyPem, certificatePem);
  await sendTest(
    'UTF-8 encoding',
    REAL_RUC,
    signed4,
    `${REAL_RUC}-03-B001-00000084.xml`,
  );

  // Test 5: Try removing standalone="no"
  const xml5 = buildBoletaXml(REAL_RUC, 'B001-00000083').replace(
    ' standalone="no"',
    '',
  );
  const signed5 = signXml(xml5, privateKeyPem, certificatePem);
  await sendTest(
    'No standalone',
    REAL_RUC,
    signed5,
    `${REAL_RUC}-03-B001-00000083.xml`,
  );

  // Test 6: Try with schemeAgencyName on CustomizationID
  const xml6 = buildBoletaXml(REAL_RUC, 'B001-00000082').replace(
    '<cbc:CustomizationID>2.0</cbc:CustomizationID>',
    '<cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>',
  );
  const signed6 = signXml(xml6, privateKeyPem, certificatePem);
  await sendTest(
    'schemeAgencyName on CustomizationID',
    REAL_RUC,
    signed6,
    `${REAL_RUC}-03-B001-00000082.xml`,
  );

  await prisma.$disconnect();
  console.log('\n=== ALL DONE ===');
}

main().catch(console.error);
