CREATE TABLE "modelos_catalogo" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "TipoProducto" NOT NULL DEFAULT 'EQUIPO',
  "marcaId" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "modelos_catalogo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "productos"
  ADD COLUMN "modeloCatalogoId" TEXT;

INSERT INTO "modelos_catalogo" (
  "id",
  "nombre",
  "tipo",
  "marcaId",
  "activo"
)
SELECT
  gen_random_uuid()::text,
  source."modelo",
  source."tipo",
  source."marcaId",
  true
FROM (
  SELECT DISTINCT
    trim("modelo") AS "modelo",
    "tipo",
    "marcaId"
  FROM "productos"
  WHERE "deletedAt" IS NULL
    AND "modelo" IS NOT NULL
    AND length(trim("modelo")) > 0
) AS source;

UPDATE "productos" AS p
SET "modeloCatalogoId" = mc."id"
FROM "modelos_catalogo" AS mc
WHERE p."deletedAt" IS NULL
  AND p."modelo" IS NOT NULL
  AND trim(p."modelo") = mc."nombre"
  AND p."tipo" = mc."tipo"
  AND p."marcaId" IS NOT DISTINCT FROM mc."marcaId";

ALTER TABLE "modelos_catalogo"
  ADD CONSTRAINT "modelos_catalogo_marcaId_fkey"
  FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_modeloCatalogoId_fkey"
  FOREIGN KEY ("modeloCatalogoId") REFERENCES "modelos_catalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "modelos_catalogo_tipo_idx" ON "modelos_catalogo"("tipo");
CREATE INDEX "modelos_catalogo_marcaId_idx" ON "modelos_catalogo"("marcaId");
CREATE INDEX "productos_modeloCatalogoId_idx" ON "productos"("modeloCatalogoId");
