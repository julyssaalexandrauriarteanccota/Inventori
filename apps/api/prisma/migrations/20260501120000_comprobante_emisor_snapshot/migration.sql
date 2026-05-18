-- AlterTable
ALTER TABLE "comprobantes"
ADD COLUMN "emisorRuc" TEXT,
ADD COLUMN "emisorRazonSocial" TEXT,
ADD COLUMN "emisorNombreComercial" TEXT,
ADD COLUMN "emisorDireccionFiscal" TEXT,
ADD COLUMN "emisorUbigeoFiscal" TEXT,
ADD COLUMN "emisorCodigoEstablecimiento" TEXT;
