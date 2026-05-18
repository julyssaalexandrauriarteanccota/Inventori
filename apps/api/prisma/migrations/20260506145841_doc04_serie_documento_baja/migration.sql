-- CreateTable
CREATE TABLE "series_documento_baja" (
    "id" TEXT NOT NULL,
    "configEmpresaFiscalId" TEXT NOT NULL,
    "ambiente" "AmbienteSunat" NOT NULL DEFAULT 'BETA',
    "fecha" TEXT NOT NULL,
    "correlativoActual" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_documento_baja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "series_documento_baja_configEmpresaFiscalId_idx" ON "series_documento_baja"("configEmpresaFiscalId");

-- CreateIndex
CREATE UNIQUE INDEX "series_documento_baja_configEmpresaFiscalId_ambiente_fecha_key" ON "series_documento_baja"("configEmpresaFiscalId", "ambiente", "fecha");

-- AddForeignKey
ALTER TABLE "series_documento_baja" ADD CONSTRAINT "series_documento_baja_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES "config_empresa_fiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
