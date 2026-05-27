/**
 * Diagnostic: compare signed XML from production signing vs what xml-crypto
 * does to the XML structure. Focus on encoding changes.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { promises as fs } from 'fs';
import { resolve } from 'path';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { PrismaService } from '../database/prisma.service';
import {
  FiscalSecretsService,
  EncryptedPayload,
} from '../modules/facturacion/fiscal-secrets.service';

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

  const xml = `<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>TEST-001</cbc:ID>
</Invoice>`;

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

  const signed = signer.getSignedXml();

  console.log('=== BEFORE SIGNING ===');
  console.log('Length:', xml.length);
  console.log('First line:', xml.split('\n')[0]);

  console.log('\n=== AFTER SIGNING ===');
  console.log('Length:', signed.length);
  console.log('First line:', signed.split('\n')[0]);
  console.log(
    'Has encoding="ISO-8859-1":',
    signed.includes('encoding="ISO-8859-1"'),
  );
  console.log('Has standalone="no":', signed.includes('standalone="no"'));

  const origDecl = xml.match(/<\?xml[^?]*\?>/)?.[0];
  const signedDecl = signed.match(/<\?xml[^?]*\?>/)?.[0];
  console.log('\nOriginal declaration:', origDecl);
  console.log('Signed declaration:', signedDecl);
  console.log('Declaration preserved:', origDecl === signedDecl);

  // Check if the signed XML is different from original in any structural way
  // besides the signature being added
  const withoutSig = signed.replace(
    /<ds:Signature[\s\S]*?<\/ds:Signature>/,
    '',
  );
  const origWithoutExt = xml.replace(
    /<ext:ExtensionContent><\/ext:ExtensionContent>/,
    '<ext:ExtensionContent></ext:ExtensionContent>',
  );
  console.log(
    '\nStructure changed (beyond signature):',
    withoutSig !== origWithoutExt,
  );

  await prisma.$disconnect();
}

main().catch(console.error);
