-- AlterTable
ALTER TABLE "comprobantes" ADD COLUMN     "cdrRecibidaAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "comunicaciones_baja" ADD COLUMN     "cdrCodigo" TEXT,
ADD COLUMN     "cdrMensaje" TEXT,
ADD COLUMN     "cdrRecibidaAt" TIMESTAMP(3),
ADD COLUMN     "xmlStorageKey" TEXT;

-- Doc 04 §5.3 — impedir doble baja activa por comprobante (PENDIENTE/EN_PROCESO/ACEPTADA).
CREATE UNIQUE INDEX "comunicaciones_baja_active_unique"
  ON "comunicaciones_baja" ("comprobanteId")
  WHERE "estado" IN ('PENDIENTE', 'EN_PROCESO', 'ACEPTADA');
