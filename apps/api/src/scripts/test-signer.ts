import * as dotenv from 'dotenv';
import * as path from 'path';
import { promises as fs } from 'fs';
import { resolve } from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';
import { FiscalSecretsService, EncryptedPayload } from '../modules/facturacion/fiscal-secrets.service';
import { SunatXmlSigner } from '../modules/facturacion/sunat-xml.signer';
import * as forge from 'node-forge';

const CERTIFICATE_SECRET_NAME = 'p12-password';

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

  if (!privateKey || !certificate) {
    throw new Error('PKCS#12 sin clave privada o certificado');
  }

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

async function main() {
  console.log('Testing XML signer via isolated script...');
  
  const prisma = new PrismaService();
  await prisma.$connect();
  console.log('Connected to PostgreSQL successfully!');
  
  const fiscalSecrets = new FiscalSecretsService(prisma);
  
  const certificate = await prisma.certificadoDigital.findFirst({
    where: { activo: true, revokedAt: null, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!certificate) {
    throw new Error('No active certificate found in database.');
  }
  
  console.log('Active Certificate:', certificate.nombre);
  
  const encryptedRaw = await fs.readFile(
    resolvePrivateStoragePath(certificate.storageKey),
    'utf8',
  );
  const encrypted = JSON.parse(encryptedRaw) as EncryptedPayload;
  const p12Buffer = fiscalSecrets.decryptBuffer(encrypted);
  const password = await fiscalSecrets.revealSecret(
    certificate.passwordSecretRef!,
    CERTIFICATE_SECRET_NAME,
  );
  
  const extracted = await extractP12KeyMaterial(p12Buffer, password);
  console.log('Certificate Key Material successfully extracted and decrypted!');
  
  const mockCertService = {
    getActiveKeyMaterial: async () => ({
      p12Buffer,
      password,
      privateKeyPem: extracted.privateKeyPem,
      certificatePem: extracted.certificatePem,
      certificate: {
        id: certificate.id,
        nombre: certificate.nombre,
        fingerprintSha256: certificate.fingerprintSha256,
        validoDesde: certificate.validoDesde,
        validoHasta: certificate.validoHasta,
      }
    })
  } as any;
  
  const signer = new SunatXmlSigner(mockCertService);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>F001-00000001</cbc:ID>
</Invoice>`;

  const result = await signer.sign(xml);
  console.log('--- SIGNED XML RESULT ---');
  console.log(result.signedXml.slice(0, 1000));
  console.log('... [TRUNCATED] ...');

  if (result.signedXml.includes('Id="SignatureSP"')) {
    console.log('\nSUCCESS: Signature block has Id="SignatureSP" attribute!');
  } else {
    console.error('\nFAILURE: Signature block is missing Id="SignatureSP" attribute!');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

