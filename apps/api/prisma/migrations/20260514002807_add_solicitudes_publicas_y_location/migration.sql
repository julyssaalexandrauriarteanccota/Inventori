-- CreateEnum
CREATE TYPE "NecesidadSolicitud" AS ENUM ('VENTA', 'ALQUILER', 'SOPORTE', 'CONSUMIBLES', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('NUEVA', 'EN_PROCESO', 'ATENDIDA', 'DESCARTADA');

-- AlterTable
ALTER TABLE "config_empresa" ADD COLUMN     "googleMapsEmbedUrl" TEXT,
ADD COLUMN     "horarioAtencion" TEXT,
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "solicitudes_publicas" (
    "id" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "necesidad" "NecesidadSolicitud" NOT NULL,
    "detalle" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'web-landing',
    "ip" TEXT,
    "userAgent" TEXT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'NUEVA',
    "asignadoAId" TEXT,
    "notasInternas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "atendidaAt" TIMESTAMP(3),

    CONSTRAINT "solicitudes_publicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_publicas_estado_idx" ON "solicitudes_publicas"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_publicas_asignadoAId_idx" ON "solicitudes_publicas"("asignadoAId");

-- CreateIndex
CREATE INDEX "solicitudes_publicas_createdAt_idx" ON "solicitudes_publicas"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "solicitudes_publicas" ADD CONSTRAINT "solicitudes_publicas_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
