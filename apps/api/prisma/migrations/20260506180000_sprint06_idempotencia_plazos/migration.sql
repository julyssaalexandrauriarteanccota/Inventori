-- Sprint 06 §4-§5 — Idempotencia + persistencia de plazos.
--
-- Cambios:
--   1. Agregar enum value REQUIERE_REVISION a EstadoComprobante.
--   2. Agregar Comprobante.payloadHash y Comprobante.fechaVencimientoPlazo.
--   3. Indexar fechaVencimientoPlazo para que el cron monitor.plazos consulte
--      eficientemente comprobantes a punto de vencer.

ALTER TYPE "EstadoComprobante" ADD VALUE IF NOT EXISTS 'REQUIERE_REVISION';

ALTER TABLE "comprobantes"
  ADD COLUMN IF NOT EXISTS "payloadHash" TEXT,
  ADD COLUMN IF NOT EXISTS "fechaVencimientoPlazo" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "comprobantes_fechaVencimientoPlazo_idx"
  ON "comprobantes" ("fechaVencimientoPlazo");
