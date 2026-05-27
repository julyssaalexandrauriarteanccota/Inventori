import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmbienteSunat, TipoAfectacionIgv, TipoDocumento } from '@erp/shared';
import { CertificadoDigitalService } from './certificado-digital.service';
import { numeroALetras } from './numero-a-letras';
import { SunatCredentialsService } from './sunat-credentials.service';
import type {
  SunatSendBillResult,
  SunatSendSummaryResult,
  SunatStatusResult,
} from './sunat-direct.gateway';

interface GreenterResponse {
  success: boolean;
  accepted?: boolean | null;
  fileName?: string;
  xml?: string;
  xmlText?: string;
  cdrZip?: string | null;
  cdr?: {
    code?: string | null;
    description?: string | null;
    notes?: string[] | null;
  } | null;
  diagnostico?: Record<string, unknown>;
  error?: {
    code?: string | null;
    message?: string | null;
  } | null;
}

interface GreenterBajaResponse {
  success: boolean;
  accepted?: boolean | null;
  ticket?: string | null;
  fileName?: string;
  xml?: string;
  xmlText?: string;
  diagnostico?: Record<string, unknown>;
  error?: {
    code?: string | null;
    message?: string | null;
  } | null;
}

interface GreenterTicketResponse {
  success: boolean;
  accepted?: boolean | null;
  statusCode?: string | null;
  cdrZip?: string | null;
  cdr?: {
    code?: string | null;
    description?: string | null;
    notes?: string[] | null;
  } | null;
  error?: {
    code?: string | null;
    message?: string | null;
  } | null;
}

export interface GreenterSendComprobanteResult {
  result: SunatSendBillResult;
  signedXml: string;
  fileName: string;
  diagnostico: Record<string, unknown>;
}

export interface GreenterSendBajaResult {
  result: SunatSendSummaryResult;
  signedXml: string;
  fileName: string;
  diagnostico: Record<string, unknown>;
}

@Injectable()
export class GreenterGateway {
  private readonly logger = new Logger(GreenterGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly certificadoDigitalService: CertificadoDigitalService,
    private readonly sunatCredentialsService: SunatCredentialsService,
  ) {}

  async sendComprobante(
    comprobante: Record<string, unknown>,
    ambiente: AmbienteSunat,
  ): Promise<GreenterSendComprobanteResult> {
    const payload = await this.buildPayload(comprobante, ambiente, true);
    const response = await this.postEmitir(payload);
    const signedXml = this.decodeXml(response);
    const cdr = response.cdr ?? null;
    const codigoRespuesta =
      cdr?.code ?? response.error?.code ?? (response.success ? '0' : 'SUNAT');
    const mensaje =
      cdr?.description ??
      response.error?.message ??
      (response.success ? 'Aceptado por SUNAT' : 'SUNAT rechazo el documento');
    const requestPayload = this.redactPayload(payload);
    const responsePayload = {
      provider: 'GREENTER',
      fileName: response.fileName,
      accepted: response.accepted,
      cdr,
      diagnostico: response.diagnostico,
      error: response.error,
    };

    this.logger.log(
      `Greenter ${response.fileName ?? 'CPE'} => accepted=${response.accepted} code=${codigoRespuesta}`,
    );

    return {
      signedXml,
      fileName: response.fileName ?? this.localFileName(comprobante),
      diagnostico: response.diagnostico ?? {},
      result: {
        accepted: !!response.accepted,
        codigoRespuesta,
        mensaje: this.withNotes(mensaje, cdr?.notes ?? []),
        requestPayload,
        responsePayload,
        cdrContent: response.cdrZip ?? null,
      },
    };
  }

  async sendBaja(
    comunicacion: Record<string, unknown>,
    ambiente: AmbienteSunat,
  ): Promise<GreenterSendBajaResult> {
    const payload = await this.buildBajaPayload(comunicacion, ambiente, true);
    const response = await this.postBaja(payload);
    const signedXml = this.decodeXml(response);
    const codigoRespuesta =
      response.error?.code ?? (response.success ? '0' : 'SUNAT');
    const mensaje =
      response.error?.message ??
      (response.success
        ? `Ticket SUNAT ${response.ticket ?? ''}`.trim()
        : 'SUNAT rechazo la comunicación de baja');
    const requestPayload = this.redactPayload(payload);
    const responsePayload = {
      provider: 'GREENTER',
      fileName: response.fileName,
      accepted: response.accepted,
      ticket: response.ticket,
      diagnostico: response.diagnostico,
      error: response.error,
    };

    this.logger.log(
      `Greenter baja ${response.fileName ?? 'RA'} => accepted=${response.accepted} ticket=${response.ticket ?? '-'}`,
    );

    return {
      signedXml,
      fileName: response.fileName ?? this.text(comunicacion.identificadorBaja),
      diagnostico: response.diagnostico ?? {},
      result: {
        accepted: !!response.accepted && !!response.ticket,
        ticket: response.ticket ?? undefined,
        codigoRespuesta,
        mensaje,
        requestPayload,
        responsePayload,
      },
    };
  }

