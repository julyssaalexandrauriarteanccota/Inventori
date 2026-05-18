ALTER TYPE "CondicionProducto" ADD VALUE IF NOT EXISTS 'SEMINUEVO';

ALTER TABLE "marcas"
ADD COLUMN IF NOT EXISTS "tipos" "TipoProducto"[] NOT NULL DEFAULT ARRAY['EQUIPO']::"TipoProducto"[];

UPDATE "marcas" AS m
SET "tipos" = source."tipos"
FROM (
  SELECT
    p."marcaId" AS "marcaId",
    ARRAY_AGG(DISTINCT p."tipo") AS "tipos"
  FROM "productos" AS p
  WHERE p."marcaId" IS NOT NULL
    AND p."deletedAt" IS NULL
  GROUP BY p."marcaId"
) AS source
WHERE m."id" = source."marcaId";
