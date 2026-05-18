-- Doc 10 §6 — overrides de reglas configurables de validación pre-emisión.
-- Si el valor es NULL, se aplican los defaults de @erp/shared.
ALTER TABLE "config_empresa_fiscal"
  ADD COLUMN IF NOT EXISTS "reglasValidacion" JSONB;
