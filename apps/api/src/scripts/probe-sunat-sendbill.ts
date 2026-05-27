import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { ConfigService } from '@nestjs/config';
import { AmbienteSunat } from '@erp/shared';
import { PrismaService } from '../database/prisma.service';
import { CertificadoDigitalService } from '../modules/facturacion/certificado-digital.service';
import { FiscalSecretsService } from '../modules/facturacion/fiscal-secrets.service';
import { SunatDirectGateway } from '../modules/facturacion/sunat-direct.gateway';
import { SunatCredentialsService } from '../modules/facturacion/sunat-credentials.service';
import { SunatPayloadBuilder } from '../modules/facturacion/sunat-payload.builder';
import { SunatXmlSigner } from '../modules/facturacion/sunat-xml.signer';

const comprobanteId = process.argv[2] ?? 'a6999772-c566-4a17-bc7a-03339011b063';
const onlyVariant = process.argv[3];

interface ProbeVariant {
  name: string;
  mutate: (xml: string) => string;
  mutateSigned?: (xml: string) => string;
  useModdatos?: boolean;
  ruc?: string;
}

function replaceHeaderIdentity(
  xml: string,
  serie: string,
  correlativo: number,
  ruc: string,
) {
  const padded = String(correlativo).padStart(8, '0');
  return xml
    .replace(
      /<cbc:ID>[FB]\d{3}-\d+<\/cbc:ID>/,
      `<cbc:ID>${serie}-${padded}</cbc:ID>`,
    )
    .replace(
      /\d{11}-(01|03)-[FB]\d{3}-\d+\.xml/g,
      `${ruc}-${serie.startsWith('F') ? '01' : '03'}-${serie}-${padded}.xml`,
    );
}

