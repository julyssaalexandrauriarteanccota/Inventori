import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EstadoComprobante } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { FiscalStorageService } from '../facturacion/fiscal-storage.service';
import { BuscarComprobantePortalDto } from './dto/buscar-comprobante-portal.dto';

type PortalArtifact = 'xml' | 'cdr' | 'pdf';
type PortalDownload =
  | {
      kind: 'redirect';
      filename: string;
      contentType: string;
      redirectUrl: string;
    }
  | {
      kind: 'stream';
      filename: string;
      contentType: string;
      content: Buffer;
    };

interface PortalRequestMeta {
  ip: string;
  userAgent?: string;
}

const PORTAL_VISIBLE_STATES = [
  EstadoComprobante.ACEPTADO,
  EstadoComprobante.ACEPTADO_CON_OBSERVACIONES,
  EstadoComprobante.ANULADO,
] as const;
const SIGNED_DOWNLOAD_TTL_SECONDS = 300;

@Injectable()
export class PortalClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FiscalStorageService,
  ) {}

  async buscarPorDatos(
    dto: BuscarComprobantePortalDto,
    meta: PortalRequestMeta,
  ) {
    const correlativo = Number(dto.correlativo);
    if (!Number.isFinite(correlativo) || correlativo <= 0) {
      throw new BadRequestException('Correlativo inválido');
    }

    const comprobante = await this.prisma.comprobante.findFirst({
      where: {
        emisorRuc: dto.rucEmisor,
        tipo: dto.tipo,
        serie: dto.serie.trim().toUpperCase(),
        correlativo,
        clienteDocTipo: dto.clienteDocTipo.trim().toUpperCase(),
        clienteDocNum: dto.clienteDocNum.trim(),
        estado: { in: [...PORTAL_VISIBLE_STATES] },
      },
      include: portalInclude(),
    });

    if (!comprobante) {
      throw new NotFoundException('Comprobante no encontrado');
    }

    await this.ensureTokenConsulta(comprobante);
    await this.log(comprobante.id, 'FORMULARIO', 'VIEW', meta);

    return this.toPublicResponse(comprobante);
  }

  async buscarPorToken(
    tokenConsulta: string,
    meta: PortalRequestMeta,
  ): Promise<PortalComprobantePublic> {
    const comprobante = await this.prisma.comprobante.findFirst({
      where: {
        tokenConsulta,
        estado: { in: [...PORTAL_VISIBLE_STATES] },
      },
      include: portalInclude(),
    });

    if (!comprobante) {
      throw new NotFoundException('Comprobante no encontrado');
    }

    await this.log(comprobante.id, 'TOKEN', 'VIEW', meta);
    return this.toPublicResponse(comprobante);
  }

  async preview(
    tokenConsulta: string,
    meta: PortalRequestMeta,
  ): Promise<PortalComprobantePublic> {
    const comprobante = await this.buscarPorToken(tokenConsulta, meta);
    await this.log(comprobante.id, 'TOKEN', 'PREVIEW', meta);
    return comprobante;
  }

  async descargar(
    tokenConsulta: string,
    artifactInput: string,
    meta: PortalRequestMeta,
  ): Promise<PortalDownload> {
    const artifact = parsePortalArtifact(artifactInput);
    const comprobante = await this.prisma.comprobante.findFirst({
      where: {
        tokenConsulta,
        estado: { in: [...PORTAL_VISIBLE_STATES] },
      },
      select: {
        id: true,
        numero: true,
        xmlStorageKey: true,
        cdrStorageKey: true,
        pdfStorageKey: true,
      },
    });

    if (!comprobante) {
      throw new NotFoundException('Comprobante no encontrado');
    }

    const storageKey =
      artifact === 'xml'
        ? comprobante.xmlStorageKey
        : artifact === 'cdr'
          ? comprobante.cdrStorageKey
          : artifact === 'pdf'
            ? comprobante.pdfStorageKey
            : null;

    if (!storageKey) {
      throw new NotFoundException(
        `Archivo ${artifact.toUpperCase()} no disponible`,
      );
    }

    const exists = await this.storage.exists(storageKey);
    if (!exists) {
      throw new NotFoundException(
        `Archivo ${artifact.toUpperCase()} no encontrado en storage`,
      );
    }

    await this.log(
      comprobante.id,
      'TOKEN',
      `DOWNLOAD_${artifact.toUpperCase()}`,
      meta,
    );

    const filename = `${comprobante.numero}.${artifact === 'cdr' ? 'cdr.zip' : artifact}`;
    const contentType = contentTypeForArtifact(artifact);
    const signedUrl = await this.storage.getSignedUrl(
      storageKey,
      SIGNED_DOWNLOAD_TTL_SECONDS,
    );

    if (isHttpUrl(signedUrl)) {
      return {
        kind: 'redirect',
        filename,
        contentType,
        redirectUrl: signedUrl,
      };
    }

    const content = await this.storage.readObjectBuffer(storageKey);
    if (!content) {
      throw new NotFoundException(
        `Archivo ${artifact.toUpperCase()} no encontrado en storage`,
      );
    }

    return {
      kind: 'stream',
      filename,
      contentType,
      content,
    };
  }

  private async ensureTokenConsulta(comprobante: {
    id: string;
    tokenConsulta?: string | null;
  }) {
    if (comprobante.tokenConsulta) return comprobante.tokenConsulta;

    const tokenConsulta = randomUUID();
    await this.prisma.comprobante.update({
      where: { id: comprobante.id },
      data: {
        tokenConsulta,
        tokenConsultaCreatedAt: new Date(),
      },
    });
    comprobante.tokenConsulta = tokenConsulta;
    return tokenConsulta;
  }

  private async log(
    comprobanteId: string,
    metodoAcceso: string,
    accion: string,
    meta: PortalRequestMeta,
  ) {
    await this.prisma.portalAccessLog.create({
      data: {
        comprobanteId,
        metodoAcceso,
        accion,
        ipOrigen: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  }

  private toPublicResponse(
    comprobante: PortalComprobante,
  ): PortalComprobantePublic {
    return {
      id: comprobante.id,
      tokenConsulta: comprobante.tokenConsulta,
      numero: comprobante.numero,
      tipo: comprobante.tipo,
      serie: comprobante.serie,
      correlativo: comprobante.correlativo,
      estado: comprobante.estado,
      fechaEmision: comprobante.fechaEmision,
      cdrRecibidaAt: comprobante.cdrRecibidaAt,
      total: comprobante.total,
      subtotal: comprobante.subtotal,
      igv: comprobante.igv,
      emisorRuc: comprobante.emisorRuc,
      emisorRazonSocial: comprobante.emisorRazonSocial,
      emisorDireccionFiscal: comprobante.emisorDireccionFiscal,
      clienteNombre: comprobante.clienteNombre,
      clienteDocTipo: comprobante.clienteDocTipo,
      clienteDocNum: comprobante.clienteDocNum,
      clienteDireccion: comprobante.clienteDireccion,
      hashCpe: comprobante.hashCpe,
      codigoSunat: comprobante.codigoSunat,
      mensajeSunat: comprobante.mensajeSunat,
      hasXml: !!comprobante.xmlStorageKey,
      hasCdr: !!comprobante.cdrStorageKey,
      hasPdf: !!comprobante.pdfStorageKey,
      detalles: comprobante.detallesFiscales.map((d: PortalDetalle) => ({
        item: d.item,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        total: d.total,
      })),
    };
  }
}

function portalInclude() {
  return {
    detallesFiscales: { orderBy: { item: 'asc' as const } },
  };
}

interface PortalDetalle {
  item: number;
  descripcion: string;
  cantidad: unknown;
  precioUnitario: unknown;
  total: unknown;
}

// El comprobante viene del cliente Prisma generado, cuyo enum `TipoDocumento`
// vive en `generated/prisma/enums` y es estructuralmente equivalente al de
// `@erp/shared` pero distinto a nivel nominal. Usamos `string` aquí para no
// acoplar el tipo a una de las dos fuentes y evitar incompatibilidad nominal.
interface PortalComprobante {
  id: string;
  tokenConsulta: string | null;
  numero: string;
  tipo: string;
  serie: string;
  correlativo: number;
  estado: string;
  fechaEmision: Date;
  cdrRecibidaAt: Date | null;
  total: unknown;
  subtotal: unknown;
  igv: unknown;
  emisorRuc: string | null;
  emisorRazonSocial: string | null;
  emisorDireccionFiscal: string | null;
  clienteNombre: string;
  clienteDocTipo: string;
  clienteDocNum: string;
  clienteDireccion: string | null;
  hashCpe: string | null;
  codigoSunat: string | null;
  mensajeSunat: string | null;
  xmlStorageKey: string | null;
  cdrStorageKey: string | null;
  pdfStorageKey: string | null;
  detallesFiscales: PortalDetalle[];
}

export interface PortalComprobantePublic {
  id: string;
  tokenConsulta: string | null;
  numero: string;
  tipo: string;
  serie: string;
  correlativo: number;
  estado: string;
  fechaEmision: Date;
  cdrRecibidaAt: Date | null;
  total: unknown;
  subtotal: unknown;
  igv: unknown;
  emisorRuc: string | null;
  emisorRazonSocial: string | null;
  emisorDireccionFiscal: string | null;
  clienteNombre: string;
  clienteDocTipo: string;
  clienteDocNum: string;
  clienteDireccion: string | null;
  hashCpe: string | null;
  codigoSunat: string | null;
  mensajeSunat: string | null;
  hasXml: boolean;
  hasCdr: boolean;
  hasPdf: boolean;
  detalles: Array<{
    item: number;
    descripcion: string;
    cantidad: unknown;
    precioUnitario: unknown;
    total: unknown;
  }>;
}

function contentTypeForArtifact(artifact: PortalArtifact): string {
  if (artifact === 'xml') return 'application/xml';
  if (artifact === 'cdr') return 'application/zip';
  return 'application/pdf';
}

function parsePortalArtifact(value: string): PortalArtifact {
  if (value === 'xml' || value === 'cdr' || value === 'pdf') return value;
  throw new BadRequestException('Artefacto inválido. Usa xml, cdr o pdf.');
}

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}
