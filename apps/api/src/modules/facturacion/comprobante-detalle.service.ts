import { Injectable } from '@nestjs/common';
import { ComprobanteSnapshotService } from './comprobante-snapshot.service';
import { FacturacionTx } from './serie-documento.service';

interface VentaDetalleFiscalSource {
  cliente: Record<string, unknown>;
  detalles: Array<{
    productoId: string;
    cantidad: number;
    precioUnitario: unknown;
    descuento?: unknown;
    subtotal: unknown;
    producto: {
      id: string;
      sku: string;
      nombre: string;
      descripcion?: string | null;
      tipo: string;
      unidadMedida?: { codigo?: string | null } | null;
    };
  }>;
}

@Injectable()
export class ComprobanteDetalleService {
  constructor(private readonly snapshotService: ComprobanteSnapshotService) {}

  async createFromVenta(
    tx: FacturacionTx,
    comprobanteId: string,
    venta: VentaDetalleFiscalSource,
    porcentajeIGV: number,
  ) {
    const detalles = this.snapshotService.buildDetalleSnapshots(
      venta,
      porcentajeIGV,
    );

    if (detalles.length === 0) {
      return { count: 0 };
    }

    return tx.comprobanteDetalle.createMany({
      data: detalles.map((detalle) => ({
        comprobanteId,
        productoId: detalle.productoId,
        item: detalle.item,
        codigoInterno: detalle.codigoInterno,
        descripcion: detalle.descripcion,
        unidadSunat: detalle.unidadSunat,
        tipoFiscalProducto: detalle.tipoFiscalProducto,
        tipoAfectacionIgv: detalle.tipoAfectacionIgv,
        cantidad: detalle.cantidad,
        valorUnitario: detalle.valorUnitario,
        precioUnitario: detalle.precioUnitario,
        descuento: detalle.descuento,
        baseImponible: detalle.baseImponible,
        igv: detalle.igv,
        total: detalle.total,
        metadataFiscal: detalle.metadataFiscal,
      })),
    });
  }
}
