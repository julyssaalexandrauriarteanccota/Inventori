import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import { numeroALetras } from './numero-a-letras';

/**
 * Doc 06 §2 paso 13 + Doc 09 §6 — render del PDF representación impresa.
 *
 * Cumple con el contenido obligatorio SUNAT: datos completos de emisor y
 * receptor, detalle de líneas, totales, total en letras, código QR y hash
 * de la firma digital. Implementación con `pdfkit` (una sola librería ya
 * instalada en el repo, sin headless browser).
 */
export interface ComprobantePdfInput {
  numero: string;
  tipo: string;
  serie: string;
  correlativo: number;
  fechaEmision: Date;
  emisorRuc: string;
  emisorRazonSocial: string;
  emisorNombreComercial?: string | null;
  emisorDireccion?: string | null;
  emisorUbigeo?: string | null;
  emisorCodigoEstablecimiento?: string | null;
  emisorDepartamentoFiscal?: string | null;
  emisorProvinciaFiscal?: string | null;
  emisorDistritoFiscal?: string | null;
  emisorRegimenTributario?: string | null;
  emisorLogoPath?: string | null;
  clienteDocTipo: string;
  clienteDocNum: string;
  clienteNombre: string;
  clienteDireccion?: string | null;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  cdrCodigo?: string | null;
  cdrMensaje?: string | null;
  formaPago?: string | null;
  pieImpresion?: string | null;
  /**
   * Doc 09 §6 — `digestValue` del XML firmado. Va al QR y al pie del PDF.
   * Si es null/undefined, el PDF se imprime con un placeholder; el QR se
   * genera igual con string vacío para no romper la generación.
   */
  hashFirma?: string | null;
  detalles: Array<{
    item: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
  }>;
}

const TIPO_DOCUMENTO_CODIGO: Record<string, string> = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
};

@Injectable()
export class ComprobantePdfService {
  private readonly logger = new Logger(ComprobantePdfService.name);

  /**
   * Doc 09 §6 — payload del QR según especificación SUNAT:
   * `RUC|TipoDoc|Serie|Correlativo|IGV|Total|FechaEmision|TipoDocReceptor|NumDocReceptor|HashFirma`.
   * Exportado para que tests verifiquen el formato exacto.
   */
  buildQrPayload(input: ComprobantePdfInput): string {
    const tipoCodigo = TIPO_DOCUMENTO_CODIGO[input.tipo] ?? '00';
    const fecha = formatFechaSunat(input.fechaEmision);
    return [
      input.emisorRuc,
      tipoCodigo,
      input.serie,
      String(input.correlativo).padStart(8, '0'),
      input.igv.toFixed(2),
      input.total.toFixed(2),
      fecha,
      input.clienteDocTipo,
      input.clienteDocNum,
      input.hashFirma ?? '',
    ].join('|');
  }

