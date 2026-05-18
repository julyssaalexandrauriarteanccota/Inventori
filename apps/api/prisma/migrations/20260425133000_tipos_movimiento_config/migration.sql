-- CreateTable
CREATE TABLE "tipos_movimiento_config" (
    "id" TEXT NOT NULL,
    "codigo" "TipoMovimiento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_movimiento_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_movimiento_config_codigo_key" ON "tipos_movimiento_config"("codigo");

-- Seed base movement types
INSERT INTO "tipos_movimiento_config" ("id", "codigo", "nombre", "activo", "orden", "createdAt", "updatedAt")
VALUES
    ('a1111111-1111-4111-8111-111111111111', 'COMPRA_RECIBIDA', 'Compra recibida', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a2222222-2222-4222-8222-222222222222', 'VENTA', 'Venta', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a3333333-3333-4333-8333-333333333333', 'CONSUMO_SOPORTE', 'Consumo soporte', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a4444444-4444-4444-8444-444444444444', 'DEVOLUCION_CLIENTE', 'Devolución cliente', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a5555555-5555-4555-8555-555555555555', 'DEVOLUCION_PROVEEDOR', 'Devolución proveedor', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a6666666-6666-4666-8666-666666666666', 'AJUSTE_POSITIVO', 'Ajuste positivo', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a7777777-7777-4777-8777-777777777777', 'AJUSTE_NEGATIVO', 'Ajuste negativo', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a8888888-8888-4888-8888-888888888888', 'TRANSFERENCIA', 'Transferencia', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a9999999-9999-4999-8999-999999999999', 'BAJA_DANO', 'Baja por daño', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
