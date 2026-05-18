-- CreateEnum
CREATE TYPE "TipoFiscalProducto" AS ENUM ('BIEN', 'SERVICIO');

-- CreateEnum
CREATE TYPE "TipoAfectacionIgv" AS ENUM ('GRAVADO_OPERACION_ONEROSA', 'EXONERADO_OPERACION_ONEROSA', 'INAFECTO_OPERACION_ONEROSA', 'EXPORTACION');

-- CreateTable
CREATE TABLE "comprobante_detalles" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "productoId" TEXT,
    "item" INTEGER NOT NULL,
    "codigoInterno" TEXT,
    "descripcion" TEXT NOT NULL,
    "unidadSunat" TEXT NOT NULL,
    "tipoFiscalProducto" "TipoFiscalProducto" NOT NULL,
    "tipoAfectacionIgv" "TipoAfectacionIgv" NOT NULL,
    "cantidad" DECIMAL(12,4) NOT NULL,
    "valorUnitario" DECIMAL(12,4) NOT NULL,
    "precioUnitario" DECIMAL(12,4) NOT NULL,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "baseImponible" DECIMAL(10,2) NOT NULL,
    "igv" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "metadataFiscal" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobante_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante_envio_logs" (
    "id" TEXT NOT NULL,
    "comprobanteId" TEXT NOT NULL,
    "proveedor" TEXT,
    "tipoEvento" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "intento" INTEGER NOT NULL DEFAULT 1,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "codigoRespuesta" TEXT,
    "mensaje" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobante_envio_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_empresa_fiscal" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "direccionFiscal" TEXT NOT NULL,
    "ubigeoFiscal" TEXT,
    "codigoEstablecimiento" TEXT,
    "correoSee" TEXT,
    "regimenTributario" TEXT,
    "formatoImpresionDefault" TEXT,
    "pieImpresion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_empresa_fiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_documento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativoActual" INTEGER NOT NULL DEFAULT 0,
    "codigoEstablecimiento" TEXT NOT NULL DEFAULT '0000',
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "series_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_validaciones_sunat" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "tipoDocumentoSunat" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombreNormalizado" TEXT,
    "direccionFiscal" TEXT,
    "estado" TEXT NOT NULL,
    "condicionDomicilio" TEXT,
    "ultimaValidacionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_validaciones_sunat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_detalles_comprobanteId_item_key" ON "comprobante_detalles"("comprobanteId", "item");

-- CreateIndex
CREATE INDEX "comprobante_detalles_comprobanteId_idx" ON "comprobante_detalles"("comprobanteId");

-- CreateIndex
CREATE INDEX "comprobante_detalles_productoId_idx" ON "comprobante_detalles"("productoId");

-- CreateIndex
CREATE INDEX "comprobante_detalles_tipoFiscalProducto_idx" ON "comprobante_detalles"("tipoFiscalProducto");

-- CreateIndex
CREATE INDEX "comprobante_detalles_tipoAfectacionIgv_idx" ON "comprobante_detalles"("tipoAfectacionIgv");

-- CreateIndex
CREATE INDEX "comprobante_envio_logs_comprobanteId_idx" ON "comprobante_envio_logs"("comprobanteId");

-- CreateIndex
CREATE INDEX "comprobante_envio_logs_estado_idx" ON "comprobante_envio_logs"("estado");

-- CreateIndex
CREATE INDEX "comprobante_envio_logs_tipoEvento_idx" ON "comprobante_envio_logs"("tipoEvento");

-- CreateIndex
CREATE UNIQUE INDEX "config_empresa_fiscal_ruc_key" ON "config_empresa_fiscal"("ruc");

-- CreateIndex
CREATE INDEX "config_empresa_fiscal_codigoEstablecimiento_idx" ON "config_empresa_fiscal"("codigoEstablecimiento");

-- CreateIndex
CREATE UNIQUE INDEX "series_documento_tipo_serie_codigoEstablecimiento_key" ON "series_documento"("tipo", "serie", "codigoEstablecimiento");

-- CreateIndex
CREATE INDEX "series_documento_tipo_idx" ON "series_documento"("tipo");

-- CreateIndex
CREATE INDEX "series_documento_activo_idx" ON "series_documento"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_validaciones_sunat_tipoDocumentoSunat_numeroDocumento_key" ON "cliente_validaciones_sunat"("tipoDocumentoSunat", "numeroDocumento");

-- CreateIndex
CREATE INDEX "cliente_validaciones_sunat_clienteId_idx" ON "cliente_validaciones_sunat"("clienteId");

-- CreateIndex
CREATE INDEX "cliente_validaciones_sunat_estado_idx" ON "cliente_validaciones_sunat"("estado");

-- AddForeignKey
ALTER TABLE "comprobante_detalles" ADD CONSTRAINT "comprobante_detalles_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_detalles" ADD CONSTRAINT "comprobante_detalles_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_envio_logs" ADD CONSTRAINT "comprobante_envio_logs_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_validaciones_sunat" ADD CONSTRAINT "cliente_validaciones_sunat_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
