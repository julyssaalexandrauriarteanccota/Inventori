-- CreateEnum
CREATE TYPE "AmbienteSunat" AS ENUM ('BETA', 'PRODUCCION');

-- CreateEnum
CREATE TYPE "CertificadoStorageProvider" AS ENUM ('LOCAL_PRIVATE', 'MINIO_PRIVATE', 'SECRET_MANAGER');

-- AlterTable
ALTER TABLE "config_empresa_fiscal" ADD COLUMN "ambienteDefault" "AmbienteSunat" NOT NULL DEFAULT 'BETA';

-- AlterTable
ALTER TABLE "series_documento" ADD COLUMN "configEmpresaFiscalId" TEXT,
ADD COLUMN "sedeFiscalId" TEXT,
ADD COLUMN "ambiente" "AmbienteSunat" NOT NULL DEFAULT 'BETA';

-- DropIndex
DROP INDEX IF EXISTS "series_documento_tipo_serie_codigoEstablecimiento_key";

-- CreateTable
CREATE TABLE "empresa_sedes_fiscales" (
    "id" TEXT NOT NULL,
    "configEmpresaFiscalId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoEstablecimientoSunat" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ubigeo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "empresa_sedes_fiscales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados_digitales" (
    "id" TEXT NOT NULL,
    "configEmpresaFiscalId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "storageProvider" "CertificadoStorageProvider" NOT NULL DEFAULT 'LOCAL_PRIVATE',
    "storageKey" TEXT NOT NULL,
    "passwordSecretRef" TEXT,
    "fingerprintSha256" TEXT,
    "serialNumber" TEXT,
    "subject" TEXT,
    "issuer" TEXT,
    "validoDesde" TIMESTAMP(3),
    "validoHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "certificados_digitales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_secrets" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fiscal_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "config_empresa_fiscal_ambienteDefault_idx" ON "config_empresa_fiscal"("ambienteDefault");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_sedes_fiscales_configEmpresaFiscalId_codigoEstablecimientoSunat_key" ON "empresa_sedes_fiscales"("configEmpresaFiscalId", "codigoEstablecimientoSunat");

-- CreateIndex
CREATE INDEX "empresa_sedes_fiscales_configEmpresaFiscalId_idx" ON "empresa_sedes_fiscales"("configEmpresaFiscalId");

-- CreateIndex
CREATE INDEX "empresa_sedes_fiscales_activo_idx" ON "empresa_sedes_fiscales"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "series_documento_tipo_serie_codigoEstablecimiento_ambiente_key" ON "series_documento"("tipo", "serie", "codigoEstablecimiento", "ambiente");

-- CreateIndex
CREATE INDEX "series_documento_configEmpresaFiscalId_idx" ON "series_documento"("configEmpresaFiscalId");

-- CreateIndex
CREATE INDEX "series_documento_sedeFiscalId_idx" ON "series_documento"("sedeFiscalId");

-- CreateIndex
CREATE INDEX "series_documento_ambiente_idx" ON "series_documento"("ambiente");

-- CreateIndex
CREATE INDEX "certificados_digitales_configEmpresaFiscalId_idx" ON "certificados_digitales"("configEmpresaFiscalId");

-- CreateIndex
CREATE INDEX "certificados_digitales_activo_idx" ON "certificados_digitales"("activo");

-- CreateIndex
CREATE INDEX "certificados_digitales_revokedAt_idx" ON "certificados_digitales"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_secrets_scope_name_key" ON "fiscal_secrets"("scope", "name");

-- CreateIndex
CREATE INDEX "fiscal_secrets_scope_idx" ON "fiscal_secrets"("scope");

-- AddForeignKey
ALTER TABLE "empresa_sedes_fiscales" ADD CONSTRAINT "empresa_sedes_fiscales_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES "config_empresa_fiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_documento" ADD CONSTRAINT "series_documento_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES "config_empresa_fiscal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_documento" ADD CONSTRAINT "series_documento_sedeFiscalId_fkey" FOREIGN KEY ("sedeFiscalId") REFERENCES "empresa_sedes_fiscales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_digitales" ADD CONSTRAINT "certificados_digitales_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES "config_empresa_fiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
