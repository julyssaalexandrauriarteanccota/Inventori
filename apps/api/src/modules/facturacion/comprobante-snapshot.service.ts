import { Injectable } from '@nestjs/common';
import {
  AmbienteSunat,
  normalizeSunatUnidadMedidaCode,
  TipoAfectacionIgv,
  TipoDocumento,
  TipoFiscalProducto,
} from '@erp/shared';

interface ClienteSnapshotSource {
  nombre?: string | null;
  apellido?: string | null;
  razonSocial?: string | null;
  ruc?: string | null;
  dni?: string | null;
  direccion?: string | null;
}

interface ProductoSnapshotSource {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  tipo: string;
  unidadMedida?: {
    codigo?: string | null;
  } | null;
}

interface DetalleVentaSnapshotSource {
  productoId: string;
  cantidad: number;
  precioUnitario: unknown;
  descuento?: unknown;
  subtotal: unknown;
  producto: ProductoSnapshotSource;
}

interface VentaSnapshotSource {
  cliente: ClienteSnapshotSource;
  detalles: DetalleVentaSnapshotSource[];
}

interface ConfigEmpresaSnapshotSource {
  ruc?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  direccion?: string | null;
}

interface ConfigEmpresaFiscalSnapshotSource {
  ruc?: string | null;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  direccionFiscal?: string | null;
  ubigeoFiscal?: string | null;
  departamentoFiscal?: string | null;
  provinciaFiscal?: string | null;
  distritoFiscal?: string | null;
  codigoEstablecimiento?: string | null;
}

export interface ClienteComprobanteSnapshot {
  clienteNombre: string;
  clienteDocTipo: string;
  clienteDocNum: string;
  clienteDireccion: string | null;
}

export interface EmisorComprobanteSnapshot {
  emisorRuc: string;
  emisorRazonSocial: string;
  emisorNombreComercial: string | null;
  emisorDireccionFiscal: string | null;
  emisorUbigeoFiscal: string | null;
  emisorDepartamentoFiscal: string | null;
  emisorProvinciaFiscal: string | null;
  emisorDistritoFiscal: string | null;
  emisorCodigoEstablecimiento: string | null;
}

export interface ComprobanteDetalleSnapshot {
  item: number;
  productoId: string;
  codigoInterno: string;
  descripcion: string;
  unidadSunat: string;
  tipoFiscalProducto: TipoFiscalProducto;
  tipoAfectacionIgv: TipoAfectacionIgv;
  cantidad: number;
  valorUnitario: number;
  precioUnitario: number;
  descuento: number;
  baseImponible: number;
  igv: number;
  total: number;
  metadataFiscal: Record<string, string | number | boolean | null>;
}

interface BuildFiscalSnapshotParams {
  venta: VentaSnapshotSource;
  tipoDocumento: TipoDocumento;
  serie: string;
  correlativo: number;
  numero: string;
  fechaEmision: Date;
  subtotal: number;
  igv: number;
  total: number;
  porcentajeIGV: number;
  ambiente: AmbienteSunat;
  config: ConfigEmpresaSnapshotSource;
  configFiscal?: ConfigEmpresaFiscalSnapshotSource | null;
  observaciones?: string | null;
}

@Injectable()
export class ComprobanteSnapshotService {
  buildFiscalSnapshot(params: BuildFiscalSnapshotParams) {
    const emisor = this.buildEmisorSnapshot(params.config, params.configFiscal);
    const receptor = this.buildClienteSnapshot(
      params.venta,
      params.tipoDocumento,
    );
    const lineas = this.buildDetalleSnapshots(
      params.venta,
      params.porcentajeIGV,
    );

    return {
      version: '1.0',
      emisor: {
        ruc: emisor.emisorRuc,
        razonSocial: emisor.emisorRazonSocial,
        nombreComercial: emisor.emisorNombreComercial,
        direccionFiscal: {
          direccion: emisor.emisorDireccionFiscal,
          ubigeo: emisor.emisorUbigeoFiscal,
          departamento: emisor.emisorDepartamentoFiscal,
          provincia: emisor.emisorProvinciaFiscal,
          distrito: emisor.emisorDistritoFiscal,
          codigoPais: 'PE',
        },
        codigoEstablecimiento: emisor.emisorCodigoEstablecimiento ?? '0000',
      },
      receptor: {
        tipoDocumento: receptor.clienteDocTipo,
        numeroDocumento: receptor.clienteDocNum,
        razonSocial: receptor.clienteNombre,
        direccion: receptor.clienteDireccion,
      },
      comprobante: {
        tipo: params.tipoDocumento,
        codigoTipo: this.documentCodeForTipo(params.tipoDocumento),
        serie: params.serie,
        correlativo: params.correlativo,
        numero: params.numero,
        fechaEmision: params.fechaEmision.toISOString(),
        moneda: 'PEN',
        tipoOperacion: '0101',
        formaPago: { tipo: 'Contado', cuotas: [] },
        observaciones: this.cleanText(params.observaciones),
      },
      lineas,
      totales: {
        subtotal: params.subtotal,
        igv: params.igv,
        total: params.total,
        porcentajeIGV: params.porcentajeIGV,
      },
      configuracion: {
        ambiente: params.ambiente,
        ublVersion: '2.1',
        customizationId: '2.0',
      },
    };
  }

