import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { randomUUID } from 'crypto';
import {
  AmbienteSunat,
  EstadoComprobante,
  TipoAfectacionIgv,
  TipoDocumento,
  TipoFiscalProducto,
} from '@erp/shared';
import { PrismaService } from '../database/prisma.service';

const CORRELATIVO = Number(process.argv[2] ?? 1);
const NUMERO = `F001-${String(CORRELATIVO).padStart(8, '0')}`;

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const existing = await prisma.comprobante.findFirst({
    where: {
      tipo: TipoDocumento.FACTURA,
      serie: 'F001',
      correlativo: CORRELATIVO,
    },
  });
  if (existing) {
    console.log('Factura de prueba ya existe:', existing.id, existing.numero);
    await prisma.$disconnect();
    return;
  }

  const configFiscal = await prisma.configEmpresaFiscal.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (!configFiscal) throw new Error('No hay configuración fiscal.');

  const created = await prisma.$transaction(async (tx) => {
    await tx.configEmpresa.update({
      where: { id: 'empresa' },
      data: { correlativoFactura: CORRELATIVO },
    });

    const comprobante = await tx.comprobante.create({
      data: {
        ventaId: null,
        tipo: TipoDocumento.FACTURA,
        serie: 'F001',
        correlativo: CORRELATIVO,
        numero: NUMERO,
        ambiente: AmbienteSunat.BETA,
        clienteNombre:
          'SUPERINTENDENCIA NACIONAL DE ADUANAS Y DE ADMINISTRACION TRIBUTARIA - SUNAT',
        clienteDocTipo: '6',
        clienteDocNum: '20131312955',
        clienteDireccion: 'LIMA',
        emisorRuc: configFiscal.ruc,
        emisorRazonSocial: configFiscal.razonSocial,
        emisorNombreComercial: configFiscal.nombreComercial,
        emisorDireccionFiscal: configFiscal.direccionFiscal,
        emisorUbigeoFiscal: configFiscal.ubigeoFiscal,
        emisorCodigoEstablecimiento: configFiscal.codigoEstablecimiento,
        subtotal: 10,
        igv: 1.8,
        total: 11.8,
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        fechaEmision: new Date(),
        fechaVencimientoPlazo: new Date(),
        operationId: randomUUID(),
        tokenConsulta: randomUUID(),
        tokenConsultaCreatedAt: new Date(),
      },
    });

    await tx.comprobanteDetalle.create({
      data: {
        comprobanteId: comprobante.id,
        item: 1,
        codigoInterno: 'TEST-FAC',
        descripcion: 'Servicio de prueba factura Greenter',
        unidadSunat: 'NIU',
        tipoFiscalProducto: TipoFiscalProducto.BIEN,
        tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
        cantidad: 1,
        valorUnitario: 10,
        precioUnitario: 11.8,
        descuento: 0,
        baseImponible: 10,
        igv: 1.8,
        total: 11.8,
      },
    });

    return comprobante;
  });

  console.log('Factura de prueba creada:', created.id, created.numero);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
