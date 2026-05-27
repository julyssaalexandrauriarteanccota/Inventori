CREATE TYPE "EstadoContratoAlquiler" AS ENUM ('BORRADOR', 'ACTIVO', 'FINALIZADO', 'CANCELADO');
CREATE TYPE "EstadoPeriodoAlquiler" AS ENUM ('PENDIENTE_BASE', 'ACTIVO', 'PENDIENTE_CIERRE', 'CERRADO', 'CANCELADO');
CREATE TYPE "TipoCargoAlquiler" AS ENUM ('BASE', 'EXCEDENTE_COPIAS', 'SOPORTE');

CREATE TABLE "contratos_alquiler" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFinPrevista" TIMESTAMP(3) NOT NULL,
    "mesesPlazo" INTEGER NOT NULL DEFAULT 6,
    "copiasIncluidasMes" INTEGER NOT NULL,
    "precioMensual" DECIMAL(10,2) NOT NULL,
    "precioCopiaExcedente" DECIMAL(10,4) NOT NULL,
    "contadorInicio" INTEGER NOT NULL,
    "contadorActual" INTEGER,
    "estado" "EstadoContratoAlquiler" NOT NULL DEFAULT 'BORRADOR',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contratos_alquiler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "periodos_alquiler" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numeroPeriodo" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "lecturaInicial" INTEGER NOT NULL,
    "lecturaFinal" INTEGER,
    "copiasUsadas" INTEGER,
    "copiasIncluidas" INTEGER NOT NULL,
    "copiasExcedentes" INTEGER,
    "montoBase" DECIMAL(10,2) NOT NULL,
    "montoExcedente" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoSoporte" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCierre" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "baseCobradoAt" TIMESTAMP(3),
    "cierreCalculadoAt" TIMESTAMP(3),
    "cierreCobradoAt" TIMESTAMP(3),
    "estado" "EstadoPeriodoAlquiler" NOT NULL DEFAULT 'PENDIENTE_BASE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_alquiler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lecturas_alquiler" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "periodoId" TEXT,
    "equipoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "contador" INTEGER NOT NULL,
    "fechaLectura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecturas_alquiler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cargos_periodo_alquiler" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "tipo" "TipoCargoAlquiler" NOT NULL,
    "ticketId" TEXT,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargos_periodo_alquiler_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "garantias" ADD COLUMN "contratoAlquilerId" TEXT;

CREATE UNIQUE INDEX "contratos_alquiler_numero_key" ON "contratos_alquiler"("numero");
CREATE INDEX "contratos_alquiler_clienteId_idx" ON "contratos_alquiler"("clienteId");
CREATE INDEX "contratos_alquiler_equipoId_idx" ON "contratos_alquiler"("equipoId");
CREATE INDEX "contratos_alquiler_creadoPorId_idx" ON "contratos_alquiler"("creadoPorId");
CREATE INDEX "contratos_alquiler_estado_idx" ON "contratos_alquiler"("estado");

CREATE UNIQUE INDEX "periodos_alquiler_contratoId_numeroPeriodo_key" ON "periodos_alquiler"("contratoId", "numeroPeriodo");
CREATE INDEX "periodos_alquiler_contratoId_idx" ON "periodos_alquiler"("contratoId");
CREATE INDEX "periodos_alquiler_estado_idx" ON "periodos_alquiler"("estado");
CREATE INDEX "periodos_alquiler_fechaInicio_fechaFin_idx" ON "periodos_alquiler"("fechaInicio", "fechaFin");

CREATE INDEX "lecturas_alquiler_contratoId_idx" ON "lecturas_alquiler"("contratoId");
CREATE INDEX "lecturas_alquiler_periodoId_idx" ON "lecturas_alquiler"("periodoId");
CREATE INDEX "lecturas_alquiler_equipoId_idx" ON "lecturas_alquiler"("equipoId");
CREATE INDEX "lecturas_alquiler_usuarioId_idx" ON "lecturas_alquiler"("usuarioId");

CREATE UNIQUE INDEX "cargos_periodo_alquiler_periodoId_tipo_ticketId_key" ON "cargos_periodo_alquiler"("periodoId", "tipo", "ticketId");
CREATE INDEX "cargos_periodo_alquiler_periodoId_idx" ON "cargos_periodo_alquiler"("periodoId");
CREATE INDEX "cargos_periodo_alquiler_ticketId_idx" ON "cargos_periodo_alquiler"("ticketId");
CREATE INDEX "cargos_periodo_alquiler_tipo_idx" ON "cargos_periodo_alquiler"("tipo");

CREATE UNIQUE INDEX "garantias_contratoAlquilerId_key" ON "garantias"("contratoAlquilerId");
CREATE INDEX "garantias_contratoAlquilerId_idx" ON "garantias"("contratoAlquilerId");

ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contratos_alquiler" ADD CONSTRAINT "contratos_alquiler_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "periodos_alquiler" ADD CONSTRAINT "periodos_alquiler_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lecturas_alquiler" ADD CONSTRAINT "lecturas_alquiler_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lecturas_alquiler" ADD CONSTRAINT "lecturas_alquiler_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_alquiler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lecturas_alquiler" ADD CONSTRAINT "lecturas_alquiler_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lecturas_alquiler" ADD CONSTRAINT "lecturas_alquiler_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cargos_periodo_alquiler" ADD CONSTRAINT "cargos_periodo_alquiler_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_alquiler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cargos_periodo_alquiler" ADD CONSTRAINT "cargos_periodo_alquiler_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "garantias" ADD CONSTRAINT "garantias_contratoAlquilerId_fkey" FOREIGN KEY ("contratoAlquilerId") REFERENCES "contratos_alquiler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
