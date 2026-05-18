# Runbook: almacenamiento fiscal MinIO

Este runbook acompaña `comprobantes sunat/09-ALMACENAMIENTO-MINIO.md` y documenta la operación del storage fiscal del ERP.

## Variables de entorno

```env
FISCAL_STORAGE_PROVIDER=MINIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=erp_minio_user
MINIO_SECRET_KEY=erp_minio_password
MINIO_BUCKET_CPE_BETA=cpe-beta
MINIO_BUCKET_CPE_PRODUCCION=cpe-produccion
MINIO_BUCKET_BAJAS_BETA=bajas-beta
MINIO_BUCKET_BAJAS_PRODUCCION=bajas-produccion
MINIO_BUCKET_TEMP_UPLOADS=temp-uploads
PORTAL_CLIENTE_BASE_URL=http://localhost:3000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

En desarrollo se puede usar `FISCAL_STORAGE_PROVIDER=LOCAL`; las claves conservan el mismo formato y se guardan bajo `FISCAL_PRIVATE_STORAGE_DIR`.

## Buckets

`docker-compose.yml` levanta `minio-init`, que crea:

- `cpe-beta`
- `cpe-produccion`
- `bajas-beta`
- `bajas-produccion`
- `temp-uploads`

Los buckets de producción se crean con object lock y retención compliance de 6 años. Los buckets de CPE y bajas tienen versionado activo. `temp-uploads` expira a 1 día.

## Convención de claves

Los `storageKey` se guardan con el bucket como primer segmento:

```text
cpe-produccion/20123456789/PRODUCCION/2026/05/factura/20123456789-01-F001-00000123.xml
cpe-produccion/20123456789/PRODUCCION/2026/05/factura/20123456789-01-F001-00000123.cdr.zip
cpe-produccion/20123456789/PRODUCCION/2026/05/factura/20123456789-01-F001-00000123.pdf
bajas-produccion/20123456789/PRODUCCION/2026/05/RA-20260506-001.xml
```

## Backfill legacy

Para migrar `xmlContent` y `cdrContent` legacy a storage:

```powershell
pnpm --filter @erp/api storage:backfill
```

El script sube archivos faltantes y actualiza `xmlStorageKey`/`cdrStorageKey`. No elimina columnas ni contenido legacy. Antes de dropear columnas, validar manualmente:

```sql
SELECT COUNT(*) FROM "comprobantes"
WHERE "xmlContent" IS NOT NULL AND "xmlStorageKey" IS NULL;
```

El resultado debe ser `0` y debe existir backup completo de BD y MinIO.

## Backup y recuperación

Backup diario recomendado:

```bash
mc mirror --overwrite --remove local/cpe-produccion /backups/minio/cpe-produccion
mc mirror --overwrite --remove local/bajas-produccion /backups/minio/bajas-produccion
```

Retención sugerida:

- diarios: 7 días
- semanales: 8 semanas
- mensuales: 24 meses

Si se pierde un PDF, se puede regenerar desde el comprobante y CDR. Si se pierde un XML firmado, se puede regenerar desde snapshot fiscal pero el hash de firma cambiará y debe quedar registrado como recuperación operativa. El CDR no se regenera; se restaura desde backup o se consulta la validez en SUNAT.
