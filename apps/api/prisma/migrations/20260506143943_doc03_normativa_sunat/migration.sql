-- CreateEnum
CREATE TYPE "ModalidadEnvioBoletas" AS ENUM ('INDIVIDUAL', 'RESUMEN');

-- DropForeignKey
ALTER TABLE "comprobantes" DROP CONSTRAINT "comprobantes_comprobanteOrigenId_fkey";

-- DropForeignKey
ALTER TABLE "comunicaciones_baja" DROP CONSTRAINT "comunicaciones_baja_comprobanteId_fkey";

-- AlterTable
ALTER TABLE "config_empresa_fiscal" ADD COLUMN     "modalidadEnvioBoletas" "ModalidadEnvioBoletas" NOT NULL DEFAULT 'INDIVIDUAL';

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_comprobanteOrigenId_fkey" FOREIGN KEY ("comprobanteOrigenId") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicaciones_baja" ADD CONSTRAINT "comunicaciones_baja_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
