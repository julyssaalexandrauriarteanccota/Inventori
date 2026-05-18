ALTER TABLE "categorias"
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "marcas"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "categorias_nombre_key";
DROP INDEX "marcas_nombre_key";

CREATE UNIQUE INDEX "categorias_nombre_active_key"
ON "categorias" ("nombre")
WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "marcas_nombre_active_key"
ON "marcas" ("nombre")
WHERE "deletedAt" IS NULL;
