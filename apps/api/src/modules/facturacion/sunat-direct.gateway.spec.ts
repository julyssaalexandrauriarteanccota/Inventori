import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
// `adm-zip` uses `export =`, so this syntax is the compatible runtime import here.

import AdmZip = require('adm-zip');
import { AmbienteSunat } from '@erp/shared';
import { SunatDirectGateway } from './sunat-direct.gateway';

function buildCdrBase64(
  code: string,
  description: string,
  notes: string[] = [],
) {
  const zip = new AdmZip();
  const noteXml = notes.map((note) => `<cbc:Note>${note}</cbc:Note>`).join('');
  zip.addFile(
    'R-20123456789-01-F001-00000001.xml',
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  ${noteXml}
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ResponseCode>${code}</cbc:ResponseCode>
      <cbc:Description>${description}</cbc:Description>
    </cac:Response>
  </cac:DocumentResponse>
</ApplicationResponse>`,
      'utf8',
    ),
  );
  return zip.toBuffer().toString('base64');
}

describe('SunatDirectGateway', () => {
  const originalFetch = global.fetch;
  let gateway: SunatDirectGateway;
  let config: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
    config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          SUNAT_BETA_URL: 'https://sunat-beta.example.test/billService',
          SUNAT_PRODUCCION_URL: 'https://sunat-prod.example.test/billService',
          SUNAT_SOL_USER: 'MODDATOS',
          SUNAT_SOL_PASSWORD: 'clave-demo',
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    gateway = new SunatDirectGateway(config);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('arma ZIP/SOAP sendBill y parsea applicationResponse de SUNAT beta', async () => {
    const cdrBase64 = buildCdrBase64(
      '0',
      'La Factura numero F001-00000001 ha sido aceptada',
      ['Observación no bloqueante de ejemplo'],
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(`<?xml version="1.0"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body>
            <ns2:sendBillResponse xmlns:ns2="http://service.sunat.gob.pe">
              <applicationResponse>${cdrBase64}</applicationResponse>
            </ns2:sendBillResponse>
          </soapenv:Body>
        </soapenv:Envelope>`),
    } as unknown as Response);

    const result = await gateway.sendBill({
      ruc: '20123456789',
      fileName: '20123456789-01-F001-00000001',
      xmlFileName: '20123456789-01-F001-00000001.xml',
      signedXml: '<Invoice><ext:UBLExtensions /></Invoice>',
      ambiente: AmbienteSunat.BETA,
    });

    expect(result.accepted).toBe(true);
    expect(result.codigoRespuesta).toBe('0');
    expect(result.mensaje).toBe(
      'La Factura numero F001-00000001 ha sido aceptada',
    );
    expect(result.cdrContent).toBe(cdrBase64);
    expect(result.requestPayload).toEqual(
      expect.objectContaining({
        endpoint: 'https://sunat-beta.example.test/billService',
        ambiente: AmbienteSunat.BETA,
        fileName: '20123456789-01-F001-00000001.zip',
        xmlFileName: '20123456789-01-F001-00000001.xml',
        zipSha256: expect.any(String),
      }),
    );
    expect(result.responsePayload).toEqual(
      expect.objectContaining({
        httpStatus: 200,
        applicationResponseSha256: createHash('sha256')
          .update(Buffer.from(cdrBase64, 'base64'))
          .digest('hex'),
        cdrCodigoRespuesta: '0',
        cdrMensaje: 'La Factura numero F001-00000001 ha sido aceptada',
        cdrNotas: ['Observación no bloqueante de ejemplo'],
        cdrXmlFileName: 'R-20123456789-01-F001-00000001.xml',
      }),
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://sunat-beta.example.test/billService');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:sendBill',
    });
    expect(String(init.body)).toContain(
      '<wsse:Username>20123456789MODDATOS</wsse:Username>',
    );
    expect(String(init.body)).toContain(
      '<wsse:Password>clave-demo</wsse:Password>',
    );
    expect(String(init.body)).toContain(
      '<fileName>20123456789-01-F001-00000001.zip</fileName>',
    );
    expect(String(init.body)).toContain('<contentFile>');
  });

  it('marca como rechazado cuando el CDR de sendBill trae código de rechazo', async () => {
    const cdrBase64 = buildCdrBase64(
      '99',
      'El documento fue rechazado por una regla de validación SUNAT',
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(`<?xml version="1.0"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body>
            <ns2:sendBillResponse xmlns:ns2="http://service.sunat.gob.pe">
              <applicationResponse>${cdrBase64}</applicationResponse>
            </ns2:sendBillResponse>
          </soapenv:Body>
        </soapenv:Envelope>`),
    } as unknown as Response);

    const result = await gateway.sendBill({
      ruc: '20123456789',
      fileName: '20123456789-01-F001-00000001',
      xmlFileName: '20123456789-01-F001-00000001.xml',
      signedXml: '<Invoice />',
      ambiente: AmbienteSunat.BETA,
    });

    expect(result.accepted).toBe(false);
    expect(result.codigoRespuesta).toBe('99');
    expect(result.mensaje).toBe(
      'El documento fue rechazado por una regla de validación SUNAT',
    );
    expect(result.cdrContent).toBe(cdrBase64);
    expect(result.responsePayload).toEqual(
      expect.objectContaining({ cdrCodigoRespuesta: '99' }),
    );
  });

  it('devuelve rechazo normalizado cuando SUNAT responde SOAP fault', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue(`<?xml version="1.0"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body>
            <soapenv:Fault>
              <faultcode>soapenv:Client.1033</faultcode>
              <faultstring>Archivo XML no cumple validaciones de ejemplo</faultstring>
            </soapenv:Fault>
          </soapenv:Body>
        </soapenv:Envelope>`),
    } as unknown as Response);

    const result = await gateway.sendBill({
      ruc: '20123456789',
      fileName: '20123456789-01-F001-00000001',
      xmlFileName: '20123456789-01-F001-00000001.xml',
      signedXml: '<Invoice />',
      ambiente: AmbienteSunat.PRODUCCION,
    });

    expect(result.accepted).toBe(false);
    expect(result.codigoRespuesta).toBe('soapenv:Client.1033');
    expect(result.mensaje).toBe(
      'Archivo XML no cumple validaciones de ejemplo',
    );
    expect(result.requestPayload).toEqual(
      expect.objectContaining({
        endpoint: 'https://sunat-prod.example.test/billService',
        ambiente: AmbienteSunat.PRODUCCION,
      }),
    );
    expect(result.responsePayload).toEqual(
      expect.objectContaining({
        httpStatus: 500,
        faultCode: 'soapenv:Client.1033',
        faultMessage: 'Archivo XML no cumple validaciones de ejemplo',
      }),
    );
  });

  it('consulta estado por ticket y parsea CDR cuando SUNAT lo devuelve', async () => {
    const cdrBase64 = Buffer.from('CDR TICKET DEMO OK').toString('base64');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(`<?xml version="1.0"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body>
            <ns2:getStatusResponse xmlns:ns2="http://service.sunat.gob.pe">
              <status>
                <statusCode>0</statusCode>
                <statusMessage>Aceptado</statusMessage>
                <content>${cdrBase64}</content>
              </status>
            </ns2:getStatusResponse>
          </soapenv:Body>
        </soapenv:Envelope>`),
    } as unknown as Response);

    const result = await gateway.getStatus({
      ruc: '20123456789',
      ticket: 'TICKET-DEMO-001',
      ambiente: AmbienteSunat.BETA,
    });

    expect(result.accepted).toBe(true);
    expect(result.codigoRespuesta).toBe('0');
    expect(result.cdrContent).toBe(cdrBase64);
    expect(result.requestPayload).toEqual(
      expect.objectContaining({ ticket: 'TICKET-DEMO-001' }),
    );
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.headers).toEqual({
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:getStatus',
    });
    expect(String(init.body)).toContain('<ser:getStatus>');
    expect(String(init.body)).toContain('<ticket>TICKET-DEMO-001</ticket>');
  });

  it('consulta CDR por datos del comprobante y normaliza estado en proceso', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(`<?xml version="1.0"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Body>
            <ns2:getStatusCdrResponse xmlns:ns2="http://service.sunat.gob.pe">
              <status>
                <statusCode>98</statusCode>
                <statusMessage>En proceso</statusMessage>
              </status>
            </ns2:getStatusCdrResponse>
          </soapenv:Body>
        </soapenv:Envelope>`),
    } as unknown as Response);

    const result = await gateway.getStatusCdr({
      ruc: '20123456789',
      tipoComprobante: '01',
      serie: 'F001',
      correlativo: 7,
      ambiente: AmbienteSunat.BETA,
    });

    expect(result.accepted).toBe(false);
    expect(result.codigoRespuesta).toBe('98');
    expect(result.mensaje).toBe('En proceso');
    expect(result.cdrContent).toBeNull();
    expect(result.requestPayload).toEqual(
      expect.objectContaining({
        tipoComprobante: '01',
        serie: 'F001',
        numeroComprobante: '7',
      }),
    );
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.headers).toEqual({
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'urn:getStatusCdr',
    });
    expect(String(init.body)).toContain('<ser:getStatusCdr>');
    expect(String(init.body)).toContain(
      '<rucComprobante>20123456789</rucComprobante>',
    );
    expect(String(init.body)).toContain(
      '<tipoComprobante>01</tipoComprobante>',
    );
    expect(String(init.body)).toContain(
      '<serieComprobante>F001</serieComprobante>',
    );
    expect(String(init.body)).toContain(
      '<numeroComprobante>7</numeroComprobante>',
    );
  });

  it('rechaza envío si faltan credenciales SUNAT en backend', async () => {
    (config.get as jest.Mock).mockReturnValue(undefined);

    await expect(
      gateway.sendBill({
        ruc: '20123456789',
        fileName: '20123456789-01-F001-00000001',
        xmlFileName: '20123456789-01-F001-00000001.xml',
        signedXml: '<Invoice />',
        ambiente: AmbienteSunat.BETA,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('expone prueba segura de conexión sin revelar contraseña', async () => {
    const result = await gateway.testConnection(
      AmbienteSunat.BETA,
      '20123456789',
    );

    expect(result).toEqual({
      endpoint: 'https://sunat-beta.example.test/billService',
      ambiente: AmbienteSunat.BETA,
      usernameConfigured: true,
      passwordConfigured: true,
      credentialsSource: 'ENV',
      usernameMode: 'RUC_PLUS_SOL_USER',
    });
  });
});
