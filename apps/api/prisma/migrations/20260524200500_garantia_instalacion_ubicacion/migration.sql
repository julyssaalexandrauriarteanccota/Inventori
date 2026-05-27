ALTER TABLE "garantias"
  ADD COLUMN IF NOT EXISTS "ubigeoInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "departamentoInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "provinciaInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "distritoInstalacion" TEXT,
  ADD COLUMN IF NOT EXISTS "latitudInstalacion" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitudInstalacion" DOUBLE PRECISION;
