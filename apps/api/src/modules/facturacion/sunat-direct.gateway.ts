import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
// `adm-zip` uses `export =`, so this syntax is the compatible runtime import here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AdmZip = require('adm-zip');
import { DOMParser, type Document } from '@xmldom/xmldom';
import { AmbienteSunat } from '@erp/shared';
import { SunatCredentialsService } from './sunat-credentials.service';

export interface SunatSendBillInput {
  ruc: string;
  fileName: string;
  xmlFileName: string;
  signedXml: string;
  ambiente: AmbienteSunat;
}

export interface SunatSendBillResult {
  accepted: boolean;
  codigoRespuesta: string;
  mensaje: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  cdrContent?: string | null;
}

export interface SunatSendSummaryInput {
  ruc: string;
  fileName: string;
  xmlFileName: string;
  signedXml: string;
  ambiente: AmbienteSunat;
}

export interface SunatSendSummaryResult {
  accepted: boolean;
  ticket?: string;
  codigoRespuesta: string;
  mensaje: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
}

export interface SunatGetStatusInput {
  ruc: string;
  ticket: string;
  ambiente: AmbienteSunat;
}

export interface SunatGetStatusCdrInput {
  ruc: string;
  tipoComprobante: string;
  serie: string;
  correlativo: number | string;
  ambiente: AmbienteSunat;
}

export interface SunatStatusResult {
  accepted: boolean;
  codigoRespuesta: string;
  mensaje: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  cdrContent?: string | null;
}

interface SunatFaultParseResult {
  fault: true;
  faultCode?: string;
  faultMessage: string;
}

interface SunatSendBillSuccessParseResult {
  fault: false;
  applicationResponse?: string;
}

interface SunatCdrMetadata {
  codigoRespuesta: string;
  mensaje: string;
  notas: string[];
  xmlFileName?: string;
}

type SunatSendBillParseResult =
  | SunatFaultParseResult
  | SunatSendBillSuccessParseResult;

interface SunatSendSummarySuccessParseResult {
  fault: false;
  ticket?: string;
}

type SunatSendSummaryParseResult =
  | SunatFaultParseResult
  | SunatSendSummarySuccessParseResult;

interface SunatStatusSuccessParseResult {
  fault: false;
  statusCode?: string;
  statusMessage?: string;
  content?: string;
}

type SunatStatusParseResult =
  | SunatFaultParseResult
  | SunatStatusSuccessParseResult;

@Injectable()
export class SunatDirectGateway {
  private readonly logger = new Logger(SunatDirectGateway.name);

