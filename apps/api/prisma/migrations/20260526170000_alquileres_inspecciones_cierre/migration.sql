-- Alquileres: inspecciones de entrega/retorno para cierre operativo.
CREATE TYPE "TipoInspeccionAlquiler" AS ENUM ('ENTREGA', 'RETORNO');
CREATE TYPE "CondicionInspeccionAlquiler" AS ENUM ('BUENO', 'REGULAR', 'DANADO');

CREATE TABLE "inspecciones_alquiler" (
  "id" TEXT NOT NULL,
  "contratoId" TEXT NOT NULL,
  "equipoId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "tipo" "TipoInspeccionAlquiler" NOT NULL,
  "condicion" "CondicionInspeccionAlquiler" NOT NULL,
  "contador" INTEGER,
  "evidenciaFilename" TEXT,
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inspecciones_alquiler_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inspecciones_alquiler"
  ADD CONSTRAINT "inspecciones_alquiler_contratoId_fkey"
  FOREIGN KEY ("contratoId") REFERENCES "contratos_alquiler"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inspecciones_alquiler"
  ADD CONSTRAINT "inspecciones_alquiler_equipoId_fkey"
  FOREIGN KEY ("equipoId") REFERENCES "equipos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspecciones_alquiler"
  ADD CONSTRAINT "inspecciones_alquiler_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "inspecciones_alquiler_contratoId_idx" ON "inspecciones_alquiler"("contratoId");
CREATE INDEX "inspecciones_alquiler_equipoId_idx" ON "inspecciones_alquiler"("equipoId");
CREATE INDEX "inspecciones_alquiler_usuarioId_idx" ON "inspecciones_alquiler"("usuarioId");
CREATE INDEX "inspecciones_alquiler_tipo_idx" ON "inspecciones_alquiler"("tipo");
