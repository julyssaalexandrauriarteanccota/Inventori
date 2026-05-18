-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "atributos" JSONB;

-- RenameIndex
ALTER INDEX "cliente_validaciones_sunat_tipoDocumentoSunat_numeroDocumento_k" RENAME TO "cliente_validaciones_sunat_tipoDocumentoSunat_numeroDocumen_key";

-- RenameIndex
ALTER INDEX "empresa_sedes_fiscales_configEmpresaFiscalId_codigoEstablecimie" RENAME TO "empresa_sedes_fiscales_configEmpresaFiscalId_codigoEstablec_key";
