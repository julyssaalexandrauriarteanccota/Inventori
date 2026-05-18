import { Injectable } from '@nestjs/common';
import {
  AmbienteSunat,
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
      const valorUnitario = this.roundQuantity(detalle.precioUnitario);
      const precioUnitario = this.roundQuantity(valorUnitario * (1 + tasaIgv));
      const igv = this.roundMoney(baseImponible * tasaIgv);
      const total = this.roundMoney(baseImponible + igv);

      return {
        item: index + 1,
        productoId: detalle.productoId,
        codigoInterno: producto.sku,
        descripcion:
          this.cleanText(producto.descripcion) ??
          this.cleanText(producto.nombre) ??
          'Producto',
        unidadSunat: this.cleanText(producto.unidadMedida?.codigo) ?? 'NIU',
        tipoFiscalProducto:
          producto.tipo === 'SERVICIO'
            ? TipoFiscalProducto.SERVICIO
            : TipoFiscalProducto.BIEN,
        tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
        cantidad: detalle.cantidad,
        valorUnitario,
        precioUnitario,
        descuento: this.roundMoney(detalle.descuento ?? 0),
        baseImponible,
        igv,
        total,
        metadataFiscal: {
          porcentajeIGV,
          productoTipo: producto.tipo,
        },
      };
    });
  }

  private cleanText(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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
