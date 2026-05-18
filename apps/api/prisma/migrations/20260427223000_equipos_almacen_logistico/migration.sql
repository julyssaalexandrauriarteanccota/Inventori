ALTER TABLE "equipos" ADD COLUMN "almacenId" TEXT;

ALTER TABLE "equipos" ADD CONSTRAINT "equipos_almacenId_fkey"
  FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "equipos_almacenId_idx" ON "equipos"("almacenId");