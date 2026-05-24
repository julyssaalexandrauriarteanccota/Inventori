-- Persist padrón import runs and stage rows before publishing them.
CREATE TABLE "padron_sunat_ruc_import_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "message" TEXT NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "discarded" INTEGER NOT NULL DEFAULT 0,
    "totalLines" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "importedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "padron_sunat_ruc_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "padron_sunat_ruc_staging" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
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
    "importedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "padron_sunat_ruc_staging_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "padron_sunat_ruc_import_jobs_status_idx" ON "padron_sunat_ruc_import_jobs"("status");
CREATE INDEX "padron_sunat_ruc_import_jobs_stage_idx" ON "padron_sunat_ruc_import_jobs"("stage");
CREATE INDEX "padron_sunat_ruc_import_jobs_createdAt_idx" ON "padron_sunat_ruc_import_jobs"("createdAt");
CREATE UNIQUE INDEX "padron_sunat_ruc_staging_jobId_ruc_key" ON "padron_sunat_ruc_staging"("jobId", "ruc");
CREATE INDEX "padron_sunat_ruc_staging_jobId_idx" ON "padron_sunat_ruc_staging"("jobId");
CREATE INDEX "padron_sunat_ruc_staging_estado_idx" ON "padron_sunat_ruc_staging"("estado");
CREATE INDEX "padron_sunat_ruc_staging_ubigeo_idx" ON "padron_sunat_ruc_staging"("ubigeo");

ALTER TABLE "padron_sunat_ruc_staging"
  ADD CONSTRAINT "padron_sunat_ruc_staging_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "padron_sunat_ruc_import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
