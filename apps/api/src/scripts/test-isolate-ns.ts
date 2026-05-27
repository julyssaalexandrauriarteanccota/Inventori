/**
 * ISOLATE: Which specific namespace(s) fix the 2074 error?
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

const BETA = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const RUC = '10013415116';

async function extractP12(buffer: Buffer, password: string) {
  const der = forge.util.createBuffer(buffer.toString('binary'));
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  const k = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[
      forge.pki.oids.keyBag
    ] ?? []),
  ];
  const c =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ??
    [];
  return {
    pk: forge.pki.privateKeyToPem(k[0].key!),
    cert: forge.pki.certificateToPem(c[0].cert!),
  };
}

async function send(label: string, xml: string, fn: string) {
  const z = new AdmZip();
  z.addFile(fn, Buffer.from(xml, 'utf-8'));
  const e = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${RUC}MODDATOS</wsse:Username><wsse:Password>MODDATOS</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><ser:sendBill><fileName>${fn.replace('.xml', '.zip')}</fileName><contentFile>${z.toBuffer().toString('base64')}</contentFile></ser:sendBill></soapenv:Body></soapenv:Envelope>`;
  const r = await fetch(BETA, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:sendBill',
    },
    body: e,
  });
  const t = await r.text();
  const fc = t.match(/<faultcode>(.*?)<\/faultcode>/)?.[1] || 'NONE';
  const fm = t.match(/<faultstring>(.*?)<\/faultstring>/)?.[1] || '';
  const rc = t.match(/<cbc:ResponseCode>(.*?)<\/cbc:ResponseCode>/)?.[1];
  if (rc) console.log(`${label} => SUCCESS RC=${rc}`);
  else console.log(`${label} => ${fc} | ${fm?.slice(0, 100)}`);
}

function sign(xml: string, pk: string, cert: string): string {
  const cc = cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  const s = new SignedXml({
    privateKey: pk,
    publicCert: cert,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    getKeyInfoContent: () =>
      `<ds:X509Data><ds:X509Certificate>${cc}</ds:X509Certificate></ds:X509Data>`,
  });
  s.addReference({
    xpath: "/*[local-name(.)='Invoice']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: '',
    isEmptyUri: true,
  });
  s.computeSignature(xml, {
    prefix: 'ds',
    location: {
      reference: "//*[local-name(.)='ExtensionContent']",
      action: 'append',
    },
  });
  return s.getSignedXml();
}

function xml(num: string, extraNs: string): string {
  const d = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
  const t = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Lima',
    hour12: false,
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice ${extraNs}xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${num}</cbc:ID>
  <cbc:IssueDate>${d}</cbc:IssueDate>
  <cbc:IssueTime>${t}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>
  <cac:Signature><cbc:ID>${RUC}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>APAZA GONZALES CIRO ABEL</cbc:Name></cac:PartyName></cac:SignatoryParty><cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>${RUC}</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${RUC}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>APAZA GONZALES CIRO ABEL</cbc:Name></cac:PartyName><cac:PartyLegalEntity><cbc:RegistrationName>APAZA GONZALES CIRO ABEL</cbc:RegistrationName><cac:RegistrationAddress><cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">000000</cbc:ID><cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode><cbc:CityName>-</cbc:CityName><cbc:CountrySubentity>-</cbc:CountrySubentity><cbc:District>-</cbc:District><cac:AddressLine><cbc:Line>-</cbc:Line></cac:AddressLine><cac:Country><cbc:IdentificationCode listID="ISO 3166-1" listAgencyName="United Nations Economic Commission for Europe" listName="Country">PE</cbc:IdentificationCode></cac:Country></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="1" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">00000000</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>CLIENTE GENERICO</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">11.80</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">11.80</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="NIU" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="PEN">10.00</cbc:LineExtensionAmount><cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">11.80</cbc:PriceAmount><cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">10.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">1.80</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18.00</cbc:Percent><cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">10</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:Item><cbc:Description>Producto de prueba</cbc:Description><cac:SellersItemIdentification><cbc:ID>PROD001</cbc:ID></cac:SellersItemIdentification></cac:Item><cac:Price><cbc:PriceAmount currencyID="PEN">10.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const fiscalSecrets = new FiscalSecretsService(prisma);
  const cert2 = await prisma.certificadoDigital.findFirst({
    where: { activo: true, revokedAt: null, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!cert2) throw new Error('No cert');
  const pr =
    process.env.FISCAL_PRIVATE_STORAGE_DIR ||
    resolve(process.cwd(), 'private-fiscal-storage');
  const enc = JSON.parse(
    await fs.readFile(path.join(pr, cert2.storageKey), 'utf8'),
  ) as EncryptedPayload;
  const p12 = fiscalSecrets.decryptBuffer(enc);
  const pw = await fiscalSecrets.revealSecret(
    cert2.passwordSecretRef!,
    'p12-password',
  );
  const { pk, cert } = await extractP12(p12, pw);

  let n = 70;

  // Test 1: No extra namespaces (baseline - should fail with 2074)
  await send(
    `T1-NoExtraNS`,
    sign(xml(`B001-${String(n++).padStart(8, '0')}`, ''), pk, cert),
    `${RUC}-03-B001-${String(n - 1).padStart(8, '0')}.xml`,
  );

  // Test 2: Only xsi + xsd
  await send(
    `T2-xsi+xsd`,
    sign(
      xml(
        `B001-${String(n++).padStart(8, '0')}`,
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" ',
      ),
      pk,
      cert,
    ),
    `${RUC}-03-B001-${String(n - 1).padStart(8, '0')}.xml`,
  );

  // Test 3: Only ccts + qdt + udt
  await send(
    `T3-ccts+qdt+udt`,
    sign(
      xml(
        `B001-${String(n++).padStart(8, '0')}`,
        'xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" ',
      ),
      pk,
      cert,
    ),
    `${RUC}-03-B001-${String(n - 1).padStart(8, '0')}.xml`,
  );

  // Test 4: All 5 extra namespaces
  await send(
    `T4-AllExtraNS`,
    sign(
      xml(
        `B001-${String(n++).padStart(8, '0')}`,
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" ',
      ),
      pk,
      cert,
    ),
    `${RUC}-03-B001-${String(n - 1).padStart(8, '0')}.xml`,
  );

  // Test 5: Only xsi
  await send(
    `T5-only-xsi`,
    sign(
      xml(
        `B001-${String(n++).padStart(8, '0')}`,
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ',
      ),
      pk,
      cert,
    ),
    `${RUC}-03-B001-${String(n - 1).padStart(8, '0')}.xml`,
  );

  await prisma.$disconnect();
}

main().catch(console.error);