  buildEmisorSnapshot(
    config: ConfigEmpresaSnapshotSource,
    configFiscal?: ConfigEmpresaFiscalSnapshotSource | null,
  ): EmisorComprobanteSnapshot {
    return {
      emisorRuc:
        this.cleanText(configFiscal?.ruc) ?? this.cleanText(config.ruc) ?? '',
      emisorRazonSocial:
        this.cleanText(configFiscal?.razonSocial) ??
        this.cleanText(config.razonSocial) ??
        '',
      emisorNombreComercial:
        this.cleanText(configFiscal?.nombreComercial) ??
        this.cleanText(config.nombreComercial),
      emisorDireccionFiscal:
        this.cleanText(configFiscal?.direccionFiscal) ??
        this.cleanText(config.direccion),
      emisorUbigeoFiscal: this.cleanText(configFiscal?.ubigeoFiscal),
      emisorDepartamentoFiscal: this.cleanText(configFiscal?.departamentoFiscal),
      emisorProvinciaFiscal: this.cleanText(configFiscal?.provinciaFiscal),
      emisorDistritoFiscal: this.cleanText(configFiscal?.distritoFiscal),
      emisorCodigoEstablecimiento: this.cleanText(
        configFiscal?.codigoEstablecimiento,
      ),
    };
  }

  buildClienteSnapshot(
    venta: VentaSnapshotSource,
    tipoDocumento: string,
  ): ClienteComprobanteSnapshot {
    const cliente = venta.cliente;
    const nombreNatural = [cliente.nombre, cliente.apellido]
      .map((value) => this.cleanText(value))
      .filter(Boolean)
      .join(' ');
    const clienteNombre =
      this.cleanText(cliente.razonSocial) ??
      this.cleanText(nombreNatural) ??
      'PUBLICO GENERAL';

    const esFactura = tipoDocumento === 'FACTURA';
    if (esFactura) {
      return {
        clienteNombre,
        clienteDocTipo: '6',
        clienteDocNum: this.cleanText(cliente.ruc) ?? '',
        clienteDireccion: this.cleanText(cliente.direccion),
      };
    }

    const dni = this.cleanText(cliente.dni);
    const hasValidDni = !!dni && /^\d{8}$/.test(dni) && dni !== '00000000';

    return {
      clienteNombre,
      clienteDocTipo: hasValidDni ? '1' : '0',
      clienteDocNum: hasValidDni ? dni : '00000000',
      clienteDireccion: this.cleanText(cliente.direccion),
    };
  }

  buildDetalleSnapshots(
    venta: VentaSnapshotSource,
    porcentajeIGV: number,
  ): ComprobanteDetalleSnapshot[] {
    const tasaIgv = porcentajeIGV / 100;

    return venta.detalles.map((detalle, index) => {
      const producto = detalle.producto;
      const baseImponible = this.roundMoney(detalle.subtotal);
      const precioUnitario = this.roundQuantity(detalle.precioUnitario);
      const valorUnitario = this.roundQuantity(precioUnitario / (1 + tasaIgv));
      const descuentoInclIgv = this.roundMoney(detalle.descuento ?? 0);
      const total = this.roundMoney(
        Math.max(0, precioUnitario * detalle.cantidad - descuentoInclIgv),
      );
      const igv = this.roundMoney(total - baseImponible);
      const descuento = this.roundMoney(descuentoInclIgv / (1 + tasaIgv));

      return {
        item: index + 1,
        productoId: detalle.productoId,
        codigoInterno: producto.sku,
        descripcion:
          this.cleanText(producto.descripcion) ??
          this.cleanText(producto.nombre) ??
          'Producto',
        unidadSunat: normalizeSunatUnidadMedidaCode(
          this.cleanText(producto.unidadMedida?.codigo),
          producto.tipo === 'SERVICIO' ? 'ZZ' : 'NIU',
        ),
        tipoFiscalProducto:
          producto.tipo === 'SERVICIO'
            ? TipoFiscalProducto.SERVICIO
            : TipoFiscalProducto.BIEN,
        tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
        cantidad: detalle.cantidad,
        valorUnitario,
        precioUnitario,
        descuento,
        baseImponible,
        igv,
        total,
        metadataFiscal: {
          porcentajeIGV,
          productoTipo: producto.tipo,
          precioUnitarioIncluyeIgv: true,
        },
      };
    });
  }

  private cleanText(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = this.plainText(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private plainText(value: string) {
    return value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, ' ');
  }

  private roundMoney(value: unknown) {
    return +Number(value ?? 0).toFixed(2);
  }

  private roundQuantity(value: unknown) {
    return +Number(value ?? 0).toFixed(4);
  }

  private documentCodeForTipo(tipo: TipoDocumento) {
    const map: Record<TipoDocumento, string> = {
      [TipoDocumento.FACTURA]: '01',
      [TipoDocumento.BOLETA]: '03',
      [TipoDocumento.NOTA_CREDITO]: '07',
      [TipoDocumento.NOTA_DEBITO]: '08',
    };
    return map[tipo];
  }
}
