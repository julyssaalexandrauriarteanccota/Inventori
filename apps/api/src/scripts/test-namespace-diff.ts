/**
 * CRITICAL TEST: Add Nubefact-style namespaces to our XML and send to SUNAT BETA
 * to determine if the missing namespaces cause error 2074.
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

async function sendTest(label: string, signedXml: string, xmlFileName: string) {
  console.log(`\n===== ${label} =====`);
  const zip = new AdmZip();
  zip.addFile(xmlFileName, Buffer.from(signedXml, 'utf-8'));
  const zipFileName = xmlFileName.replace('.xml', '.zip');

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${RUC}MODDATOS</wsse:Username><wsse:Password>MODDATOS</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header>
  <soapenv:Body><ser:sendBill><fileName>${zipFileName}</fileName><contentFile>${zip.toBuffer().toString('base64')}</contentFile></ser:sendBill></soapenv:Body>
</soapenv:Envelope>`;

  const resp = await fetch(BETA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:sendBill',
    },
    body: envelope,
  });
  console.log(`HTTP: ${resp.status}`);
  const text = await resp.text();
  const fc = text.match(/<faultcode>(.*?)<\/faultcode>/)?.[1];
  const fs2 = text.match(/<faultstring>(.*?)<\/faultstring>/)?.[1];
  if (fc) {
    console.log(`FAULT: ${fc}`);
    console.log(`MSG: ${fs2}`);
  } else {
    const ar = text.match(
      /<applicationResponse>(.*?)<\/applicationResponse>/s,
    )?.[1];
    if (ar) {
      console.log('SUCCESS! CDR received!');
      const cz = new AdmZip(Buffer.from(ar, 'base64'));
      for (const e of cz.getEntries()) {
        const x = e.getData().toString('utf-8');
        console.log(
          `RC: ${x.match(/<cbc:ResponseCode>(.*?)<\/cbc:ResponseCode>/)?.[1]}`,
        );
        console.log(
          `Desc: ${x.match(/<cbc:Description>(.*?)<\/cbc:Description>/)?.[1]}`,
        );
      }
    } else {
      console.log(text.slice(0, 500));
    }
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

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
  const time = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Lima',
    hour12: false,
  });

  // ===== Test A: OUR minimal XML (fails with 2074) =====
  const xmlOurs = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>B001-00000080</cbc:ID>
  <cbc:IssueDate>${today}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature><cbc:ID>${RUC}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>TEST</cbc:Name></cac:PartyName></cac:SignatoryParty><cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>TEST SAC</cbc:RegistrationName><cac:RegistrationAddress><cbc:AddressTypeCode>0000</cbc:AddressTypeCode></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="1">00000000</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>CLIENTE</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">11.80</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="NIU">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">11.80</cbc:PriceAmount><cbc:PriceTypeCode>01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18</cbc:Percent><cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:Item><cbc:Description>Producto</cbc:Description></cac:Item><cac:Price><cbc:PriceAmount currencyID="PEN">10.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;

  // ===== Test B: SAME XML but with Nubefact-style namespace declarations =====
  const xmlWithNs = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>B001-00000079</cbc:ID>
  <cbc:IssueDate>${today}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">03</cbc:InvoiceTypeCode>
  <cbc:Note languageLocaleID="1000">ONCE CON 80/100 SOLES</cbc:Note>
  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>
  <cac:Signature><cbc:ID>${RUC}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>TEST</cbc:Name></cac:PartyName></cac:SignatoryParty><cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>${RUC}</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>APAZA GONZALES CIRO ABEL</cbc:Name></cac:PartyName><cac:PartyLegalEntity><cbc:RegistrationName>APAZA GONZALES CIRO ABEL</cbc:RegistrationName><cac:RegistrationAddress><cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">000000</cbc:ID><cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode><cbc:CityName>-</cbc:CityName><cbc:CountrySubentity>-</cbc:CountrySubentity><cbc:District>-</cbc:District><cac:AddressLine><cbc:Line>-</cbc:Line></cac:AddressLine><cac:Country><cbc:IdentificationCode listID="ISO 3166-1" listAgencyName="United Nations Economic Commission for Europe" listName="Country">PE</cbc:IdentificationCode></cac:Country></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="1" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">00000000</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>CLIENTE GENERICO</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">11.80</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="NIU" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">11.80</cbc:PriceAmount><cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18.00</cbc:Percent><cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">10</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:Item><cbc:Description>Producto de prueba</cbc:Description><cac:SellersItemIdentification><cbc:ID>PROD001</cbc:ID></cac:SellersItemIdentification></cac:Item><cac:Price><cbc:PriceAmount currencyID="PEN">10.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;

  const signedA = signXml(xmlOurs, privateKeyPem, certificatePem);
  await sendTest(
    'Test A: Our minimal XML (should fail 2074)',
    signedA,
    `${RUC}-03-B001-00000080.xml`,
  );

  const signedB = signXml(xmlWithNs, privateKeyPem, certificatePem);
  await sendTest(
    'Test B: Nubefact-style namespaces + attributes',
    signedB,
    `${RUC}-03-B001-00000079.xml`,
  );

  await prisma.$disconnect();
  console.log('\n=== DONE ===');
}

main().catch(console.error);
