-- Clasificacion escalable del catalogo: tipos, subcategorias, imagenes y campos de equipos fisicos.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "TipoProducto" AS ENUM ('EQUIPO', 'REPUESTO', 'INSUMO', 'SERVICIO', 'ACCESORIO');
CREATE TYPE "CondicionProducto" AS ENUM ('NUEVO', 'USADO', 'REACONDICIONADO', 'RECUPERADO');
CREATE TYPE "EstadoComercialEquipo" AS ENUM ('DISPONIBLE', 'VENDIDO', 'ALQUILADO', 'RESERVADO', 'EN_REPARACION', 'USO_INTERNO', 'BAJA');

ALTER TABLE "categorias"
  ADD COLUMN "tipo" "TipoProducto" NOT NULL DEFAULT 'REPUESTO';

ALTER TABLE "productos"
  ADD COLUMN "tipo" "TipoProducto" NOT NULL DEFAULT 'REPUESTO',
  ADD COLUMN "codigoBarras" TEXT,
  ADD COLUMN "codigoQr" TEXT,
  ADD COLUMN "condicion" "CondicionProducto",
  ADD COLUMN "requiereRepuestos" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tiempoEstimadoMin" INTEGER;

UPDATE "productos"
SET "tipo" = CASE
  WHEN "tieneNumeroSerie" = true THEN 'EQUIPO'::"TipoProducto"
  WHEN "esConsumible" = true THEN 'INSUMO'::"TipoProducto"
  ELSE 'REPUESTO'::"TipoProducto"
END;

UPDATE "categorias"
SET "tipo" = subquery.tipo
FROM (
  SELECT "categoriaId",
    CASE
      WHEN bool_or("tipo" = 'EQUIPO'::"TipoProducto") THEN 'EQUIPO'::"TipoProducto"
      WHEN bool_or("tipo" = 'INSUMO'::"TipoProducto") THEN 'INSUMO'::"TipoProducto"
      ELSE 'REPUESTO'::"TipoProducto"
    END AS tipo
  FROM "productos"
  GROUP BY "categoriaId"
) AS subquery
WHERE "categorias"."id" = subquery."categoriaId";

CREATE TABLE "producto_imagenes" (
  "id" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "nombre" TEXT,
  "tipo" TEXT,
  "tamano" INTEGER,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "producto_imagenes_pkey" PRIMARY KEY ("id")
);

INSERT INTO "producto_imagenes" ("id", "productoId", "url", "nombre", "esPrincipal", "orden")
SELECT gen_random_uuid()::text, "id", "imagen", 'Imagen principal', true, 0
FROM "productos"
WHERE "imagen" IS NOT NULL AND length(trim("imagen")) > 0;

ALTER TABLE "producto_imagenes"
  ADD CONSTRAINT "producto_imagenes_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "equipos"
  ADD COLUMN "estadoComercial" "EstadoComercialEquipo" NOT NULL DEFAULT 'DISPONIBLE',
  ADD COLUMN "condicion" "CondicionProducto",
  ADD COLUMN "procedencia" TEXT,
  ADD COLUMN "contadorInicial" INTEGER,
  ADD COLUMN "contadorActual" INTEGER,
  ADD COLUMN "fechaIngreso" TIMESTAMP(3),
  ADD COLUMN "observacionEstado" TEXT,
  ADD COLUMN "codigoQr" TEXT;

CREATE UNIQUE INDEX "productos_codigoBarras_key" ON "productos"("codigoBarras");
CREATE UNIQUE INDEX "productos_codigoQr_key" ON "productos"("codigoQr");
CREATE INDEX "categorias_tipo_idx" ON "categorias"("tipo");
CREATE INDEX "productos_tipo_idx" ON "productos"("tipo");
CREATE INDEX "productos_condicion_idx" ON "productos"("condicion");
CREATE INDEX "producto_imagenes_productoId_idx" ON "producto_imagenes"("productoId");
CREATE UNIQUE INDEX "equipos_codigoQr_key" ON "equipos"("codigoQr");
CREATE INDEX "equipos_estadoComercial_idx" ON "equipos"("estadoComercial");
CREATE INDEX "equipos_condicion_idx" ON "equipos"("condicion");