  async consultarTicketBaja(
    comunicacion: Record<string, unknown>,
    ambiente: AmbienteSunat,
  ): Promise<SunatStatusResult> {
    const comprobante = this.record(comunicacion.comprobante);
    const ruc = this.required(comprobante.emisorRuc, 'RUC emisor');
    const payload = {
      ...(await this.buildSunatPayload(ruc, ambiente)),
      ticket: this.required(comunicacion.ticketSunat, 'ticket SUNAT'),
    };
    const response = await this.postTicket(payload);
    const cdr = response.cdr ?? null;
    const codigoRespuesta =
      cdr?.code ??
      response.statusCode ??
      response.error?.code ??
      (response.success ? '0' : 'SUNAT');
    const mensaje =
      cdr?.description ??
      response.error?.message ??
      (codigoRespuesta === '98'
        ? 'SUNAT aún está procesando el ticket'
        : response.success
          ? 'Ticket SUNAT resuelto'
          : 'SUNAT rechazo la baja');

    return {
      accepted: !!response.accepted,
      codigoRespuesta,
      mensaje: this.withNotes(mensaje, cdr?.notes ?? []),
      requestPayload: this.redactPayload(payload),
      responsePayload: {
        provider: 'GREENTER',
        accepted: response.accepted,
        statusCode: response.statusCode,
        cdr,
        error: response.error,
      },
      cdrContent: response.cdrZip ?? null,
    };
  }

  async buildPayload(
    comprobante: Record<string, unknown>,
    ambiente: AmbienteSunat,
    send: boolean,
  ) {
    const emisorRuc = this.required(comprobante.emisorRuc, 'RUC emisor');
    const total = this.num(comprobante.total);
    const tipoDoc = this.tipoDoc(comprobante.tipo as TipoDocumento);

    return {
      send,
      ...(await this.buildSunatPayload(emisorRuc, ambiente)),
      documento: {
        tipoDoc,
        tipoOperacion: '0101',
        serie: this.required(comprobante.serie, 'serie'),
        correlativo: String(comprobante.correlativo ?? ''),
        fechaEmision: this.date(comprobante.fechaEmision),
        moneda: 'PEN',
        emisor: this.emisor(comprobante),
        cliente: this.cliente(comprobante),
        ...(tipoDoc === '07' || tipoDoc === '08'
          ? this.notaReferencia(comprobante, tipoDoc)
          : {}),
        totales: this.totales(comprobante),
        items: this.items(comprobante),
        leyendas: [
          {
            codigo: '1000',
            valor: numeroALetras(total),
          },
        ],
      },
    };
  }

  async buildBajaPayload(
    comunicacion: Record<string, unknown>,
    ambiente: AmbienteSunat,
    send: boolean,
  ) {
    const comprobante = this.record(comunicacion.comprobante);
    const emisorRuc = this.required(comprobante.emisorRuc, 'RUC emisor');

    return {
      send,
      ...(await this.buildSunatPayload(emisorRuc, ambiente)),
      baja: {
        identificadorBaja: this.required(
          comunicacion.identificadorBaja,
          'identificador baja',
        ),
        fechaComunicacion: this.date(comunicacion.createdAt),
        fechaReferencia: this.date(comprobante.fechaEmision),
        emisor: this.emisor(comprobante),
        detalle: {
          tipoDoc: this.tipoDoc(comprobante.tipo as TipoDocumento),
          serie: this.required(comprobante.serie, 'serie comprobante'),
          correlativo: String(comprobante.correlativo ?? ''),
          motivo: this.required(comunicacion.motivo, 'motivo baja'),
        },
      },
    };
  }

