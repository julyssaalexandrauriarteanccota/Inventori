-- CreateTable
CREATE TABLE "padron_sunat_ruc" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "condicionDomicilio" TEXT,
    "ubigeo" TEXT,
    "departamento" TEXT,
    "provincia" TEXT,
    "distrito" TEXT,
    "direccionFiscal" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "padron_sunat_ruc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "padron_sunat_ruc_ruc_key" ON "padron_sunat_ruc"("ruc");

-- CreateIndex
CREATE INDEX "padron_sunat_ruc_estado_idx" ON "padron_sunat_ruc"("estado");

-- CreateIndex
CREATE INDEX "padron_sunat_ruc_condicionDomicilio_idx" ON "padron_sunat_ruc"("condicionDomicilio");

-- CreateIndex
CREATE INDEX "padron_sunat_ruc_ubigeo_idx" ON "padron_sunat_ruc"("ubigeo");