function fileNames(
  ruc: string,
  tipo: string,
  serie: string,
  correlativo: number,
) {
  const padded = String(correlativo).padStart(8, '0');
  const fileName = `${ruc}-${tipo}-${serie}-${padded}`;
  return { fileName, xmlFileName: `${fileName}.xml` };
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const config = new ConfigService(process.env);
  const secrets = new FiscalSecretsService(prisma);
  const credentials = new SunatCredentialsService(secrets, config);
  const gateway = new SunatDirectGateway(config, credentials);
  const certificado = new CertificadoDigitalService(
    prisma,
    secrets,
    gateway,
    credentials,
  );
  const builder = new SunatPayloadBuilder();
  const signer = new SunatXmlSigner(certificado);

  try {
    const fiscalConfig = await prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    console.log(
      'Credential status:',
      JSON.stringify(
        await credentials.getSafeStatus(fiscalConfig?.ruc ?? undefined),
        null,
        2,
      ),
    );
    console.log(
      'SUNAT_BETA_URL:',
      config.get<string>('SUNAT_BETA_URL') ||
        'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    );

    const comprobante = await prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      include: {
        detallesFiscales: { orderBy: { item: 'asc' } },
        venta: {
          include: {
            detalles: { include: { producto: true } },
            cliente: true,
          },
        },
      },
    });
    if (!comprobante)
      throw new Error(`Comprobante ${comprobanteId} no encontrado`);

    const built = builder.buildInvoice(comprobante);
    const variants: ProbeVariant[] = [
      { name: 'control', mutate: (xml) => xml },
      { name: 'control-moddatos', mutate: (xml) => xml, useModdatos: true },
      {
        name: 'demo-ruc-moddatos',
        mutate: (xml) => xml.replace(/10013415116/g, '20553510661'),
        useModdatos: true,
        ruc: '20553510661',
      },
      {
        name: 'ds-signature-id',
        mutate: (xml) => xml,
        mutateSigned: (xml) =>
          xml.replace('<ds:Signature ', '<ds:Signature Id="SignatureSP" '),
      },
      {
        name: 'cac-uri-empty',
        mutate: (xml) =>
          xml.replace('<cbc:URI>#SignatureSP</cbc:URI>', '<cbc:URI></cbc:URI>'),
      },
      {
        name: 'cac-uri-ruc',
        mutate: (xml) =>
          xml
            .replace(
              /<cac:Signature>\s*<cbc:ID>[^<]+<\/cbc:ID>/,
              '<cac:Signature>\n    <cbc:ID>10013415116</cbc:ID>',
            )
            .replace(
              '<cbc:URI>#SignatureSP</cbc:URI>',
              '<cbc:URI>10013415116</cbc:URI>',
            ),
      },
      {
        name: 'signature-no-c14n-transform',
        mutate: (xml) => xml,
        mutateSigned: (xml) =>
          xml.replace(
            '<ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>',
            '',
          ),
      },
      {
        name: 'extensioncontent-whitespace',
        mutate: (xml) =>
          xml.replace(
            '<ext:ExtensionContent></ext:ExtensionContent>',
            '<ext:ExtensionContent>\n      </ext:ExtensionContent>',
          ),
      },
      {
        name: 'profile-0101',
        mutate: (xml) =>
          xml.replace(
            '<cbc:CustomizationID>2.0</cbc:CustomizationID>',
            '<cbc:CustomizationID>2.0</cbc:CustomizationID>\n  <cbc:ProfileID schemeName="SUNAT:Identificador de Tipo de Operación" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo17">0101</cbc:ProfileID>',
          ),
      },
      {
        name: 'note-total-letras',
        mutate: (xml) =>
          xml.replace(
            /(\s*<cbc:DocumentCurrencyCode\b[^>]*>PEN<\/cbc:DocumentCurrencyCode>)/,
            '\n  <cbc:Note languageLocaleID="1000">CUATRO MIL QUINIENTOS CON 00/100 SOLES</cbc:Note>$1',
          ),
      },
      {
        name: 'note-total-letras-no-attr',
        mutate: (xml) =>
          xml.replace(
            /(\s*<cbc:DocumentCurrencyCode\b[^>]*>PEN<\/cbc:DocumentCurrencyCode>)/,
            '\n  <cbc:Note>CUATRO MIL QUINIENTOS CON 00/100 SOLES</cbc:Note>$1',
          ),
      },
      {
        name: 'no-payment-terms',
        mutate: (xml) =>
          xml.replace(
            /\n {2}<cac:PaymentTerms>[\s\S]*?<\/cac:PaymentTerms>/,
            '',
          ),
      },
      {
        name: 'nubefact-root-ns',
        mutate: (xml) =>
          xml.replace(
            '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">',
            '<Invoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">',
          ),
      },
      {
        name: 'catalog-attrs',
        mutate: (xml) =>
          xml
            .replace(
              /<cbc:ID schemeID="6">10013415116<\/cbc:ID>/g,
              '<cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">10013415116</cbc:ID>',
            )
            .replace(
              /<cbc:ID schemeID="1">99988999<\/cbc:ID>/g,
              '<cbc:ID schemeID="1" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">99988999</cbc:ID>',
            )
            .replace(
              '<cbc:ID>150101</cbc:ID>',
              '<cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">150101</cbc:ID>',
            )
            .replace(
              '<cbc:AddressTypeCode>0000</cbc:AddressTypeCode>',
              '<cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode>',
            )
            .replace(
              '<cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>',
              '<cac:Country><cbc:IdentificationCode listID="ISO 3166-1" listAgencyName="United Nations Economic Commission for Europe" listName="Country">PE</cbc:IdentificationCode></cac:Country>',
            )
            .replace(
              /<cbc:ID>1000<\/cbc:ID>/g,
              '<cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID>',
            )
            .replace(
              /<cbc:InvoicedQuantity unitCode="NIU">/g,
              '<cbc:InvoicedQuantity unitCode="NIU" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe">',
            )
            .replace(
              /<cbc:PriceTypeCode>01<\/cbc:PriceTypeCode>/g,
              '<cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode>',
            )
            .replace(
              /<cbc:TaxExemptionReasonCode>(\d{2})<\/cbc:TaxExemptionReasonCode>/g,
              '<cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">$1</cbc:TaxExemptionReasonCode>',
            ),
      },
      {
        name: 'catalog-attrs-no-unit-extra',
        mutate: (xml) =>
          xml
            .replace(
              /<cbc:ID schemeID="6">10013415116<\/cbc:ID>/g,
              '<cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">10013415116</cbc:ID>',
            )
            .replace(
              /<cbc:ID schemeID="1">99988999<\/cbc:ID>/g,
              '<cbc:ID schemeID="1" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">99988999</cbc:ID>',
            )
            .replace(
              '<cbc:ID>150101</cbc:ID>',
              '<cbc:ID schemeName="Ubigeos" schemeAgencyName="PE:INEI">150101</cbc:ID>',
            )
            .replace(
              '<cbc:AddressTypeCode>0000</cbc:AddressTypeCode>',
              '<cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos">0000</cbc:AddressTypeCode>',
            )
            .replace(
              '<cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>',
              '<cac:Country><cbc:IdentificationCode listID="ISO 3166-1" listAgencyName="United Nations Economic Commission for Europe" listName="Country">PE</cbc:IdentificationCode></cac:Country>',
            )
            .replace(
              /<cbc:ID>1000<\/cbc:ID>/g,
              '<cbc:ID schemeName="Codigo de tributos" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05">1000</cbc:ID>',
            )
            .replace(
              /<cbc:PriceTypeCode>01<\/cbc:PriceTypeCode>/g,
              '<cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">01</cbc:PriceTypeCode>',
            )
            .replace(
              /<cbc:TaxExemptionReasonCode>(\d{2})<\/cbc:TaxExemptionReasonCode>/g,
              '<cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">$1</cbc:TaxExemptionReasonCode>',
            ),
      },
      {
        name: 'utf8-declaration',
        mutate: (xml) =>
          xml.replace(
            '<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>',
            '<?xml version="1.0" encoding="UTF-8"?>',
          ),
      },
      {
        name: 'iso-declaration',
        mutate: (xml) =>
          xml.replace(
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>',
          ),
      },
      {
        name: 'utf8-nubefact-header',
        mutate: (xml) =>
          xml
            .replace(
              '<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>',
              '<?xml version="1.0" encoding="UTF-8"?>',
            )
            .replace(
              '<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>',
              '<cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">03</cbc:InvoiceTypeCode>',
            )
            .replace(
              '<cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>',
              '<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>',
            ),
      },
      {
        name: 'utf8-nubefact-header-signature-id',
        mutate: (xml) =>
          xml
            .replace(
              '<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>',
              '<?xml version="1.0" encoding="UTF-8"?>',
            )
            .replace(
              '<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>',
              '<cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01" name="Tipo de Operacion" listSchemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51">03</cbc:InvoiceTypeCode>',
            )
            .replace(
              '<cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>',
              '<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>',
            ),
        mutateSigned: (xml) =>
          xml.replace('<ds:Signature ', '<ds:Signature Id="SignatureSP" '),
      },
      {
        name: 'unit-und',
        mutate: (xml) => xml.replace(/unitCode="NIU"/g, 'unitCode="UND"'),
      },
      {
        name: 'ubl-20',
        mutate: (xml) =>
          xml.replace(
            '<cbc:UBLVersionID>2.1</cbc:UBLVersionID>',
            '<cbc:UBLVersionID>2.0</cbc:UBLVersionID>',
          ),
      },
      {
        name: 'utc-issue-date',
        mutate: (xml) =>
          xml
            .replace(
              /<cbc:IssueDate>.*?<\/cbc:IssueDate>/,
              '<cbc:IssueDate>2026-05-22</cbc:IssueDate>',
            )
            .replace(
              /<cbc:IssueTime>.*?<\/cbc:IssueTime>/,
              '<cbc:IssueTime>04:32:21</cbc:IssueTime>',
            ),
      },
      {
        name: 'official-attrs',
        mutate: (xml) =>
          xml
            .replace(
              '<cbc:CustomizationID>2.0</cbc:CustomizationID>',
              '<cbc:CustomizationID schemeAgencyName="PE:SUNAT">2.0</cbc:CustomizationID>',
            )
            .replace(
              '<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>',
              '<cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">03</cbc:InvoiceTypeCode>',
            )
            .replace(
              '<cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>',
              '<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listName="Currency" listAgencyName="United Nations Economic Commission for Europe">PEN</cbc:DocumentCurrencyCode>',
            )
            .replace(
              '<cbc:ID schemeID="6">10013415116</cbc:ID>',
              '<cbc:ID schemeID="6" schemeName="SUNAT:Identificador de Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">10013415116</cbc:ID>',
            )
            .replace(
              '<cbc:ID schemeID="1">99988999</cbc:ID>',
              '<cbc:ID schemeID="1" schemeName="SUNAT:Identificador de Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">99988999</cbc:ID>',
            ),
      },
      {
        name: 'boleta-low-total',
        mutate: (xml) =>
          xml
            .replace(/3813\.56/g, '84.75')
            .replace(/686\.44/g, '15.25')
            .replace(/4500\.00/g, '100.00'),
      },
      {
        name: 'factura-ruc',
        mutate: (xml) =>
          xml
            .replace(/10013415116-03-/g, '10013415116-01-')
            .replace(/<cbc:ID>B001-/g, '<cbc:ID>F901-')
            .replace(
              /<cbc:InvoiceTypeCode\b([^>]*)>03<\/cbc:InvoiceTypeCode>/,
              '<cbc:InvoiceTypeCode$1>01</cbc:InvoiceTypeCode>',
            )
            .replace(
              /<cbc:ID schemeID="1"([^>]*)>99988999<\/cbc:ID>/,
              '<cbc:ID schemeID="6"$1>20123456789</cbc:ID>',
            )
            .replace(
              '<cbc:RegistrationName><![CDATA[Mick Marvin MD]]></cbc:RegistrationName>',
              '<cbc:RegistrationName><![CDATA[CLIENTE PRUEBA SAC]]></cbc:RegistrationName>',
            ),
      },
    ];

    for (const [index, variant] of variants.entries()) {
      if (onlyVariant && variant.name !== onlyVariant) continue;
      const serie = 'B9' + String(index + 1).padStart(2, '0');
      const isFactura = variant.name === 'factura-ruc';
      const effectiveSerie = isFactura ? 'F901' : serie;
      const effectiveRuc = variant.ruc ?? String(comprobante.emisorRuc);
      const effectiveTipo = isFactura ? '01' : '03';
      const correlativo = 900000 + index + 1;
      const names = isFactura
        ? fileNames(effectiveRuc, '01', effectiveSerie, correlativo)
        : fileNames(effectiveRuc, effectiveTipo, effectiveSerie, correlativo);
      const xml = replaceHeaderIdentity(
        variant.mutate(built.xml),
        effectiveSerie,
        correlativo,
        effectiveRuc,
      );
      const signed = await signer.sign(xml);
      const signedXml = variant.mutateSigned
        ? variant.mutateSigned(signed.signedXml)
        : signed.signedXml;
      console.log(`\n===== PROBE ${variant.name} ${names.fileName} =====`);
      const gatewayForVariant = variant.useModdatos
        ? new SunatDirectGateway(config, {
            resolveCredentials: async (ruc: string) => ({
              username: `${ruc}MODDATOS`,
              password: 'moddatos',
              source: 'ENV' as const,
              usernameMode: 'RUC_PLUS_SOL_USER' as const,
            }),
          } as SunatCredentialsService)
        : gateway;
      const result = await gatewayForVariant.sendBill({
        ruc: effectiveRuc,
        fileName: names.fileName,
        xmlFileName: names.xmlFileName,
        signedXml,
        ambiente: AmbienteSunat.BETA,
      });
      console.log(
        JSON.stringify(
          {
            accepted: result.accepted,
            codigoRespuesta: result.codigoRespuesta,
            mensaje: result.mensaje,
            requestPayload: result.requestPayload,
            responsePayload: result.responsePayload,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
