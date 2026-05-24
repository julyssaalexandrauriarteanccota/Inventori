-- Add source and fiscal location details to cached client document validations.
ALTER TABLE "cliente_validaciones_sunat"
  ADD COLUMN "proveedor" TEXT,
  ADD COLUMN "ubigeo" TEXT,
  ADD COLUMN "departamento" TEXT,
  ADD COLUMN "provincia" TEXT,
  ADD COLUMN "distrito" TEXT;

CREATE INDEX "cliente_validaciones_sunat_proveedor_idx"
  ON "cliente_validaciones_sunat"("proveedor");

CREATE INDEX "cliente_validaciones_sunat_ubigeo_idx"
  ON "cliente_validaciones_sunat"("ubigeo");