  private async buildSunatPayload(ruc: string, ambiente: AmbienteSunat) {
    const credentials =
      await this.sunatCredentialsService.resolveCredentials(ruc);
    const certificate =
      await this.certificadoDigitalService.getActiveKeyMaterial();
    const endpoint =
      ambiente === AmbienteSunat.PRODUCCION
        ? this.configService.get<string>('SUNAT_PRODUCCION_URL')
        : this.configService.get<string>('SUNAT_BETA_URL');

    if (!endpoint) {
      throw new BadRequestException(
        `Endpoint SUNAT no configurado para ambiente ${ambiente}`,
      );
    }

    return {
      sunat: {
        endpoint,
        certificatePem: `${certificate.privateKeyPem}\n${certificate.certificatePem}`,
        sol: {
          ruc,
          usuario: this.solUserWithoutRuc(credentials.username, ruc),
          clave: credentials.password,
        },
      },
    };
  }

  private async postEmitir(payload: Record<string, unknown>) {
    return this.postGreenter<GreenterResponse>('/emitir', payload);
  }

  private async postBaja(payload: Record<string, unknown>) {
    return this.postGreenter<GreenterBajaResponse>('/baja', payload);
  }

  private async postTicket(payload: Record<string, unknown>) {
    return this.postGreenter<GreenterTicketResponse>('/ticket', payload);
  }

  private async postGreenter<T>(
    path: string,
    payload: Record<string, unknown>,
  ) {
    const baseUrl = this.configService.get<string>(
      'GREENTER_SERVICE_URL',
      'http://localhost:8081',
    );
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as T | null;

    if (!response.ok || !body) {
      throw new BadRequestException(
        `Greenter sidecar no respondió correctamente (${response.status})`,
      );
    }

    return body;
  }

  private emisor(comprobante: Record<string, unknown>) {
    return {
      ruc: this.required(comprobante.emisorRuc, 'RUC emisor'),
      razonSocial: this.required(
        comprobante.emisorRazonSocial,
        'razon social emisor',
      ),
      nombreComercial:
        this.text(comprobante.emisorNombreComercial) ||
        this.text(comprobante.emisorRazonSocial),
      direccion: {
        ubigeo: this.text(comprobante.emisorUbigeoFiscal) || '000000',
        direccion:
          this.text(comprobante.emisorDireccionFiscal) || 'SIN DIRECCION',
        codigoEstablecimiento:
          this.text(comprobante.emisorCodigoEstablecimiento) || '0000',
      },
    };
  }

  private cliente(comprobante: Record<string, unknown>) {
    return {
      tipoDoc: this.text(comprobante.clienteDocTipo) || '0',
      numDoc: this.text(comprobante.clienteDocNum) || '-',
      razonSocial: this.text(comprobante.clienteNombre) || 'CLIENTE GENERICO',
      direccion: {
        direccion: this.text(comprobante.clienteDireccion) || '-',
      },
    };
  }

  private notaReferencia(
    comprobante: Record<string, unknown>,
    tipoDoc: '07' | '08',
  ) {
    const origen = this.record(comprobante.comprobanteOrigen);
    const origenTipo = this.tipoDoc(origen.tipo as TipoDocumento);
    const numeroOrigen = this.text(origen.numero);
    if (!origenTipo || !numeroOrigen) {
      throw new BadRequestException(
        'La nota no tiene comprobante origen fiscal completo.',
      );
    }

    return {
      documentoAfectado: {
        tipoDoc: origenTipo,
        numero: numeroOrigen,
      },
      motivo: {
        codigo:
          this.text(comprobante.motivoNota) || (tipoDoc === '07' ? '01' : '01'),
        descripcion:
          this.text(comprobante.motivoNotaDescripcion) ||
          (tipoDoc === '07' ? 'ANULACION DE LA OPERACION' : 'INTERESES'),
      },
    };
  }

  private totales(comprobante: Record<string, unknown>) {
    const detalles = this.detalles(comprobante);
    const buckets = detalles.reduce<{
      operGravadas: number;
      operExoneradas: number;
      operInafectas: number;
      operExportacion: number;
      operGratuitas: number;
    }>(
      (acc, detalle) => {
        const base = this.num(detalle.baseImponible);
        switch (detalle.tipoAfectacionIgv) {
          case TipoAfectacionIgv.EXONERADO_OPERACION_ONEROSA:
            acc.operExoneradas += base;
            break;
          case TipoAfectacionIgv.INAFECTO_OPERACION_ONEROSA:
            acc.operInafectas += base;
            break;
          case TipoAfectacionIgv.EXPORTACION:
            acc.operExportacion += base;
            break;
          default:
            acc.operGravadas += base;
            break;
        }
        return acc;
      },
      {
        operGravadas: 0,
        operExoneradas: 0,
        operInafectas: 0,
        operExportacion: 0,
        operGratuitas: 0,
      },
    );

    return {
      ...buckets,
      igv: this.num(comprobante.igv),
      totalImpuestos: this.num(comprobante.igv),
      valorVenta: this.num(comprobante.subtotal),
      subTotal: this.num(comprobante.total),
      importeTotal: this.num(comprobante.total),
    };
  }

