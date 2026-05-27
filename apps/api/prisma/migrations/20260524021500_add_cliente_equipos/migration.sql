-- Equipos externos propiedad del cliente para soporte/mantenimiento.
CREATE TABLE "equipos_cliente" (
  "id" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "productoId" TEXT,
  "numeroSerie" TEXT NOT NULL,
  "nombre" TEXT,
  "marca" TEXT,
  "modelo" TEXT,
  "estado" "EstadoEquipo" NOT NULL DEFAULT 'ACTIVO',
  "codigoQr" TEXT,
  "ubicacion" TEXT,
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "equipos_cliente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "equipos_cliente_codigoQr_key" ON "equipos_cliente"("codigoQr");
CREATE UNIQUE INDEX "equipos_cliente_clienteId_numeroSerie_key" ON "equipos_cliente"("clienteId", "numeroSerie");
CREATE INDEX "equipos_cliente_clienteId_idx" ON "equipos_cliente"("clienteId");
CREATE INDEX "equipos_cliente_productoId_idx" ON "equipos_cliente"("productoId");
CREATE INDEX "equipos_cliente_estado_idx" ON "equipos_cliente"("estado");

ALTER TABLE "equipos_cliente"
  ADD CONSTRAINT "equipos_cliente_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "equipos_cliente"
  ADD CONSTRAINT "equipos_cliente_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD COLUMN "clienteEquipoId" TEXT;
CREATE INDEX "tickets_clienteEquipoId_idx" ON "tickets"("clienteEquipoId");

ALTER TABLE "tickets"
  ADD CONSTRAINT "tickets_clienteEquipoId_fkey"
  FOREIGN KEY ("clienteEquipoId") REFERENCES "equipos_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