  async render(input: ComprobantePdfInput): Promise<Buffer> {
    const qrPayload = this.buildQrPayload(input);
    let qrDataUrl: string | null = null;
    const logoPath = resolveLocalImagePath(input.emisorLogoPath);
    let logoBuffer: Buffer | null = null;
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo generar QR para ${input.numero}: ${(error as Error).message}`,
      );
    }
    if (logoPath) {
      try {
        logoBuffer = await sharp(logoPath)
          .resize(180, 180, { fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer();
      } catch (error) {
        this.logger.warn(
          `No se pudo preparar logo en PDF ${input.numero}: ${(error as Error).message}`,
        );
      }
    }

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Encabezado emisor: datos fiscales reales congelados al emitir.
        const headerTop = doc.y;
        let headerX = doc.page.margins.left;
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, doc.page.margins.left, headerTop, {
              fit: [72, 72],
            });
            headerX += 88;
          } catch (error) {
            this.logger.warn(
              `No se pudo incrustar logo en PDF ${input.numero}: ${(error as Error).message}`,
            );
          }
        }
        if (
          input.emisorNombreComercial &&
          input.emisorNombreComercial !== input.emisorRazonSocial
        ) {
          doc
            .fontSize(10)
            .text(input.emisorNombreComercial, headerX, headerTop, {
              width: 260,
            });
        }
        doc.fontSize(16).text(input.emisorRazonSocial, headerX, doc.y, {
          width: 260,
        });
        doc.fontSize(10).text(`RUC: ${input.emisorRuc}`, headerX, doc.y, {
          width: 260,
        });
        const direccionCompleta = [
          input.emisorDireccion,
          input.emisorDistritoFiscal,
          input.emisorProvinciaFiscal,
          input.emisorDepartamentoFiscal,
        ]
          .filter(Boolean)
          .join(' - ');
        if (direccionCompleta) doc.text(direccionCompleta);
        if (input.emisorUbigeo) doc.text(`Ubigeo: ${input.emisorUbigeo}`);
        if (input.emisorCodigoEstablecimiento) {
          doc.text(
            `Establecimiento SUNAT: ${input.emisorCodigoEstablecimiento}`,
          );
        }
        if (input.emisorRegimenTributario) {
          doc.text(`Régimen tributario: ${input.emisorRegimenTributario}`);
        }

        doc.moveDown();
        doc.fontSize(14).text(this.tipoLabel(input.tipo), { align: 'right' });
        doc.fontSize(12).text(input.numero, { align: 'right' });
        doc
          .fontSize(10)
          .text(input.fechaEmision.toLocaleString('es-PE'), { align: 'right' });
        doc.text(`Estado: ${input.estado}`, { align: 'right' });
        if (input.formaPago) {
          doc.text(`Forma de pago: ${input.formaPago}`, { align: 'right' });
        }
        if (input.cdrCodigo) {
          doc.text(`CDR ${input.cdrCodigo}: ${input.cdrMensaje ?? ''}`, {
            align: 'right',
          });
        }

        doc.moveDown();
        doc.fontSize(11).text('Receptor', { underline: true });
        doc.fontSize(10).text(input.clienteNombre);
        doc.text(`${input.clienteDocTipo}: ${input.clienteDocNum}`);
        if (input.clienteDireccion) doc.text(input.clienteDireccion);

        doc.moveDown();
        doc.fontSize(11).text('Detalle', { underline: true });
        doc.moveDown(0.5);
        for (const d of input.detalles) {
          doc
            .fontSize(9)
            .text(
              `${d.item}. ${d.descripcion} — ${d.cantidad} x S/ ${d.precioUnitario.toFixed(2)} = S/ ${d.total.toFixed(2)}`,
            );
        }

        doc.moveDown();
        doc
          .fontSize(10)
          .text(`Subtotal: S/ ${input.subtotal.toFixed(2)}`, { align: 'right' })
          .text(`IGV: S/ ${input.igv.toFixed(2)}`, { align: 'right' })
          .fontSize(12)
          .text(`Total: S/ ${input.total.toFixed(2)}`, { align: 'right' });

        // Doc 09 §6 — total en letras (obligatorio).
        doc.moveDown(0.5);
        doc
          .fontSize(9)
          .text(`Son: ${numeroALetras(input.total)}`, { align: 'right' });

        // QR + hash de firma + leyenda. Bloque al pie.
        doc.moveDown();
        const yQr = doc.y;
        if (qrDataUrl) {
          const base64 = qrDataUrl.split(',')[1] ?? '';
          if (base64) {
            const buf = Buffer.from(base64, 'base64');
            doc.image(buf, doc.page.margins.left, yQr, { width: 110 });
          }
        }

        const hashCorto = input.hashFirma ?? 'N/D';
        doc
          .fontSize(8)
          .text(
            `Hash de firma: ${hashCorto}`,
            doc.page.margins.left + 130,
            yQr,
            {
              width:
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right -
                130,
            },
          )
          .moveDown(0.3)
          .text(
            'Representación impresa de la ' + this.tipoLabel(input.tipo) + '.',
            {
              width:
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right -
                130,
            },
          )
          .moveDown(0.3)
          .text(
            'Consulte la validez del comprobante en: https://cpe.sunat.gob.pe',
            {
              width:
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right -
                130,
            },
          );
        if (input.pieImpresion) {
          doc.moveDown(0.5).fontSize(8).text(input.pieImpresion, {
            align: 'center',
          });
        }

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private tipoLabel(tipo: string) {
    switch (tipo) {
      case 'FACTURA':
        return 'FACTURA ELECTRÓNICA';
      case 'BOLETA':
        return 'BOLETA DE VENTA ELECTRÓNICA';
      case 'NOTA_CREDITO':
        return 'NOTA DE CRÉDITO ELECTRÓNICA';
      case 'NOTA_DEBITO':
        return 'NOTA DE DÉBITO ELECTRÓNICA';
      default:
        return tipo;
    }
  }
}

function formatFechaSunat(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function resolveLocalImagePath(value?: string | null): string | null {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return null;

  const normalized = value.trim().replace(/\\/g, '/');
  const basename = path.basename(normalized);
  const relative = normalized.replace(/^\/+/, '');
  const candidates = [
    path.resolve('uploads/public', basename),
    path.resolve('uploads', basename),
    path.resolve('..', '..', 'uploads/public', basename),
    path.resolve('..', '..', 'uploads', basename),
    path.resolve(relative),
    path.resolve('apps/web/public', relative),
    path.resolve('..', '..', 'apps/web/public', relative),
    path.resolve('..', 'web/public', relative),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
