ALTER TABLE "almacenes"
ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "almacenes_nombre_key";

CREATE UNIQUE INDEX "almacenes_nombre_active_key"
ON "almacenes" ("nombre")
WHERE "deletedAt" IS NULL;
