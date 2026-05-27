-- Compatibilidad de productos con varios modelos reutilizables del catálogo.
CREATE TABLE "producto_modelo_compatibilidades" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "modeloCatalogoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_modelo_compatibilidades_pkey" PRIMARY KEY ("id")
);

INSERT INTO "producto_modelo_compatibilidades" ("id", "productoId", "modeloCatalogoId", "createdAt")
SELECT gen_random_uuid()::TEXT, "id", "modeloCatalogoId", CURRENT_TIMESTAMP
FROM "productos"
WHERE "modeloCatalogoId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "producto_modelo_compatibilidades_productoId_modeloCatalogoId_key"
    ON "producto_modelo_compatibilidades"("productoId", "modeloCatalogoId");
CREATE INDEX "producto_modelo_compatibilidades_productoId_idx"
    ON "producto_modelo_compatibilidades"("productoId");
CREATE INDEX "producto_modelo_compatibilidades_modeloCatalogoId_idx"
    ON "producto_modelo_compatibilidades"("modeloCatalogoId");

ALTER TABLE "producto_modelo_compatibilidades"
    ADD CONSTRAINT "producto_modelo_compatibilidades_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "producto_modelo_compatibilidades"
    ADD CONSTRAINT "producto_modelo_compatibilidades_modeloCatalogoId_fkey"
    FOREIGN KEY ("modeloCatalogoId") REFERENCES "modelos_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
