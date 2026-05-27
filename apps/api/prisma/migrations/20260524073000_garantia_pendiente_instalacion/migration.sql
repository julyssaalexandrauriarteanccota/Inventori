ALTER TYPE "EstadoGarantia" ADD VALUE IF NOT EXISTS 'PENDIENTE_COMPLETAR';

ALTER TABLE "garantias"
  ADD COLUMN IF NOT EXISTS "fechaInstalacion" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "direccionInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "contactoInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "telefonoInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "notasInstalacion" TEXT;
