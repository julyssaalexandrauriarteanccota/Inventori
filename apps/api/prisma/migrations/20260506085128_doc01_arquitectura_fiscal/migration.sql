-- Migration: doc01_arquitectura_fiscal
-- Source: comprobantes sunat/01-arquitectura.md
--
-- Cambios:
--   1. EstadoVenta: quitar FACTURADA (las ventas con ese estado se reclasifican
--      como ENTREGADA + estadoFacturacion=EMITIDA).
--   2. EstadoComprobante: renombrar PENDIENTE→PENDIENTE_ENVIO,
--      ENVIADO→EN_PROCESO_SUNAT y agregar ACEPTADO_CON_OBSERVACIONES,
--      BAJA_PENDIENTE.
--   3. Nuevos enums: EstadoFacturacionVenta, TipoEnvio, EstadoComunicacionBaja.
--   4. Nueva columna ventas.estadoFacturacion (default SIN_COMPROBANTE).
--   5. Comprobante: snapshot JSONB (D8), storage keys (D3), idempotencia,
--      auto-relación notas, ambiente, emitidoPor, etc.
--   6. ComprobanteEnvioLog: tipo TipoEnvio + storage del CDR + métricas.
--   7. ComunicacionBaja: modelo nuevo (entidad de primera clase).

------------------------------------------------------------------------------
-- 1. EstadoComprobante: rename + add (preserva datos)
------------------------------------------------------------------------------
ALTER TYPE "EstadoComprobante" RENAME VALUE 'PENDIENTE' TO 'PENDIENTE_ENVIO';
ALTER TYPE "EstadoComprobante" RENAME VALUE 'ENVIADO' TO 'EN_PROCESO_SUNAT';
ALTER TYPE "EstadoComprobante" ADD VALUE IF NOT EXISTS 'ACEPTADO_CON_OBSERVACIONES' AFTER 'ACEPTADO';
ALTER TYPE "EstadoComprobante" ADD VALUE IF NOT EXISTS 'BAJA_PENDIENTE' AFTER 'RECHAZADO';

-- Defaults a actualizar tras el rename
ALTER TABLE "comprobantes" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE_ENVIO';
ALTER TABLE "notas_credito" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE_ENVIO';
ALTER TABLE "notas_debito" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE_ENVIO';

------------------------------------------------------------------------------
-- 2. Nuevos enums
------------------------------------------------------------------------------
CREATE TYPE "EstadoFacturacionVenta" AS ENUM (
  'SIN_COMPROBANTE', 'EN_EMISION', 'EMITIDA', 'EMITIDA_CON_OBS', 'RECHAZADA', 'ANULADA_FISCAL'
);

CREATE TYPE "TipoEnvio" AS ENUM (
  'ENVIO_INICIAL', 'REINTENTO', 'CONSULTA_TICKET', 'COMUNICACION_BAJA'
);

CREATE TYPE "EstadoComunicacionBaja" AS ENUM (
  'PENDIENTE', 'EN_PROCESO', 'ACEPTADA', 'RECHAZADA'
);

------------------------------------------------------------------------------
-- 3. Venta: nueva columna estadoFacturacion
------------------------------------------------------------------------------
ALTER TABLE "ventas"
  ADD COLUMN "estadoFacturacion" "EstadoFacturacionVenta" NOT NULL DEFAULT 'SIN_COMPROBANTE';

-- Backfill: ventas que estaban como FACTURADA → ENTREGADA + EMITIDA
UPDATE "ventas"
   SET "estado" = 'ENTREGADA', "estadoFacturacion" = 'EMITIDA'
 WHERE "estado" = 'FACTURADA';

------------------------------------------------------------------------------
-- 4. EstadoVenta: quitar FACTURADA (PostgreSQL no permite DROP VALUE
--    directo; recreamos el tipo).
------------------------------------------------------------------------------
ALTER TYPE "EstadoVenta" RENAME TO "EstadoVenta_old";

CREATE TYPE "EstadoVenta" AS ENUM (
  'COTIZACION', 'ORDEN_CONFIRMADA', 'ENTREGADA', 'CANCELADA'
);

ALTER TABLE "ventas"
  ALTER COLUMN "estado" DROP DEFAULT,
  ALTER COLUMN "estado" TYPE "EstadoVenta" USING ("estado"::text::"EstadoVenta"),
  ALTER COLUMN "estado" SET DEFAULT 'COTIZACION';

