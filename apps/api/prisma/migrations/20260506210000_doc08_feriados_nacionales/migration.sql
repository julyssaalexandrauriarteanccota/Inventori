-- Doc 08 §3 — Tabla de feriados nacionales para cálculo de 10 días hábiles
-- en NC excepcionales. Seed con feriados peruanos oficiales 2025-2026.

CREATE TABLE "feriados_nacionales" (
  "id" TEXT NOT NULL,
  "fecha" DATE NOT NULL,
  "nombre" TEXT NOT NULL,
  "anio" INTEGER NOT NULL,
  "esNoLaborable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feriados_nacionales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feriados_nacionales_fecha_key" ON "feriados_nacionales"("fecha");
CREATE INDEX "feriados_nacionales_anio_idx" ON "feriados_nacionales"("anio");

-- Feriados oficiales Perú 2025 (DL 713 + Ley 27574 + DS específicos)
INSERT INTO "feriados_nacionales" ("id", "fecha", "nombre", "anio", "esNoLaborable", "updatedAt") VALUES
  (gen_random_uuid(), '2025-01-01', 'Año Nuevo', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-04-17', 'Jueves Santo', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-04-18', 'Viernes Santo', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-05-01', 'Día del Trabajo', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-06-07', 'Batalla de Arica y día de la Bandera', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-06-29', 'San Pedro y San Pablo', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-07-23', 'Día de la Fuerza Aérea del Perú', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-07-28', 'Día de la Independencia', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-07-29', 'Fiestas Patrias', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-08-06', 'Batalla de Junín', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-08-30', 'Santa Rosa de Lima', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-10-08', 'Combate de Angamos', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-11-01', 'Día de Todos los Santos', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-12-08', 'Inmaculada Concepción', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-12-09', 'Batalla de Ayacucho', 2025, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2025-12-25', 'Navidad', 2025, false, CURRENT_TIMESTAMP);

-- Feriados oficiales Perú 2026
INSERT INTO "feriados_nacionales" ("id", "fecha", "nombre", "anio", "esNoLaborable", "updatedAt") VALUES
  (gen_random_uuid(), '2026-01-01', 'Año Nuevo', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-04-02', 'Jueves Santo', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-04-03', 'Viernes Santo', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-05-01', 'Día del Trabajo', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-06-07', 'Batalla de Arica y día de la Bandera', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-06-29', 'San Pedro y San Pablo', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-07-23', 'Día de la Fuerza Aérea del Perú', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-07-28', 'Día de la Independencia', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-07-29', 'Fiestas Patrias', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-08-06', 'Batalla de Junín', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-08-30', 'Santa Rosa de Lima', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-10-08', 'Combate de Angamos', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-11-01', 'Día de Todos los Santos', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-12-08', 'Inmaculada Concepción', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-12-09', 'Batalla de Ayacucho', 2026, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2026-12-25', 'Navidad', 2026, false, CURRENT_TIMESTAMP);
