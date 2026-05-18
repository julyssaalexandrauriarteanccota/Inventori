-- Doc 01 §arch + Doc 08 §1 — unificación de NotaCredito/NotaDebito en Comprobante.
-- Mantenemos: NC/ND son Comprobante con tipo = NOTA_CREDITO/NOTA_DEBITO y
-- comprobanteOrigenId apuntando al CPE primario vía la self-rel "ComprobanteNotas".
-- Las tablas legacy notas_credito / notas_debito se eliminan tras backfill.

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Hacer ventaId nullable. NC/ND no representan una venta nueva.
-- Postgres permite múltiples NULLs en UNIQUE, así no se rompe la
-- unicidad de "una sola factura/boleta por venta".
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE "comprobantes" ALTER COLUMN "ventaId" DROP NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Backfill: copiar notas_credito → comprobantes.
--   - tipo = 'NOTA_CREDITO'
--   - ventaId = NULL (NC no es venta)
--   - clienteNombre/DocTipo/DocNum heredados del comprobante origen (NOT NULL)
--   - subtotal/igv aproximados desde monto (NC legacy guardó solo total bruto)
--   - motivoNota = nc.tipo (era el código Cat 09)
--   - motivoNotaDescripcion = nc.motivo (era el texto)
--   - WHERE NOT EXISTS evita re-inserción si la migración corre dos veces
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO "comprobantes" (
  id,
  "ventaId",
  tipo,
  serie,
  correlativo,
  numero,
  ambiente,
  "comprobanteOrigenId",
  "motivoNota",
  "motivoNotaDescripcion",
  "clienteNombre",
  "clienteDocTipo",
  "clienteDocNum",
  "clienteDireccion",
  "emisorRuc",
  "emisorRazonSocial",
  "emisorDireccionFiscal",
  subtotal,
  igv,
  total,
  estado,
  "fechaEmision",
  "createdAt",
  "updatedAt",
  "intentosEnvio",
  "xmlContent",
  "cdrContent"
)
SELECT
  nc.id,
  NULL,
  'NOTA_CREDITO'::"TipoDocumento",
  nc.serie,
  nc.correlativo,
  nc.numero,
  COALESCE(o.ambiente, 'BETA'::"AmbienteSunat"),
  nc."comprobanteOrigenId",
  nc.tipo,
  nc.motivo,
  o."clienteNombre",
  o."clienteDocTipo",
  o."clienteDocNum",
  o."clienteDireccion",
  o."emisorRuc",
  o."emisorRazonSocial",
  o."emisorDireccionFiscal",
  ROUND((nc.monto / 1.18)::numeric, 2),
  ROUND((nc.monto - (nc.monto / 1.18))::numeric, 2),
  nc.monto,
  nc.estado,
  nc."createdAt",
  nc."createdAt",
  nc."updatedAt",
  nc."intentosEnvio",
  nc."xmlContent",
  nc."cdrContent"
FROM "notas_credito" nc
JOIN "comprobantes" o ON o.id = nc."comprobanteOrigenId"
WHERE NOT EXISTS (SELECT 1 FROM "comprobantes" c WHERE c.id = nc.id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Backfill: copiar notas_debito → comprobantes.
--   - tipo = 'NOTA_DEBITO'
--   - NotaDebito legacy no tenía campo `tipo` (Cat 10), solo `motivo`.
--   - motivoNota = '01' por defecto (Intereses por mora) si no hay info.
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO "comprobantes" (
  id,
  "ventaId",
  tipo,
  serie,
  correlativo,
  numero,
  ambiente,
  "comprobanteOrigenId",
  "motivoNota",
  "motivoNotaDescripcion",
  "clienteNombre",
  "clienteDocTipo",
  "clienteDocNum",
  "clienteDireccion",
  "emisorRuc",
  "emisorRazonSocial",
  "emisorDireccionFiscal",
  subtotal,
  igv,
  total,
  estado,
  "fechaEmision",
  "createdAt",
  "updatedAt",
  "intentosEnvio",
  "xmlContent",
  "cdrContent"
)
SELECT
  nd.id,
  NULL,
  'NOTA_DEBITO'::"TipoDocumento",
  nd.serie,
  nd.correlativo,
  nd.numero,
  COALESCE(o.ambiente, 'BETA'::"AmbienteSunat"),
  nd."comprobanteOrigenId",
  '01',
  nd.motivo,
  o."clienteNombre",
  o."clienteDocTipo",
  o."clienteDocNum",
  o."clienteDireccion",
  o."emisorRuc",
  o."emisorRazonSocial",
  o."emisorDireccionFiscal",
  ROUND((nd.monto / 1.18)::numeric, 2),
  ROUND((nd.monto - (nd.monto / 1.18))::numeric, 2),
  nd.monto,
  nd.estado,
  nd."createdAt",
  nd."createdAt",
  nd."updatedAt",
  nd."intentosEnvio",
  nd."xmlContent",
  nd."cdrContent"
FROM "notas_debito" nd
JOIN "comprobantes" o ON o.id = nd."comprobanteOrigenId"
WHERE NOT EXISTS (SELECT 1 FROM "comprobantes" c WHERE c.id = nd.id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Drop tablas legacy. A partir de aquí toda NC/ND vive en `comprobantes`.
-- ────────────────────────────────────────────────────────────────────────────
DROP TABLE "notas_credito";
DROP TABLE "notas_debito";
