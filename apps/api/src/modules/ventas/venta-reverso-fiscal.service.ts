import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  EstadoComercialEquipo,
  EstadoFacturacionVenta,
  EstadoGarantia,
  TipoMovimiento,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { CajaService } from '../caja/caja.service';

/**
 * Doc 04 §6 — Reverso comercial automático cuando una Comunicación de Baja
 * es ACEPTADA por SUNAT. Restaura stock, libera equipos serializados, cancela
 * garantías y registra reverso de caja. Marca la venta como ANULADA_FISCAL.
 *
 * Idempotente: si la venta ya está ANULADA_FISCAL, retorna sin cambios.
 */
@Injectable()
export class VentaReversoFiscalService {
  private readonly logger = new Logger(VentaReversoFiscalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cajaService: CajaService,
  ) {}

  async aplicarReversoPorBajaFiscal(ventaId: string, usuarioId: string) {
    const venta = await this.prisma.venta.findFirst({
      where: { id: ventaId, deletedAt: null },
      include: {
        detalles: { include: { producto: true } },
      },
    });
    if (!venta) {
      throw new NotFoundException(
        `Venta ${ventaId} no encontrada para reverso fiscal`,
      );
    }

    // Idempotencia: si ya fue revertida fiscalmente, no aplicar de nuevo.
    if (venta.estadoFacturacion === EstadoFacturacionVenta.ANULADA_FISCAL) {
      this.logger.log(
        `Venta ${venta.numero} ya estaba ANULADA_FISCAL; reverso omitido`,
      );
      return venta;
    }

    const movimientoVenta = await this.prisma.movimientoStock.findFirst({
      where: { referenciaTipo: 'VENTA', referenciaId: venta.id },
      select: { almacenOrigenId: true },
    });
    const almacenId = movimientoVenta?.almacenOrigenId ?? null;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Devolver stock por cada detalle.
      if (almacenId) {
        for (const detalle of venta.detalles) {
          if (!detalle.producto.manejaInventario) continue;
          await tx.almacenStock.upsert({
            where: {
              almacenId_productoId: {
                almacenId,
                productoId: detalle.productoId,
              },
            },
            update: { cantidad: { increment: detalle.cantidad } },
            create: {
              almacenId,
              productoId: detalle.productoId,
              cantidad: detalle.cantidad,
            },
          });
          const stockActualizado = await tx.almacenStock.findUnique({
            where: {
              almacenId_productoId: {
                almacenId,
                productoId: detalle.productoId,
              },
            },
            select: { cantidad: true },
          });
          const cantidadPosterior = stockActualizado?.cantidad ?? 0;
          const cantidadAnterior = cantidadPosterior - detalle.cantidad;
          await tx.movimientoStock.create({
            data: {
              tipo: TipoMovimiento.DEVOLUCION_CLIENTE,
              productoId: detalle.productoId,
              almacenDestinoId: almacenId,
              cantidad: detalle.cantidad,
              cantidadAnterior,
              cantidadPosterior,
              referenciaId: venta.id,
              referenciaTipo: 'VENTA_ANULADA_FISCAL',
              justificacion: `Reverso por baja fiscal venta ${venta.numero}`,
              usuarioId,
            },
          });
        }
      }

      // 2. Liberar equipos serializados.
      for (const detalle of venta.detalles) {
        if (!detalle.equipoSerie) continue;
        const equipo = await tx.equipo.findUnique({
          where: { numeroSerie: detalle.equipoSerie },
        });
        if (!equipo) continue;
        await tx.equipoCliente.updateMany({
          where: { equipoId: equipo.id, ventaId: venta.id, fechaFin: null },
          data: { fechaFin: new Date() },
        });
        await tx.equipo.update({
          where: { id: equipo.id },
          data: {
            estadoComercial: EstadoComercialEquipo.DISPONIBLE,
            almacenId: almacenId ?? equipo.almacenId,
          },
        });
      }

      // 3. Anular garantías asociadas.
      await tx.garantia.updateMany({
        where: {
          ventaId: venta.id,
          estado: {
            in: [EstadoGarantia.ACTIVA, EstadoGarantia.PENDIENTE_COMPLETAR],
          },
        },
        data: { estado: EstadoGarantia.ANULADA },
      });

      // 4. Reverso de caja (DEVOLUCION).
      await this.cajaService.registrarReversoVenta(
        {
          usuarioId,
          monto: Number(venta.total),
          metodoPagoId: venta.metodoPagoId ?? undefined,
          ventaId: venta.id,
          concepto: `Reverso por baja fiscal venta ${venta.numero}`,
        },
        tx,
      );

      // 5. Marcar venta como ANULADA_FISCAL (estado comercial sin cambio).
      const ventaActualizada = await tx.venta.update({
        where: { id: ventaId },
        data: {
          estadoFacturacion: EstadoFacturacionVenta.ANULADA_FISCAL,
        },
      });
      return ventaActualizada;
    });

    this.logger.log(
      `Reverso fiscal aplicado a venta ${updated.numero} por usuario ${usuarioId}`,
    );
    return updated;
  }
}
