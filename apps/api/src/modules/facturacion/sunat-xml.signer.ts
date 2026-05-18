import { Injectable } from '@nestjs/common';
import { SignedXml } from 'xml-crypto';
import { CertificadoDigitalService } from './certificado-digital.service';

export interface SignedSunatXmlResult {
  signedXml: string;
  certificateId: string;
  certificateFingerprintSha256: string | null;
}

@Injectable()
export class SunatXmlSigner {
  constructor(
    private readonly certificadoDigitalService: CertificadoDigitalService,
  ) {}

  async sign(xml: string): Promise<SignedSunatXmlResult> {
    const material =
      await this.certificadoDigitalService.getActiveKeyMaterial();
    const cleanCert = material.certificatePem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s+/g, '');

    const signer = new SignedXml({
      privateKey: material.privateKeyPem,
      publicCert: material.certificatePem,
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
    });

    signer.computeSignature(xml, {
      prefix: 'ds',
      location: {
        reference: "//*[local-name(.)='ExtensionContent']",
        action: 'append',
      },
    });

    return {
      signedXml: signer.getSignedXml(),
      certificateId: material.certificate.id,
      certificateFingerprintSha256: material.certificate.fingerprintSha256,
    };
  }
}
