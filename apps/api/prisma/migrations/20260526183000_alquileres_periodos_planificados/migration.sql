ALTER TABLE "periodos_alquiler" ALTER COLUMN "lecturaInicial" DROP NOT NULL;

INSERT INTO "periodos_alquiler" (
  "id",
  "contratoId",
  "numeroPeriodo",
  "fechaInicio",
  "fechaFin",
  "lecturaInicial",
  "copiasIncluidas",
  "montoBase",
  "estado",
  "createdAt",
  "updatedAt"
)
SELECT
  c."id" || '-periodo-' || n."numeroPeriodo",
  c."id",
  n."numeroPeriodo",
  c."fechaInicio" + ((n."numeroPeriodo" - 1) * INTERVAL '1 month'),
  c."fechaInicio" + (n."numeroPeriodo" * INTERVAL '1 month'),
  CASE WHEN n."numeroPeriodo" = 1 THEN c."contadorInicio" ELSE NULL END,
  c."copiasIncluidasMes",
  c."precioMensual",
  CASE
    WHEN n."numeroPeriodo" = 1
      AND NOT EXISTS (
        SELECT 1
        FROM "periodos_alquiler" pa
        WHERE pa."contratoId" = c."id"
          AND pa."estado" IN ('ACTIVO', 'PENDIENTE_CIERRE')
      )
      THEN 'ACTIVO'::"EstadoPeriodoAlquiler"
    ELSE 'PENDIENTE_BASE'::"EstadoPeriodoAlquiler"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "contratos_alquiler" c
CROSS JOIN LATERAL generate_series(1, c."mesesPlazo") AS n("numeroPeriodo")
WHERE c."deletedAt" IS NULL
  AND c."estado" IN ('ACTIVO', 'EN_RETORNO')
  AND NOT EXISTS (
    SELECT 1
    FROM "periodos_alquiler" p
    WHERE p."contratoId" = c."id"
      AND p."numeroPeriodo" = n."numeroPeriodo"
  );
