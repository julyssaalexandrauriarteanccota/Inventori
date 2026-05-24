/**
 * DEFINITIVE TEST: Build + Sign + Send a minimal Boleta to SUNAT BETA
 * Uses the real certificate from the DB, signs with xml-crypto,
 * and sends with MODDATOS credentials.
 *
 * Usage: pnpm --filter @erp/api exec tsx src/scripts/test-full-pipeline.ts
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
const RUC = '10013415116';
const BETA_USER = `${RUC}MODDATOS`;
const BETA_PASS = 'MODDATOS';

async function extractP12KeyMaterial(buffer: Buffer, password: string) {
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
    p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ] ?? [];
  const privateKey = keyBags[0]?.key;
  const certificate = certBags[0]?.cert;
  if (!privateKey || !certificate)
    throw new Error('PKCS#12 sin clave privada o certificado');
  return {
    privateKeyPem: forge.pki.privateKeyToPem(privateKey),
    certificatePem: forge.pki.certificateToPem(certificate),
  };
}

function resolvePrivateStoragePath(storageKey: string) {
  const privateRoot =
    process.env.FISCAL_PRIVATE_STORAGE_DIR ||
    resolve(process.cwd(), 'private-fiscal-storage');
  return path.join(privateRoot, storageKey);
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
    xpath:
      "/*[local-name(.)='Invoice' or local-name(.)='CreditNote' or local-name(.)='DebitNote' or local-name(.)='VoidedDocuments' or local-name(.)='SummaryDocuments']",
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
    attrs: { Id: 'SignatureSP' },
    location: {
      reference: "//*[local-name(.)='ExtensionContent']",
      action: 'append',
    },
  });

  return signer.getSignedXml();
}

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

async function sendToSunat(
  label: string,
  signedXml: string,
  xmlFileName: string,
) {
  console.log(`\n===== ${label} =====`);

  // Check if signature has Id
  const sigTag = signedXml.match(/<ds:Signature[^>]*>/)?.[0];
  console.log(`Signature tag: ${sigTag?.slice(0, 100)}`);

  const zipFileName = xmlFileName.replace('.xml', '.zip');
  const zip = new AdmZip();
  zip.addFile(xmlFileName, Buffer.from(signedXml, 'latin1'));
  const zipBuffer = zip.toBuffer();

  const envelope = buildSendBillEnvelope(
    BETA_USER,
    BETA_PASS,
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
  const faultString =
    responseText.match(/<faultstring>(.*?)<\/faultstring>/)?.[1];

  if (faultCode) {
    console.log(`FAULT: ${faultCode}`);
    console.log(`MSG: ${faultString}`);
  } else {
    const appResponse =
      responseText.match(
        /<applicationResponse>(.*?)<\/applicationResponse>/s,
      )?.[1];
    if (appResponse) {
      console.log('SUCCESS! Got CDR');
      try {
        const cdrZip = new AdmZip(Buffer.from(appResponse, 'base64'));
        for (const entry of cdrZip.getEntries()) {
          const cdrXml = entry.getData().toString('utf-8');
          const responseCode =
            cdrXml.match(/<cbc:ResponseCode>(.*?)<\/cbc:ResponseCode>/)?.[1];
          const description =
            cdrXml.match(/<cbc:Description>(.*?)<\/cbc:Description>/)?.[1];
          console.log(`CDR ResponseCode: ${responseCode}`);
          console.log(`CDR Description: ${description}`);
        }
      } catch (e) {
        console.log('Error decoding CDR:', e);
      }
    } else {
      console.log(`Response: ${responseText.slice(0, 500)}`);
    }
  }
}

async function main() {
  console.log('=== FULL PIPELINE TEST ===');

  const prisma = new PrismaService();
  await prisma.$connect();
  const fiscalSecrets = new FiscalSecretsService(prisma);

  // Get active certificate
  const certificate = await prisma.certificadoDigital.findFirst({
    where: { activo: true, revokedAt: null, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!certificate) throw new Error('No active certificate found');

  console.log(`Certificate: ${certificate.nombre}`);

  const encryptedRaw = await fs.readFile(
    resolvePrivateStoragePath(certificate.storageKey),
    'utf8',
  );
  const encrypted = JSON.parse(encryptedRaw) as EncryptedPayload;
  const p12Buffer = fiscalSecrets.decryptBuffer(encrypted);
  const p12Password = await fiscalSecrets.revealSecret(
    certificate.passwordSecretRef!,
    'p12-password',
  );
  const { privateKeyPem, certificatePem } = await extractP12KeyMaterial(
    p12Buffer,
    p12Password,
  );
  console.log('Certificate extracted successfully');

  const today = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const time = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Lima',
    hour12: false,
  });

  // Build a minimal boleta XML
  const rawXml = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>B001-00000090</cbc:ID>
  <cbc:IssueDate>${today}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${RUC}-B001-90</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${RUC}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[APAZA GONZALES CIRO ABEL]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${RUC}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[APAZA GONZALES CIRO ABEL]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="1">00000000</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[CLIENTE GENERICO]]></cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">11.80</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">11.80</cbc:PriceAmount>
        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>18</cbc:Percent>
          <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
          <cac:TaxScheme>
            <cbc:ID>1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description><![CDATA[Producto de prueba]]></cbc:Description>
      <cac:SellersItemIdentification>
        <cbc:ID>PROD001</cbc:ID>
      </cac:SellersItemIdentification>
      <cac:CommodityClassification>
        <cbc:ItemClassificationCode listID="UNSPSC" listAgencyName="GS1 US" listName="Item Classification">82101500</cbc:ItemClassificationCode>
      </cac:CommodityClassification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="PEN">10.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

  // Test 1: Sign WITH Id="SignatureSP" attrs
  const signedWithId = signXml(rawXml, privateKeyPem, certificatePem);
  await sendToSunat(
    'Test 1: Signed WITH Id="SignatureSP"',
    signedWithId,
    `${RUC}-03-B001-00000090.xml`,
  );

  // Test 2: Sign WITHOUT Id (same as current production code)
  const signerNoId = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    getKeyInfoContent: () => {
      const cleanCert = certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '');
      return `<ds:X509Data><ds:X509Certificate>${cleanCert}</ds:X509Certificate></ds:X509Data>`;
    },
  });
  signerNoId.addReference({
    xpath:
      "/*[local-name(.)='Invoice' or local-name(.)='CreditNote' or local-name(.)='DebitNote' or local-name(.)='VoidedDocuments' or local-name(.)='SummaryDocuments']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: '',
    isEmptyUri: true,
  });
  signerNoId.computeSignature(rawXml, {
    prefix: 'ds',
    location: {
      reference: "//*[local-name(.)='ExtensionContent']",
      action: 'append',
    },
  });
  const signedNoId = signerNoId.getSignedXml();
  await sendToSunat(
    'Test 2: Signed WITHOUT Id (current behavior)',
    signedNoId,
    `${RUC}-03-B001-00000089.xml`,
  );

  await prisma.$disconnect();
  console.log('\n=== DONE ===');
}

main().catch(console.error);
