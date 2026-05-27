import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { DatabaseModule } from './database.module';
import { PrismaService } from './prisma.service';

const logger = new Logger('Seed');

async function main() {
  const app = await NestFactory.createApplicationContext(DatabaseModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);

  try {
    logger.log('Seeding database');

    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    await prisma.usuario.upsert({
      where: { email: 'admin@erp.local' },
      update: {},
      create: {
        email: 'admin@erp.local',
        nombre: 'Administrador',
        apellido: 'Sistema',
        password: hashedPassword,
        rol: 'ADMIN',
        mustChangePassword: true,
      },
    });
    logger.log('Admin user seeded');

    const metodos = [
      { codigo: 'EFECTIVO', nombre: 'Efectivo' },
      { codigo: 'TRANSFERENCIA', nombre: 'Transferencia' },
      { codigo: 'YAPE_PLIN', nombre: 'Yape / Plin' },
      { codigo: 'TARJETA_CREDITO', nombre: 'Tarjeta de crédito' },
      { codigo: 'TARJETA_DEBITO', nombre: 'Tarjeta de débito' },
    ];

    await prisma.metodoPago.updateMany({
      where: { codigo: { notIn: metodos.map((metodo) => metodo.codigo) } },
      data: { activo: false },
    });

    for (const metodo of metodos) {
      await prisma.metodoPago.upsert({
        where: { codigo: metodo.codigo },
        update: { nombre: metodo.nombre, activo: true },
        create: { codigo: metodo.codigo, nombre: metodo.nombre, activo: true },
      });
    }
    logger.log('Payment methods seeded');

    await prisma.configEmpresa.upsert({
      where: { id: 'empresa' },
      update: {},
      create: {
        id: 'empresa',
        razonSocial: '',
        ruc: '',
        direccion: '',
        serieFactura: 'F001',
        serieBoleta: 'B001',
        serieNotaCredito: 'FC01',
        serieNotaDebito: 'FD01',
        porcentajeIGV: 18.0,
      },
    });
    logger.log('Company config seeded');

    await prisma.cliente.upsert({
      where: { dni: '00000000' },
      update: {
        tipo: 'NATURAL',
        nombre: 'Público en General',
        apellido: null,
        razonSocial: null,
        ruc: null,
        esGenerico: true,
        activo: true,
        deletedAt: null,
      },
      create: {
        tipo: 'NATURAL',
        nombre: 'Público en General',
        apellido: null,
        dni: '00000000',
        esGenerico: true,
        activo: true,
        notas:
          'Cliente genérico del sistema para ventas/boletas sin identificación.',
      },
    });
    logger.log('Generic client seeded');

    await prisma.caja.upsert({
      where: { nombre: 'Caja Principal' },
      update: { activa: true },
      create: {
        nombre: 'Caja Principal',
        descripcion: 'Caja por defecto del punto de venta',
        activa: true,
      },
    });
    logger.log('Default caja seeded');

    const almacenPrincipal = await prisma.almacen.findFirst({
      where: { esPrincipal: true, activo: true, deletedAt: null },
      select: { id: true },
    });
    if (!almacenPrincipal) {
      const firstActiveAlmacen = await prisma.almacen.findFirst({
        where: { activo: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      await prisma.almacen.updateMany({
        where: { esPrincipal: true, deletedAt: null },
        data: { esPrincipal: false },
      });

      if (firstActiveAlmacen) {
        await prisma.almacen.update({
          where: { id: firstActiveAlmacen.id },
          data: { esPrincipal: true, activo: true },
        });
      } else {
        await prisma.almacen.create({
          data: {
            nombre: 'Almacén Principal',
            descripcion: 'Almacén principal del sistema',
            esPrincipal: true,
            activo: true,
          },
        });
      }
    }
    logger.log('Default principal almacen ensured');

    // Doc 10 §9 — feriados nacionales del Perú. Necesarios para calcular
    // los 10 días hábiles del plazo NC excepcional (Doc 08 §3).
    const feriados: Array<{ fecha: string; nombre: string; anio: number }> = [
      // 2026
      { fecha: '2026-01-01', nombre: 'Año Nuevo', anio: 2026 },
      { fecha: '2026-04-02', nombre: 'Jueves Santo', anio: 2026 },
      { fecha: '2026-04-03', nombre: 'Viernes Santo', anio: 2026 },
      { fecha: '2026-05-01', nombre: 'Día del Trabajo', anio: 2026 },
      { fecha: '2026-06-29', nombre: 'San Pedro y San Pablo', anio: 2026 },
      { fecha: '2026-07-23', nombre: 'Día de la Marina', anio: 2026 },
      { fecha: '2026-07-28', nombre: 'Fiestas Patrias', anio: 2026 },
      { fecha: '2026-07-29', nombre: 'Fiestas Patrias', anio: 2026 },
      { fecha: '2026-08-06', nombre: 'Batalla de Junín', anio: 2026 },
      { fecha: '2026-08-30', nombre: 'Santa Rosa de Lima', anio: 2026 },
      { fecha: '2026-10-08', nombre: 'Combate de Angamos', anio: 2026 },
      { fecha: '2026-11-01', nombre: 'Día de Todos los Santos', anio: 2026 },
      { fecha: '2026-12-08', nombre: 'Inmaculada Concepción', anio: 2026 },
      { fecha: '2026-12-09', nombre: 'Batalla de Ayacucho', anio: 2026 },
      { fecha: '2026-12-25', nombre: 'Navidad', anio: 2026 },
      // 2027
      { fecha: '2027-01-01', nombre: 'Año Nuevo', anio: 2027 },
      { fecha: '2027-03-25', nombre: 'Jueves Santo', anio: 2027 },
      { fecha: '2027-03-26', nombre: 'Viernes Santo', anio: 2027 },
      { fecha: '2027-05-01', nombre: 'Día del Trabajo', anio: 2027 },
      { fecha: '2027-06-29', nombre: 'San Pedro y San Pablo', anio: 2027 },
      { fecha: '2027-07-23', nombre: 'Día de la Marina', anio: 2027 },
      { fecha: '2027-07-28', nombre: 'Fiestas Patrias', anio: 2027 },
      { fecha: '2027-07-29', nombre: 'Fiestas Patrias', anio: 2027 },
      { fecha: '2027-08-06', nombre: 'Batalla de Junín', anio: 2027 },
      { fecha: '2027-08-30', nombre: 'Santa Rosa de Lima', anio: 2027 },
      { fecha: '2027-10-08', nombre: 'Combate de Angamos', anio: 2027 },
      { fecha: '2027-11-01', nombre: 'Día de Todos los Santos', anio: 2027 },
      { fecha: '2027-12-08', nombre: 'Inmaculada Concepción', anio: 2027 },
      { fecha: '2027-12-09', nombre: 'Batalla de Ayacucho', anio: 2027 },
      { fecha: '2027-12-25', nombre: 'Navidad', anio: 2027 },
    ];
    for (const f of feriados) {
      const fecha = new Date(`${f.fecha}T00:00:00.000Z`);
      await prisma.feriadoNacional.upsert({
        where: { fecha },
        update: { nombre: f.nombre, anio: f.anio },
        create: { fecha, nombre: f.nombre, anio: f.anio, esNoLaborable: false },
      });
    }
    logger.log(`Feriados nacionales seeded (${feriados.length})`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  logger.error(
    'Seed failed',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
