import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createHash } from 'crypto';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { FiscalStorageService } from '../modules/facturacion/fiscal-storage.service';

const ids = process.argv.slice(2);

function text(xml: string, tagName: string) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    xml
      .match(new RegExp(`<${escaped}\\b[^>]*>(.*?)</${escaped}>`, 's'))?.[1]
      ?.trim() ?? null
  );
}

function count(xml: string, pattern: RegExp) {
  return xml.match(pattern)?.length ?? 0;
}

function attrs(xml: string, tagName: string) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    xml.match(new RegExp(`<${escaped}\\b([^>]*)>`, 's'))?.[1]?.trim() ?? ''
  );
}

function describe(xml: string) {
  const signatureTag = xml.match(/<ds:Signature\b[^>]*>/)?.[0] ?? null;
  return {
    sha256: createHash('sha256')
      .update(Buffer.from(xml, 'latin1'))
      .digest('hex'),
    length: xml.length,
    firstLine: xml.split(/\r?\n/, 1)[0],
    rootTag: xml.match(/<([A-Za-z]+)\b/)?.[1] ?? null,
    rootAttrs: attrs(xml, 'Invoice'),
    ublVersionId: text(xml, 'cbc:UBLVersionID'),
    customizationId: text(xml, 'cbc:CustomizationID'),
    id: text(xml, 'cbc:ID'),
    issueDate: text(xml, 'cbc:IssueDate'),
    issueTime: text(xml, 'cbc:IssueTime'),
    invoiceTypeCode: text(xml, 'cbc:InvoiceTypeCode'),
    invoiceTypeAttrs: attrs(xml, 'cbc:InvoiceTypeCode'),
    documentCurrencyCode: text(xml, 'cbc:DocumentCurrencyCode'),
    supplierDocAttrs: attrs(xml, 'cbc:ID'),
    signatureTag,
    hasSignatureId: !!signatureTag && /\sId=/.test(signatureTag),
    signatureReferenceUri:
      xml.match(/<ds:Reference\b[^>]*\sURI=["']([^"']*)["']/)?.[1] ?? null,
    cacSignatureUri: text(xml, 'cbc:URI'),
    profileIdCount: count(xml, /<cbc:ProfileID\b/g),
    noteCount: count(xml, /<cbc:Note\b/g),
    invoiceLineCount: count(xml, /<cac:InvoiceLine\b/g),
    unitCodes: [...xml.matchAll(/\bunitCode=["']([^"']+)["']/g)].map(
      (match) => match[1],
    ),
    taxSchemeIds: [
      ...xml.matchAll(/<cac:TaxScheme>[\s\S]*?<cbc:ID[^>]*>(.*?)<\/cbc:ID>/g),
    ].map((match) => match[1].trim()),
  };
}

async function main() {
  if (ids.length < 1) {
    throw new Error(
      'Uso: tsx src/scripts/compare-sunat-xml.ts <comprobanteId> [comprobanteId...]',
    );
  }

  const prisma = new PrismaService();
  await prisma.$connect();
  const storage = new FiscalStorageService(new ConfigService(process.env));

  for (const id of ids) {
    const comp = await prisma.comprobante.findUnique({ where: { id } });
    if (!comp?.xmlStorageKey) {
      console.log(`${id}: no tiene xmlStorageKey`);
      continue;
    }

    const xml = await storage.readObjectText(comp.xmlStorageKey, 'latin1');
    if (!xml) {
      console.log(`${comp.numero}: XML vacío`);
      continue;
    }

    const outPath = path.join(
      __dirname,
      `sunat-${comp.numero.replace(/[^A-Za-z0-9-]/g, '_')}.xml`,
    );
    fs.writeFileSync(outPath, xml, 'latin1');

    console.log(`\n===== ${comp.numero} (${comp.estado}) =====`);
    console.log(`id=${comp.id}`);
    console.log(`xmlStorageKey=${comp.xmlStorageKey}`);
    console.log(`mensajeSunat=${comp.mensajeSunat}`);
    console.log(JSON.stringify(describe(xml), null, 2));
    console.log(`exported=${outPath}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
