/**
 * Test: send a MINIMAL unsigned boleta XML to SUNAT BETA
 * to determine if the problem is in the signature or the XML structure.
 *
 * Usage: pnpm --filter @erp/api exec tsx src/scripts/test-minimal-xml.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');

const BETA_ENDPOINT =
  'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';

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

async function sendAndPrint(
  label: string,
  xmlContent: string,
  xmlFileName: string,
) {
  console.log(`\n\n===== ${label} =====`);
  console.log(`XML first 300 chars:\n${xmlContent.slice(0, 300)}`);

  const zipBuffer = buildZip(xmlFileName, xmlContent);
  const zipFileName = xmlFileName.replace('.xml', '.zip');

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

    // Extract fault code and message
    const faultCode = responseText.match(/<faultcode>(.*?)<\/faultcode>/)?.[1];
    const faultString = responseText.match(
      /<faultstring>(.*?)<\/faultstring>/,
    )?.[1];
    const appResponse = responseText.match(
      /<applicationResponse>(.*?)<\/applicationResponse>/,
    )?.[1];

    if (faultCode) {
      console.log(`FAULT: ${faultCode}`);
      console.log(`MSG: ${faultString}`);
    } else if (appResponse) {
      console.log('SUCCESS! Got applicationResponse (CDR)');
    } else {
      console.log(`Full response:\n${responseText}`);
    }
  } catch (err) {
    console.error('Request error:', err);
  }
}

async function main() {
  console.log('=== SUNAT BETA MINIMAL XML TESTS ===');
  console.log(`Endpoint: ${BETA_ENDPOINT}`);
  console.log(`Username: ${BETA_USER}`);

  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Lima',
    hour12: false,
  });

  // Test 1: UBL 2.1 (current - should fail per recent results)
  const xml21 = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>B001-00000099</cbc:ID>
  <cbc:IssueDate>${today}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${RUC}-B001-99</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${RUC}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[TEST EMPRESA]]></cbc:Name>
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
        <cbc:RegistrationName><![CDATA[TEST EMPRESA SAC]]></cbc:RegistrationName>
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

  await sendAndPrint(
    'Test 1: UBL 2.1 + CustomizationID 2.0 (minimal unsigned)',
    xml21,
    `${RUC}-03-B001-00000099.xml`,
  );

  // Test 2: Try UBL 2.0 to see if it gets a different error
  const xml20 = xml21.replace(
    '<cbc:UBLVersionID>2.1</cbc:UBLVersionID>',
    '<cbc:UBLVersionID>2.0</cbc:UBLVersionID>',
  );
  await sendAndPrint(
    'Test 2: UBL 2.0 + CustomizationID 2.0',
    xml20,
    `${RUC}-03-B001-00000098.xml`,
  );

  // Test 3: Try CustomizationID schemeAgencyName attribute
  const xml21WithScheme = xml21.replace(
    '<cbc:CustomizationID>2.0</cbc:CustomizationID>',
    '<cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>',
  );
  await sendAndPrint(
    'Test 3: UBL 2.1 + CustomizationID schemeAgencyName="PE:SUNAT"',
    xml21WithScheme,
    `${RUC}-03-B001-00000097.xml`,
  );

  // Test 4: Try sending an empty/garbage file to see what error we get
  const xmlGarbage = '<?xml version="1.0" encoding="ISO-8859-1"?><Hello/>';
  await sendAndPrint(
    'Test 4: Garbage XML',
    xmlGarbage,
    `${RUC}-03-B001-00000096.xml`,
  );

  // Test 5: Factura (01) instead of Boleta (03) to see if it's type-specific
  const xmlFactura = xml21
    .replace(
      '<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>',
      '<cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>',
    )
    .replace(
      '<cbc:ID>B001-00000099</cbc:ID>',
      '<cbc:ID>F001-00000099</cbc:ID>',
    );
  await sendAndPrint(
    'Test 5: Factura (01) with UBL 2.1',
    xmlFactura,
    `${RUC}-01-F001-00000099.xml`,
  );

  console.log('\n\n=== ALL TESTS COMPLETE ===');
}

main().catch(console.error);
