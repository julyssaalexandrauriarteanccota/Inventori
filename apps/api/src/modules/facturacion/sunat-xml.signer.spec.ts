import * as forge from 'node-forge';
import { CertificadoDigitalService } from './certificado-digital.service';
import { SunatXmlSigner } from './sunat-xml.signer';

describe('SunatXmlSigner', () => {
  function createKeyMaterial() {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const certificate = forge.pki.createCertificate();
    certificate.publicKey = keys.publicKey;
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date('2026-01-01T00:00:00.000Z');
    certificate.validity.notAfter = new Date('2027-01-01T00:00:00.000Z');
    const attrs = [
      { name: 'countryName', value: 'PE' },
      { shortName: 'O', value: 'Empresa Demo SAC' },
      { name: 'commonName', value: 'Certificado Demo SUNAT' },
    ];
    certificate.setSubject(attrs);
    certificate.setIssuer(attrs);
    certificate.sign(keys.privateKey, forge.md.sha256.create());

    return {
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
      certificatePem: forge.pki.certificateToPem(certificate),
    };
  }

  function buildSigner() {
    const material = createKeyMaterial();
    const certificadoDigitalService = {
      getActiveKeyMaterial: jest.fn().mockResolvedValue({
        ...material,
        p12Buffer: Buffer.from('p12-demo'),
        password: 'password-demo',
        certificate: {
          id: 'cert-demo-1',
          nombre: 'Certificado Demo',
          fingerprintSha256: 'fingerprint-demo',
          validoDesde: new Date('2026-01-01T00:00:00.000Z'),
          validoHasta: new Date('2027-01-01T00:00:00.000Z'),
        },
      }),
    } as unknown as CertificadoDigitalService;

    return {
      signer: new SunatXmlSigner(certificadoDigitalService),
      certificadoDigitalService,
    };
  }

  it('firma un UBL Invoice en backend usando certificado activo', async () => {
    const { signer, certificadoDigitalService } = buildSigner();

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

    expect(result.certificateId).toBe('cert-demo-1');
    expect(result.certificateFingerprintSha256).toBe('fingerprint-demo');
    expect(result.signedXml).toContain('<ds:Signature');
    expect(result.signedXml).toContain(
      '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"',
    );
    expect(result.signedXml).toContain(
      '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"',
    );
    expect(result.signedXml).toContain('<ds:Reference URI="">');
    expect(result.signedXml).not.toMatch(/<Invoice[^>]*\sId=/);
    expect(result.signedXml).not.toContain('<ds:Signature Id=');
    expect(result.signedXml).toContain('<ds:X509Certificate>');
    expect(result.signedXml).not.toContain('BEGIN CERTIFICATE');
    expect(
      certificadoDigitalService.getActiveKeyMaterial,
    ).toHaveBeenCalledTimes(1);
  });

  it('firma un UBL CreditNote usando el mismo flujo backend', async () => {
    const { signer } = buildSigner();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>FC01-00000001</cbc:ID>
</CreditNote>`;

    const result = await signer.sign(xml);

    expect(result.signedXml).toContain('<CreditNote');
    expect(result.signedXml).toContain('<ds:Signature');
    expect(result.signedXml).toContain('<ds:X509Certificate>');
  });
});