DROP TYPE "EstadoVenta_old";

------------------------------------------------------------------------------
-- 5. Comprobante: snapshot, ambiente, notas, storage keys, trazabilidad
------------------------------------------------------------------------------
ALTER TABLE "comprobantes"
  ADD COLUMN "snapshot" JSONB,
  ADD COLUMN "ambiente" "AmbienteSunat" NOT NULL DEFAULT 'BETA',
  ADD COLUMN "comprobanteOrigenId" TEXT,
  ADD COLUMN "motivoNota" TEXT,
  ADD COLUMN "motivoNotaDescripcion" TEXT,
  ADD COLUMN "esNotaExcepcional" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "operationId" TEXT,
  ADD COLUMN "ticketSunat" TEXT,
  ADD COLUMN "hashCpe" TEXT,
  ADD COLUMN "xmlStorageKey" TEXT,
  ADD COLUMN "cdrStorageKey" TEXT,
  ADD COLUMN "pdfStorageKey" TEXT,
  ADD COLUMN "emitidoPor" TEXT;

ALTER TABLE "comprobantes"
  ADD CONSTRAINT "comprobantes_operationId_key" UNIQUE ("operationId");

ALTER TABLE "comprobantes"
  ADD CONSTRAINT "comprobantes_comprobanteOrigenId_fkey"
  FOREIGN KEY ("comprobanteOrigenId") REFERENCES "comprobantes"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "comprobantes_estado_idx" ON "comprobantes"("estado");
CREATE INDEX "comprobantes_fechaEmision_idx" ON "comprobantes"("fechaEmision");
CREATE INDEX "comprobantes_tipo_serie_idx" ON "comprobantes"("tipo", "serie");
CREATE INDEX "comprobantes_comprobanteOrigenId_idx" ON "comprobantes"("comprobanteOrigenId");

------------------------------------------------------------------------------
-- 6. ComprobanteEnvioLog: tipo TipoEnvio + storage CDR + métricas
------------------------------------------------------------------------------
-- Las columnas legacy (proveedor, tipoEvento, estado, codigoRespuesta,
-- mensaje, responsePayload) pasan a opcionales para coexistir.
ALTER TABLE "comprobante_envio_logs"
  ADD COLUMN "tipo" "TipoEnvio",
  ADD COLUMN "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "responseCode" TEXT,
  ADD COLUMN "responseDescription" TEXT,
  ADD COLUMN "cdrStorageKey" TEXT,
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "durationMs" INTEGER,
  ALTER COLUMN "tipoEvento" DROP NOT NULL,
  ALTER COLUMN "estado" DROP NOT NULL;

DROP INDEX IF EXISTS "comprobante_envio_logs_estado_idx";
DROP INDEX IF EXISTS "comprobante_envio_logs_tipoEvento_idx";

CREATE INDEX "comprobante_envio_logs_comprobanteId_intento_idx"
  ON "comprobante_envio_logs"("comprobanteId", "intento");
CREATE INDEX "comprobante_envio_logs_tipo_idx"
  ON "comprobante_envio_logs"("tipo");

------------------------------------------------------------------------------
-- 7. ComunicacionBaja (RA-yyyymmdd-NNNN): nuevo modelo
------------------------------------------------------------------------------
CREATE TABLE "comunicaciones_baja" (
  "id"                TEXT PRIMARY KEY,
  "comprobanteId"     TEXT NOT NULL,
  "identificadorBaja" TEXT NOT NULL,
  "motivo"            TEXT NOT NULL,
  "fechaGeneracion"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaReferencia"   TIMESTAMP(3) NOT NULL,
  "estado"            "EstadoComunicacionBaja" NOT NULL DEFAULT 'PENDIENTE',
  "ticketSunat"       TEXT,
  "cdrStorageKey"     TEXT,
  "errorMessage"      TEXT,
  "iniciadoPor"       TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "comunicaciones_baja_comprobanteId_fkey"
    FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "comunicaciones_baja_identificadorBaja_key"
  ON "comunicaciones_baja"("identificadorBaja");
CREATE INDEX "comunicaciones_baja_comprobanteId_idx"
  ON "comunicaciones_baja"("comprobanteId");
CREATE INDEX "comunicaciones_baja_estado_idx"
  ON "comunicaciones_baja"("estado");
CREATE INDEX "comunicaciones_baja_ticketSunat_idx"
  ON "comunicaciones_baja"("ticketSunat");
