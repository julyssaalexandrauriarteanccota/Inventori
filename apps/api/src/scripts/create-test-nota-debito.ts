import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { randomUUID } from 'crypto';
import {
  calcularDeadlineEnvio,
  EstadoComprobante,
  TipoDocumento,
  TipoFiscalProducto,
} from '@erp/shared';
import { PrismaService } from '../database/prisma.service';

const ORIGEN_NUMERO = process.argv[2] ?? 'F001-00000001';
const MONTO_TOTAL = Number(process.argv[3] ?? 1.18);
const MOTIVO_CODIGO = '01';
const MOTIVO_DESCRIPCION = 'Intereses por mora de prueba';

function noteSerieForOrigen(tipo: string) {
  return tipo === TipoDocumento.BOLETA ? 'BD01' : 'FD01';
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const origen = await prisma.comprobante.findFirst({
    where: { numero: ORIGEN_NUMERO },
    include: { detallesFiscales: { orderBy: { item: 'asc' } } },
  });
  if (!origen)
    throw new Error(`No existe comprobante origen ${ORIGEN_NUMERO}.`);
  if (
    origen.estado !== EstadoComprobante.ACEPTADO &&
    origen.estado !== EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
  ) {
    throw new Error(
      `El origen ${origen.numero} no está aceptado: ${origen.estado}.`,
    );
  }
  if (!origen.detallesFiscales.length) {
    throw new Error(`El origen ${origen.numero} no tiene detalles fiscales.`);
  }

  const serie = noteSerieForOrigen(origen.tipo);
  const existing = await prisma.comprobante.findFirst({
    where: {
      tipo: TipoDocumento.NOTA_DEBITO,
      comprobanteOrigenId: origen.id,
      serie,
    },
    orderBy: { correlativo: 'desc' },
  });
  if (existing) {
    console.log(
      'Nota de débito de prueba ya existe:',
      existing.id,
      existing.numero,
    );
    await prisma.$disconnect();
    return;
  }

  const last = await prisma.comprobante.findFirst({
    where: { tipo: TipoDocumento.NOTA_DEBITO, serie },
    orderBy: { correlativo: 'desc' },
    select: { correlativo: true },
  });
  const correlativo = Number(last?.correlativo ?? 0) + 1;
  const numero = `${serie}-${String(correlativo).padStart(8, '0')}`;
  const subtotal = +(MONTO_TOTAL / 1.18).toFixed(2);
  const igv = +(MONTO_TOTAL - subtotal).toFixed(2);
  const fechaEmision = new Date();
  const source = origen.detallesFiscales[0];
  const tipoFiscalProducto =
    (source.tipoFiscalProducto as TipoFiscalProducto | null) ??
    TipoFiscalProducto.SERVICIO;

  const created = await prisma.$transaction(async (tx) => {
    const comprobante = await tx.comprobante.create({
      data: {
        ventaId: null,
        tipo: TipoDocumento.NOTA_DEBITO,
        serie,
        correlativo,
        numero,
        ambiente: origen.ambiente,
        comprobanteOrigenId: origen.id,
        motivoNota: MOTIVO_CODIGO,
        motivoNotaDescripcion: MOTIVO_DESCRIPCION,
        esNotaExcepcional: false,
        clienteNombre: origen.clienteNombre,
        clienteDocTipo: origen.clienteDocTipo,
        clienteDocNum: origen.clienteDocNum,
        clienteDireccion: origen.clienteDireccion,
        emisorRuc: origen.emisorRuc,
        emisorRazonSocial: origen.emisorRazonSocial,
        emisorNombreComercial: origen.emisorNombreComercial,
        emisorDireccionFiscal: origen.emisorDireccionFiscal,
        emisorUbigeoFiscal: origen.emisorUbigeoFiscal,
        emisorCodigoEstablecimiento: origen.emisorCodigoEstablecimiento,
        subtotal,
        igv,
        total: MONTO_TOTAL,
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        fechaEmision,
        fechaVencimientoPlazo: calcularDeadlineEnvio(
          TipoDocumento.NOTA_DEBITO,
          fechaEmision,
        ).deadline,
        operationId: randomUUID(),
        tokenConsulta: randomUUID(),
        tokenConsultaCreatedAt: new Date(),
      },
    });

    await tx.comprobanteDetalle.create({
      data: {
        comprobanteId: comprobante.id,
        productoId: source.productoId,
        item: 1,
        codigoInterno: source.codigoInterno ?? 'ND-TEST',
        descripcion: MOTIVO_DESCRIPCION,
        unidadSunat: source.unidadSunat,
        tipoFiscalProducto,
        tipoAfectacionIgv: source.tipoAfectacionIgv,
        cantidad: 1,
        valorUnitario: subtotal,
        precioUnitario: MONTO_TOTAL,
        descuento: 0,
        baseImponible: subtotal,
        igv,
        total: MONTO_TOTAL,
        metadataFiscal: {
          origenItem: source.item,
          origenDescripcion: source.descripcion,
        },
      },
    });

    return comprobante;
  });

  console.log('Nota de débito de prueba creada:', created.id, created.numero);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