  /**
   * Doc 06 §8 — timeout absoluto por llamada SOAP.
   * SUNAT puede colgar conexiones; sin timeout el job de BullMQ quedaría
   * activo indefinidamente y bloquearía el slot de concurrencia.
   */
  private readonly soapTimeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly credentialsService?: SunatCredentialsService,
  ) {
    const configured = Number(
      this.configService.get<string>('SUNAT_SOAP_TIMEOUT_MS') ?? '30000',
    );
    this.soapTimeoutMs =
      Number.isFinite(configured) && configured > 0 ? configured : 30_000;
  }

  /**
   * Wrapper de `fetch` con timeout, distinguiendo abort/timeout de otros errores
   * para que el caller pueda clasificar errores recuperables vs. no recuperables.
   */
  private async soapFetch(
    endpoint: string,
    init: {
      headers: Record<string, string>;
      body: string;
    },
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.soapTimeoutMs);
    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers: init.headers,
        body: init.body,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        const timeoutError = new Error(
          `Timeout SUNAT (${this.soapTimeoutMs}ms): ${endpoint}`,
        );
        (timeoutError as Error & { code?: string }).code = 'SUNAT_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async sendBill(input: SunatSendBillInput): Promise<SunatSendBillResult> {
    const endpoint = this.resolveEndpoint(input.ambiente);
    const credentials = await this.resolveCredentials(input.ruc);
    const zipBuffer = this.buildZip(input.xmlFileName, input.signedXml);
    const zipFileName = `${input.fileName}.zip`;
    const zipSha256 = createHash('sha256').update(zipBuffer).digest('hex');
    const soapEnvelope = this.buildSendBillEnvelope(
      credentials.username,
      credentials.password,
      zipFileName,
      zipBuffer.toString('base64'),
    );

    const response = await this.soapFetch(endpoint, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'urn:sendBill',
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();
    const parsed = this.parseSendBillResponse(responseText);
    const requestPayload = {
      endpoint,
      ambiente: input.ambiente,
      fileName: zipFileName,
      xmlFileName: input.xmlFileName,
      zipSha256,
    };

    if (!response.ok || parsed.fault) {
      const fault = this.getFaultMetadata(parsed, response);

      return {
        accepted: false,
        codigoRespuesta: fault.codigoRespuesta,
        mensaje: fault.mensaje,
        requestPayload,
        responsePayload: {
          httpStatus: response.status,
          faultCode: fault.faultCode,
          faultMessage: fault.faultMessage,
        },
      };
    }

    const cdrMetadata = this.parseCdrMetadata(parsed.applicationResponse);
    const applicationResponseSha256 = parsed.applicationResponse
      ? createHash('sha256')
          .update(Buffer.from(parsed.applicationResponse, 'base64'))
          .digest('hex')
      : null;

    if (!cdrMetadata) {
      return {
        accepted: false,
        codigoRespuesta: 'CDR_PARSE_ERROR',
        mensaje:
          'SUNAT respondió sendBill pero no devolvió un CDR válido para confirmar aceptación',
        requestPayload,
        responsePayload: {
          httpStatus: response.status,
          applicationResponseSha256,
          cdrParseStatus: parsed.applicationResponse
            ? 'UNREADABLE_CDR'
            : 'MISSING_APPLICATION_RESPONSE',
        },
        cdrContent: parsed.applicationResponse ?? null,
      };
    }

    return {
      accepted: cdrMetadata.codigoRespuesta === '0',
      codigoRespuesta: cdrMetadata.codigoRespuesta,
      mensaje: cdrMetadata.mensaje,
      requestPayload,
      responsePayload: {
        httpStatus: response.status,
        applicationResponseSha256,
        cdrCodigoRespuesta: cdrMetadata.codigoRespuesta,
        cdrMensaje: cdrMetadata.mensaje,
        cdrNotas: cdrMetadata.notas,
        cdrXmlFileName: cdrMetadata.xmlFileName ?? null,
      },
      cdrContent: parsed.applicationResponse ?? null,
    };
  }

  /**
   * Doc 04 §6 — sendSummary para Comunicación de Baja (RA). SUNAT responde
   * con un `<ticket>` que se consulta luego con getStatus para obtener la CDR.
   */
  async sendSummary(
    input: SunatSendSummaryInput,
  ): Promise<SunatSendSummaryResult> {
    const endpoint = this.resolveEndpoint(input.ambiente);
    const credentials = await this.resolveCredentials(input.ruc);
    const zipBuffer = this.buildZip(input.xmlFileName, input.signedXml);
    const zipFileName = `${input.fileName}.zip`;
    const zipSha256 = createHash('sha256').update(zipBuffer).digest('hex');
    const soapEnvelope = this.buildSendSummaryEnvelope(
      credentials.username,
      credentials.password,
      zipFileName,
      zipBuffer.toString('base64'),
    );

    const response = await this.soapFetch(endpoint, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'urn:sendSummary',
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();
    const parsed = this.parseSendSummaryResponse(responseText);
    const requestPayload = {
      endpoint,
      ambiente: input.ambiente,
      fileName: zipFileName,
      xmlFileName: input.xmlFileName,
      zipSha256,
      operation: 'sendSummary',
    };

    if (!response.ok || parsed.fault) {
      const fault = this.getFaultMetadata(parsed, response);
      return {
        accepted: false,
        codigoRespuesta: fault.codigoRespuesta,
        mensaje: fault.mensaje,
        requestPayload,
        responsePayload: {
          httpStatus: response.status,
          faultCode: fault.faultCode,
          faultMessage: fault.faultMessage,
        },
      };
    }

    if (!parsed.ticket) {
      return {
        accepted: false,
        codigoRespuesta: 'NO_TICKET',
        mensaje:
          'SUNAT respondió sendSummary pero no devolvió ticket para consultar el estado',
        requestPayload,
        responsePayload: {
          httpStatus: response.status,
        },
      };
    }

    return {
      accepted: true,
      ticket: parsed.ticket,
      codigoRespuesta: 'TICKET_RECIBIDO',
      mensaje: `Ticket SUNAT recibido: ${parsed.ticket}`,
      requestPayload,
      responsePayload: {
        httpStatus: response.status,
        ticket: parsed.ticket,
      },
    };
  }

  async getStatus(input: SunatGetStatusInput): Promise<SunatStatusResult> {
    const endpoint = this.resolveEndpoint(input.ambiente);
    const credentials = await this.resolveCredentials(input.ruc);
    const soapEnvelope = this.buildGetStatusEnvelope(
      credentials.username,
      credentials.password,
      input.ticket,
    );
    const requestPayload = {
      endpoint,
      ambiente: input.ambiente,
      ticket: input.ticket,
    };

    return this.postStatusEnvelope(
      endpoint,
      'urn:getStatus',
      soapEnvelope,
      requestPayload,
    );
  }

  async getStatusCdr(
    input: SunatGetStatusCdrInput,
  ): Promise<SunatStatusResult> {
    const endpoint = this.resolveEndpoint(input.ambiente);
    const credentials = await this.resolveCredentials(input.ruc);
    const numeroComprobante = String(Number(input.correlativo));
    const soapEnvelope = this.buildGetStatusCdrEnvelope(
      credentials.username,
      credentials.password,
      input.ruc,
      input.tipoComprobante,
      input.serie,
      numeroComprobante,
    );
    const requestPayload = {
      endpoint,
      ambiente: input.ambiente,
      ruc: input.ruc,
      tipoComprobante: input.tipoComprobante,
      serie: input.serie,
      numeroComprobante,
    };

    return this.postStatusEnvelope(
      endpoint,
      'urn:getStatusCdr',
      soapEnvelope,
      requestPayload,
    );
  }

  async testConnection(ambiente: AmbienteSunat, ruc: string) {
    const endpoint = this.resolveEndpoint(ambiente);
    const credentials = await this.resolveCredentials(ruc);
    return {
      endpoint,
      ambiente,
      usernameConfigured: !!credentials.username,
      passwordConfigured: !!credentials.password,
      credentialsSource: credentials.source,
      usernameMode: credentials.usernameMode,
    };
  }

  private resolveEndpoint(ambiente: AmbienteSunat) {
    if (ambiente === AmbienteSunat.PRODUCCION) {
      return (
        this.configService.get<string>('SUNAT_PRODUCCION_URL') ||
        'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService'
      );
    }

    return (
      this.configService.get<string>('SUNAT_BETA_URL') ||
      'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
    );
  }

  private async resolveCredentials(ruc: string) {
    if (this.credentialsService) {
      return this.credentialsService.resolveCredentials(ruc);
    }

    const fullUsername = this.configService.get<string>('SUNAT_SOL_USERNAME');
    const solUser = this.configService.get<string>('SUNAT_SOL_USER');
    const password = this.configService.get<string>('SUNAT_SOL_PASSWORD');
    const username = fullUsername || (solUser ? `${ruc}${solUser}` : undefined);

    if (!username || !password) {
      throw new BadRequestException(
        'Credenciales SUNAT no configuradas en backend. Configure SUNAT_SOL_USERNAME/SUNAT_SOL_PASSWORD o SUNAT_SOL_USER/SUNAT_SOL_PASSWORD.',
      );
    }

    return {
      username,
      password,
      source: 'ENV' as const,
      usernameMode: fullUsername
        ? ('FULL_USERNAME' as const)
        : ('RUC_PLUS_SOL_USER' as const),
    };
  }

  private buildZip(xmlFileName: string, signedXml: string) {
    const zip = new AdmZip();
    zip.addFile(xmlFileName, Buffer.from(signedXml, 'latin1'));
    return zip.toBuffer();
  }

  private buildSendBillEnvelope(
    username: string,
    password: string,
    fileName: string,
    contentBase64: string,
  ) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    ${this.buildSecurityHeader(username, password)}
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${this.escape(fileName)}</fileName>
      <contentFile>${contentBase64}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private buildSendSummaryEnvelope(
    username: string,
    password: string,
    fileName: string,
    contentBase64: string,
  ) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    ${this.buildSecurityHeader(username, password)}
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendSummary>
      <fileName>${this.escape(fileName)}</fileName>
      <contentFile>${contentBase64}</contentFile>
    </ser:sendSummary>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private buildGetStatusEnvelope(
    username: string,
    password: string,
    ticket: string,
  ) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    ${this.buildSecurityHeader(username, password)}
  </soapenv:Header>
  <soapenv:Body>
    <ser:getStatus>
      <ticket>${this.escape(ticket)}</ticket>
    </ser:getStatus>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private buildGetStatusCdrEnvelope(
    username: string,
    password: string,
    ruc: string,
    tipoComprobante: string,
    serie: string,
    numeroComprobante: string,
  ) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    ${this.buildSecurityHeader(username, password)}
  </soapenv:Header>
  <soapenv:Body>
    <ser:getStatusCdr>
      <rucComprobante>${this.escape(ruc)}</rucComprobante>
      <tipoComprobante>${this.escape(tipoComprobante)}</tipoComprobante>
      <serieComprobante>${this.escape(serie)}</serieComprobante>
      <numeroComprobante>${this.escape(numeroComprobante)}</numeroComprobante>
    </ser:getStatusCdr>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private buildSecurityHeader(username: string, password: string) {
    return `<wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${this.escape(username)}</wsse:Username>
        <wsse:Password>${this.escape(password)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>`;
  }

  private async postStatusEnvelope(
    endpoint: string,
    soapAction: string,
    soapEnvelope: string,
    requestPayload: Record<string, unknown>,
  ): Promise<SunatStatusResult> {
    const response = await this.soapFetch(endpoint, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: soapAction,
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();
    const parsed = this.parseStatusResponse(responseText);

    if (!response.ok || parsed.fault) {
      const fault = this.getFaultMetadata(parsed, response);

      return {
        accepted: false,
        codigoRespuesta: fault.codigoRespuesta,
        mensaje: fault.mensaje,
        requestPayload,
        responsePayload: {
          httpStatus: response.status,
          faultCode: fault.faultCode,
          faultMessage: fault.faultMessage,
        },
      };
    }

    const cdrContent = parsed.content ?? null;
    return {
      accepted: parsed.statusCode === '0',
      codigoRespuesta: parsed.statusCode || 'UNKNOWN',
      mensaje: parsed.statusMessage || 'Respuesta SUNAT sin mensaje',
      requestPayload,
      responsePayload: {
        httpStatus: response.status,
        statusCode: parsed.statusCode,
        statusMessage: parsed.statusMessage,
        contentSha256: cdrContent
          ? createHash('sha256')
              .update(Buffer.from(cdrContent, 'base64'))
              .digest('hex')
          : null,
      },
      cdrContent,
    };
  }

  private parseSendBillResponse(
    responseText: string,
  ): SunatSendBillParseResult {
    try {
      const doc = new DOMParser().parseFromString(responseText, 'text/xml');
      const faultString = this.firstText(doc, 'faultstring');
      const faultCode = this.firstText(doc, 'faultcode');
      if (faultString || faultCode) {
        return {
          fault: true,
          faultCode,
          faultMessage: faultString || 'Error SUNAT',
        };
      }

      return {
        fault: false,
        applicationResponse: this.firstText(doc, 'applicationResponse'),
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo parsear respuesta SUNAT: ${(error as Error).message}`,
      );
      return {
        fault: true,
        faultCode: 'PARSE_ERROR',
        faultMessage: responseText,
      };
    }
  }

  private parseSendSummaryResponse(
    responseText: string,
  ): SunatSendSummaryParseResult {
    try {
      const doc = new DOMParser().parseFromString(responseText, 'text/xml');
      const faultString = this.firstText(doc, 'faultstring');
      const faultCode = this.firstText(doc, 'faultcode');
      if (faultString || faultCode) {
        return {
          fault: true,
          faultCode,
          faultMessage: faultString || 'Error SUNAT',
        };
      }

      return {
        fault: false,
        ticket: this.firstText(doc, 'ticket'),
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo parsear respuesta sendSummary SUNAT: ${(error as Error).message}`,
      );
      return {
        fault: true,
        faultCode: 'PARSE_ERROR',
        faultMessage: responseText,
      };
    }
  }

  private parseStatusResponse(responseText: string): SunatStatusParseResult {
    try {
      const doc = new DOMParser().parseFromString(responseText, 'text/xml');
      const faultString = this.firstText(doc, 'faultstring');
      const faultCode = this.firstText(doc, 'faultcode');
      if (faultString || faultCode) {
        return {
          fault: true,
          faultCode,
          faultMessage: faultString || 'Error SUNAT',
        };
      }

      return {
        fault: false,
        statusCode: this.firstText(doc, 'statusCode'),
        statusMessage: this.firstText(doc, 'statusMessage'),
        content: this.firstText(doc, 'content'),
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo parsear respuesta de estado SUNAT: ${(error as Error).message}`,
      );
      return {
        fault: true,
        faultCode: 'PARSE_ERROR',
        faultMessage: responseText,
      };
    }
  }

  private parseCdrMetadata(applicationResponse?: string) {
    if (!applicationResponse) return null;

    const decoded = Buffer.from(applicationResponse, 'base64');
    const xmlFromZip = this.extractXmlFromCdrZip(decoded);
    const xml = xmlFromZip?.xml ?? decoded.toString('utf8');

    if (!xml.trim().startsWith('<')) {
      return null;
    }

    try {
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const codigoRespuesta = this.firstText(doc, 'ResponseCode');
      if (!codigoRespuesta) return null;

      return {
        codigoRespuesta,
        mensaje:
          this.firstText(doc, 'Description') ||
          (codigoRespuesta === '0'
            ? 'Aceptado por SUNAT'
            : 'Rechazado por SUNAT'),
        notas: this.allTexts(doc, 'Note'),
        xmlFileName: xmlFromZip?.fileName,
      } satisfies SunatCdrMetadata;
    } catch (error) {
      this.logger.warn(
        `No se pudo parsear CDR SUNAT: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private extractXmlFromCdrZip(buffer: Buffer) {
    try {
      const zip = new AdmZip(buffer);
      const entry = zip
        .getEntries()
        .find(
          (candidate) =>
            !candidate.isDirectory &&
            candidate.entryName.toLowerCase().endsWith('.xml'),
        );
      if (!entry) return null;

      return {
        fileName: entry.entryName,
        xml: entry.getData().toString('utf8'),
      };
    } catch {
      return null;
    }
  }

  private getFaultMetadata(
    parsed: SunatSendBillParseResult | SunatStatusParseResult,
    response: Response,
  ): {
    codigoRespuesta: string;
    mensaje: string;
    faultCode?: string;
    faultMessage?: string;
  } {
    if (parsed.fault) {
      return {
        codigoRespuesta: parsed.faultCode ?? String(response.status),
        mensaje: parsed.faultMessage,
        faultCode: parsed.faultCode,
        faultMessage: parsed.faultMessage,
      };
    }

    return {
      codigoRespuesta: String(response.status),
      mensaje: response.statusText,
      faultCode: undefined,
      faultMessage: undefined,
    };
  }

  private firstText(doc: Document, localName: string): string | undefined {
    return this.allTexts(doc, localName)[0];
  }

  private allTexts(doc: Document, localName: string): string[] {
    const directNodes = Array.from(doc.getElementsByTagName(localName));
    const localNameNodes = Array.from(doc.getElementsByTagName('*')).filter(
      (node) => node.localName === localName,
    );

    return Array.from(new Set([...directNodes, ...localNameNodes]))
      .map((node) => node.textContent?.trim())
      .filter((value): value is string => !!value);
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
