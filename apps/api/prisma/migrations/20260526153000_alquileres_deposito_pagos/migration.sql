-- Alquileres: estados operativos, depósito económico y cargos adicionales.
ALTER TYPE "EstadoContratoAlquiler" ADD VALUE IF NOT EXISTS 'RESERVADO';
ALTER TYPE "EstadoContratoAlquiler" ADD VALUE IF NOT EXISTS 'PENDIENTE_ENTREGA';
ALTER TYPE "EstadoContratoAlquiler" ADD VALUE IF NOT EXISTS 'EN_RETORNO';
ALTER TYPE "EstadoContratoAlquiler" ADD VALUE IF NOT EXISTS 'CERRADO';

ALTER TYPE "TipoCargoAlquiler" ADD VALUE IF NOT EXISTS 'DEPOSITO_GARANTIA';
ALTER TYPE "TipoCargoAlquiler" ADD VALUE IF NOT EXISTS 'DANO';
ALTER TYPE "TipoCargoAlquiler" ADD VALUE IF NOT EXISTS 'MORA';
ALTER TYPE "TipoCargoAlquiler" ADD VALUE IF NOT EXISTS 'TRANSPORTE';
ALTER TYPE "TipoCargoAlquiler" ADD VALUE IF NOT EXISTS 'AJUSTE';

ALTER TABLE "contratos_alquiler"
  ADD COLUMN "depositoGarantia" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "depositoCobradoAt" TIMESTAMP(3),
  ADD COLUMN "depositoDevueltoAt" TIMESTAMP(3),
  ADD COLUMN "depositoAplicado" DECIMAL(10,2) NOT NULL DEFAULT 0;