  private items(comprobante: Record<string, unknown>) {
    return this.detalles(comprobante).map((detalle) => ({
      codigo: this.text(detalle.codigoInterno) || `ITEM-${detalle.item ?? 1}`,
      unidad: this.text(detalle.unidadSunat) || 'NIU',
      cantidad: this.num(detalle.cantidad),
      descripcion: this.required(detalle.descripcion, 'descripcion item'),
      baseIgv: this.num(detalle.baseImponible),
      porcentajeIgv: this.num(detalle.igv) > 0 ? 18 : 0,
      igv: this.num(detalle.igv),
      tipoAfectacionIgv: this.mapAfectacion(detalle.tipoAfectacionIgv),
      totalImpuestos: this.num(detalle.igv),
      valorVenta: this.num(detalle.baseImponible),
      valorUnitario: this.num(detalle.valorUnitario),
      precioUnitario: this.num(detalle.precioUnitario),
    }));
  }

  private detalles(comprobante: Record<string, unknown>) {
    const detalles = comprobante.detallesFiscales;
    if (!Array.isArray(detalles) || detalles.length === 0) {
      throw new BadRequestException(
        'El comprobante no tiene detalles fiscales.',
      );
    }

    return detalles.map((detalle) => this.record(detalle));
  }

  private tipoDoc(tipo: TipoDocumento | undefined): '01' | '03' | '07' | '08' {
    switch (tipo) {
      case TipoDocumento.FACTURA:
        return '01';
      case TipoDocumento.BOLETA:
        return '03';
      case TipoDocumento.NOTA_CREDITO:
        return '07';
      case TipoDocumento.NOTA_DEBITO:
        return '08';
      default:
        throw new BadRequestException(`Tipo CPE no soportado: ${tipo}`);
    }
  }

  private mapAfectacion(value: unknown) {
    switch (value) {
      case TipoAfectacionIgv.EXONERADO_OPERACION_ONEROSA:
        return '20';
      case TipoAfectacionIgv.INAFECTO_OPERACION_ONEROSA:
        return '30';
      case TipoAfectacionIgv.EXPORTACION:
        return '40';
      default:
        return '10';
    }
  }

  private decodeXml(response: { xmlText?: string; xml?: string }) {
    if (response.xmlText) return response.xmlText;
    if (response.xml)
      return Buffer.from(response.xml, 'base64').toString('utf8');
    return '';
  }

  private redactPayload(payload: Record<string, unknown>) {
    const copy = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
    const sunat = this.record(copy.sunat);
    if (sunat.certificatePem) sunat.certificatePem = '[REDACTED_PEM]';
    const sol = this.record(sunat.sol);
    if (sol.clave) sol.clave = '[REDACTED]';
    return copy;
  }

  private withNotes(message: string, notes: string[]) {
    if (!notes.length) return message;
    return `${message}\nObservaciones: ${notes.join(' | ')}`;
  }

  private localFileName(comprobante: Record<string, unknown>) {
    return [
      this.text(comprobante.emisorRuc),
      this.tipoDoc(comprobante.tipo as TipoDocumento),
      this.text(comprobante.serie),
      this.text(comprobante.correlativo),
    ].join('-');
  }

  private solUserWithoutRuc(username: string, ruc: string) {
    return username.startsWith(ruc) ? username.slice(ruc.length) : username;
  }

  private date(value: unknown) {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }

  private required(value: unknown, field: string) {
    const text = this.text(value);
    if (!text) throw new BadRequestException(`Falta ${field}`);
    return text;
  }

  private text(value: unknown) {
    return value == null ? '' : String(value).trim();
  }

  private num(value: unknown) {
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      return Number(
        (value as { toNumber: () => number }).toNumber().toFixed(2),
      );
    }
    return Number(Number(value ?? 0).toFixed(2));
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }
}
