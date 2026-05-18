-- AlterTable
ALTER TABLE "garantias" ADD COLUMN     "contadorInicio" INTEGER,
ADD COLUMN     "contadorMaxCopias" INTEGER;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "garantiaMaxCopias" INTEGER,
ADD COLUMN     "mesesGarantia" INTEGER NOT NULL DEFAULT 12;
