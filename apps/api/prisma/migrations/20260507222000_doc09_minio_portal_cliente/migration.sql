-- Doc 09 — almacenamiento MinIO y portal cliente

ALTER TABLE "comprobantes"
  ADD COLUMN "tokenConsulta" TEXT,
  ADD COLUMN "tokenConsultaCreatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "comprobantes_tokenConsulta_key"
  ON "comprobantes"("tokenConsulta");

CREATE TABLE "portal_access_logs" (
  "id" TEXT NOT NULL,
  "comprobanteId" TEXT NOT NULL,
  "metodoAcceso" TEXT NOT NULL,
  "ipOrigen" TEXT NOT NULL,
  "userAgent" TEXT,
  "accion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "portal_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "portal_access_logs_comprobanteId_createdAt_idx"
  ON "portal_access_logs"("comprobanteId", "createdAt");

CREATE INDEX "portal_access_logs_ipOrigen_createdAt_idx"
  ON "portal_access_logs"("ipOrigen", "createdAt");

ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_comprobanteId_fkey"
  FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "comprobante_email_logs" (
  "id" TEXT NOT NULL,
  "comprobanteId" TEXT NOT NULL,
  "destinatario" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "errorMessage" TEXT,
  "messageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "comprobante_email_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comprobante_email_logs_comprobanteId_createdAt_idx"
  ON "comprobante_email_logs"("comprobanteId", "createdAt");

CREATE INDEX "comprobante_email_logs_destinatario_idx"
  ON "comprobante_email_logs"("destinatario");

CREATE INDEX "comprobante_email_logs_estado_idx"
  ON "comprobante_email_logs"("estado");

ALTER TABLE "comprobante_email_logs"
  ADD CONSTRAINT "comprobante_email_logs_comprobanteId_fkey"
  FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
