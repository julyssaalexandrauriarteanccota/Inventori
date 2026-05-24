-- Normaliza unidades legacy a códigos SUNAT/UBL aceptados por cbc:*Quantity@unitCode.
-- UND/UNIDAD no es válido en UBL; para bienes se usa NIU y para servicios ZZ.

CREATE OR REPLACE FUNCTION pg_temp.normalize_unidad_sunat(
  old_code TEXT,
  new_code TEXT,
  new_name TEXT,
  new_description TEXT,
  new_uuid TEXT
) RETURNS VOID AS $$
DECLARE
  old_id TEXT;
  new_id TEXT;
BEGIN
  SELECT id INTO old_id
  FROM "unidades_medida"
  WHERE UPPER(codigo) = UPPER(old_code) AND "deletedAt" IS NULL
  LIMIT 1;

  SELECT id INTO new_id
  FROM "unidades_medida"
  WHERE UPPER(codigo) = UPPER(new_code) AND "deletedAt" IS NULL
  LIMIT 1;

  IF old_id IS NOT NULL AND new_id IS NULL THEN
    UPDATE "unidades_medida"
    SET codigo = new_code,
        nombre = new_name,
        descripcion = new_description,
        activo = true,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = old_id;
  ELSIF old_id IS NOT NULL AND new_id IS NOT NULL AND old_id <> new_id THEN
    UPDATE "productos" SET "unidadMedidaId" = new_id WHERE "unidadMedidaId" = old_id;
    UPDATE "unidades_medida"
    SET activo = false,
        "deletedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = old_id;
  ELSIF new_id IS NULL THEN
    INSERT INTO "unidades_medida" ("id", "codigo", "nombre", "descripcion", "activo", "createdAt", "updatedAt", "deletedAt")
    VALUES (new_uuid, new_code, new_name, new_description, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
    ON CONFLICT ("codigo") DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.normalize_unidad_sunat('UND', 'NIU', 'Unidad física', 'Unidad física SUNAT/UBL', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
SELECT pg_temp.normalize_unidad_sunat('SERV', 'ZZ', 'Unidad de servicio', 'Unidad de servicio SUNAT/UBL', 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
SELECT pg_temp.normalize_unidad_sunat('KG', 'KGM', 'Kilogramo', 'Kilogramo SUNAT/UBL', 'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
SELECT pg_temp.normalize_unidad_sunat('GR', 'GRM', 'Gramo', 'Gramo SUNAT/UBL', 'aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4');
SELECT pg_temp.normalize_unidad_sunat('LT', 'LTR', 'Litro', 'Litro SUNAT/UBL', 'aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5');
SELECT pg_temp.normalize_unidad_sunat('ML', 'MLT', 'Mililitro', 'Mililitro SUNAT/UBL', 'aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6');
SELECT pg_temp.normalize_unidad_sunat('M', 'MTR', 'Metro', 'Metro SUNAT/UBL', 'aaaaaaa7-aaaa-4aaa-8aaa-aaaaaaaaaaa7');
SELECT pg_temp.normalize_unidad_sunat('CM', 'CMT', 'Centímetro', 'Centímetro SUNAT/UBL', 'aaaaaaa8-aaaa-4aaa-8aaa-aaaaaaaaaaa8');
SELECT pg_temp.normalize_unidad_sunat('CAJA', 'BX', 'Caja', 'Caja SUNAT/UBL', 'aaaaaaa9-aaaa-4aaa-8aaa-aaaaaaaaaaa9');
SELECT pg_temp.normalize_unidad_sunat('CAJ', 'BX', 'Caja', 'Caja SUNAT/UBL', 'aaaaaaa9-aaaa-4aaa-8aaa-aaaaaaaaaaa9');
SELECT pg_temp.normalize_unidad_sunat('PAQ', 'PK', 'Paquete', 'Paquete SUNAT/UBL', 'aaaaaa10-aaaa-4aaa-8aaa-aaaaaaaaaa10');
SELECT pg_temp.normalize_unidad_sunat('PQT', 'PK', 'Paquete', 'Paquete SUNAT/UBL', 'aaaaaa10-aaaa-4aaa-8aaa-aaaaaaaaaa10');
