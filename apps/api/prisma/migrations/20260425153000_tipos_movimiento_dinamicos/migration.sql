-- Create enum for configurable movement behavior
CREATE TYPE "MovimientoComportamiento" AS ENUM ('ENTRADA', 'SALIDA', 'TRANSFERENCIA');

-- Make stock movement type dynamic
ALTER TABLE "movimientos_stock"
  ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;

-- Expand movement type config catalog
ALTER TABLE "tipos_movimiento_config"
  ALTER COLUMN "codigo" TYPE TEXT USING "codigo"::text,
  ADD COLUMN "comportamiento" "MovimientoComportamiento" NOT NULL DEFAULT 'SALIDA',
  ADD COLUMN "requiereJustificacion" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiereEvidencia" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "disponibleTecnico" BOOLEAN NOT NULL DEFAULT false;

-- Populate base behavior rules
UPDATE "tipos_movimiento_config"
SET
  "comportamiento" = CASE
    WHEN "codigo" IN ('COMPRA_RECIBIDA', 'DEVOLUCION_CLIENTE', 'AJUSTE_POSITIVO') THEN 'ENTRADA'::"MovimientoComportamiento"
    WHEN "codigo" = 'TRANSFERENCIA' THEN 'TRANSFERENCIA'::"MovimientoComportamiento"
    ELSE 'SALIDA'::"MovimientoComportamiento"
  END,
  "requiereJustificacion" = CASE
    WHEN "codigo" IN ('AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'BAJA_DANO') THEN true
    ELSE false
  END,
  "requiereEvidencia" = CASE
    WHEN "codigo" = 'BAJA_DANO' THEN true
    ELSE false
  END,
  "disponibleTecnico" = CASE
    WHEN "codigo" = 'CONSUMO_SOPORTE' THEN true
    ELSE false
  END;
