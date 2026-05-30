-- CreateTable
CREATE TABLE "comprobante_whatsapp_logs" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "errorMessage" TEXT,
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobante_whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comprobante_whatsapp_logs_comprobanteId_createdAt_idx" ON "comprobante_whatsapp_logs"("comprobanteId", "createdAt");

-- CreateIndex
CREATE INDEX "comprobante_whatsapp_logs_destinatario_idx" ON "comprobante_whatsapp_logs"("destinatario");

-- AddForeignKey
ALTER TABLE "comprobante_whatsapp_logs" ADD CONSTRAINT "comprobante_whatsapp_logs_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
