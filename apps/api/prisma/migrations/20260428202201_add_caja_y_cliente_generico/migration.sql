-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO', 'VENTA', 'DEVOLUCION', 'RETIRO', 'DEPOSITO', 'AJUSTE');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "esGenerico" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "marcas" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "modelos_catalogo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tipos_movimiento_config" ALTER COLUMN "comportamiento" DROP DEFAULT;

-- CreateTable
CREATE TABLE "cajas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aperturas_caja" (
    "id" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "usuarioAperturaId" TEXT NOT NULL,
    "usuarioCierreId" TEXT,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "montoInicial" DECIMAL(12,2) NOT NULL,
    "montoEsperado" DECIMAL(12,2),
    "montoContado" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "notasApertura" TEXT,
    "notasCierre" TEXT,
    "abiertaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aperturas_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" TEXT NOT NULL,
    "aperturaId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodoPagoId" TEXT,
    "concepto" TEXT NOT NULL,
    "referenciaTipo" TEXT,
    "referenciaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arqueos_caja" (
    "id" TEXT NOT NULL,
    "aperturaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "montoEsperado" DECIMAL(12,2) NOT NULL,
    "montoContado" DECIMAL(12,2) NOT NULL,
    "diferencia" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arqueos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cajas_nombre_key" ON "cajas"("nombre");

-- CreateIndex
CREATE INDEX "aperturas_caja_cajaId_idx" ON "aperturas_caja"("cajaId");

-- CreateIndex
CREATE INDEX "aperturas_caja_usuarioAperturaId_idx" ON "aperturas_caja"("usuarioAperturaId");

-- CreateIndex
CREATE INDEX "aperturas_caja_usuarioCierreId_idx" ON "aperturas_caja"("usuarioCierreId");

-- CreateIndex
CREATE INDEX "aperturas_caja_estado_idx" ON "aperturas_caja"("estado");

-- CreateIndex
CREATE INDEX "movimientos_caja_aperturaId_idx" ON "movimientos_caja"("aperturaId");

-- CreateIndex
CREATE INDEX "movimientos_caja_metodoPagoId_idx" ON "movimientos_caja"("metodoPagoId");

-- CreateIndex
CREATE INDEX "movimientos_caja_usuarioId_idx" ON "movimientos_caja"("usuarioId");

-- CreateIndex
CREATE INDEX "movimientos_caja_referenciaTipo_referenciaId_idx" ON "movimientos_caja"("referenciaTipo", "referenciaId");

-- CreateIndex
CREATE INDEX "arqueos_caja_aperturaId_idx" ON "arqueos_caja"("aperturaId");

-- CreateIndex
CREATE INDEX "arqueos_caja_usuarioId_idx" ON "arqueos_caja"("usuarioId");

-- AddForeignKey
ALTER TABLE "aperturas_caja" ADD CONSTRAINT "aperturas_caja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "cajas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aperturas_caja" ADD CONSTRAINT "aperturas_caja_usuarioAperturaId_fkey" FOREIGN KEY ("usuarioAperturaId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aperturas_caja" ADD CONSTRAINT "aperturas_caja_usuarioCierreId_fkey" FOREIGN KEY ("usuarioCierreId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES "aperturas_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos_caja" ADD CONSTRAINT "arqueos_caja_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES "aperturas_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos_caja" ADD CONSTRAINT "arqueos_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
