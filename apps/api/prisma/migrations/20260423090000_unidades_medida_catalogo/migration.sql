-- CreateTable
CREATE TABLE "unidades_medida" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidades_medida_codigo_key" ON "unidades_medida"("codigo");

-- Seed base units
INSERT INTO "unidades_medida" ("id", "codigo", "nombre", "descripcion", "activo", "createdAt", "updatedAt", "deletedAt")
VALUES
    ('11111111-1111-4111-8111-111111111111', 'UND', 'Unidad', 'Unidad genérica', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('22222222-2222-4222-8222-222222222222', 'KG', 'Kilogramo', 'Peso en kilogramos', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('33333333-3333-4333-8333-333333333333', 'GR', 'Gramo', 'Peso en gramos', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('44444444-4444-4444-8444-444444444444', 'LT', 'Litro', 'Volumen en litros', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('55555555-5555-4555-8555-555555555555', 'ML', 'Mililitro', 'Volumen en mililitros', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('66666666-6666-4666-8666-666666666666', 'M', 'Metro', 'Longitud en metros', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('77777777-7777-4777-8777-777777777777', 'CM', 'Centímetro', 'Longitud en centímetros', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('88888888-8888-4888-8888-888888888888', 'CAJA', 'Caja', 'Presentación por caja', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
    ('99999999-9999-4999-8999-999999999999', 'PAQ', 'Paquete', 'Presentación por paquete', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

-- Add foreign key column to productos
ALTER TABLE "productos" ADD COLUMN "unidadMedidaId" TEXT;

-- Map common existing free-text values to seeded units
UPDATE "productos"
SET "unidadMedidaId" = CASE
    WHEN UPPER(TRIM(COALESCE("unidadMedida", ''))) IN ('', 'UND', 'UNIDAD', 'UNIDADES', 'UNI', 'UNIT') THEN '11111111-1111-4111-8111-111111111111'
    WHEN UPPER(TRIM("unidadMedida")) IN ('KG', 'KILO', 'KILO', 'KILOGRAMO', 'KILOGRAMOS') THEN '22222222-2222-4222-8222-222222222222'
    WHEN UPPER(TRIM("unidadMedida")) IN ('GR', 'GRAMO', 'GRAMOS') THEN '33333333-3333-4333-8333-333333333333'
    WHEN UPPER(TRIM("unidadMedida")) IN ('LT', 'L', 'LITRO', 'LITROS') THEN '44444444-4444-4444-8444-444444444444'
    WHEN UPPER(TRIM("unidadMedida")) IN ('ML', 'MILILITRO', 'MILILITROS') THEN '55555555-5555-4555-8555-555555555555'
    WHEN UPPER(TRIM("unidadMedida")) IN ('M', 'METRO', 'METROS') THEN '66666666-6666-4666-8666-666666666666'
    WHEN UPPER(TRIM("unidadMedida")) IN ('CM', 'CENTIMETRO', 'CENTIMETROS', 'CENTÍMETRO', 'CENTÍMETROS') THEN '77777777-7777-4777-8777-777777777777'
    WHEN UPPER(TRIM("unidadMedida")) IN ('CAJA', 'CJ') THEN '88888888-8888-4888-8888-888888888888'
    WHEN UPPER(TRIM("unidadMedida")) IN ('PAQ', 'PAQUETE', 'PAQUETES') THEN '99999999-9999-4999-8999-999999999999'
    ELSE '11111111-1111-4111-8111-111111111111'
END;

ALTER TABLE "productos" ALTER COLUMN "unidadMedidaId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "productos_unidadMedidaId_idx" ON "productos"("unidadMedidaId");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidades_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop legacy free-text column
ALTER TABLE "productos" DROP COLUMN "unidadMedida";
