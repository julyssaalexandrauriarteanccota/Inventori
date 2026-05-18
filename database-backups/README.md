# Backup temporal de base de datos demo

Esta carpeta contiene un respaldo SQL de la base `erp_db` usado como apoyo temporal para restaurar datos de prueba durante desarrollo.

Archivo principal:

- `erp_db_demo_backup.sql`: estructura y datos de demo exportados con `pg_dump --clean --if-exists --no-owner --no-privileges`.

## Restaurar con Docker Compose

Si usas la infraestructura del proyecto, PostgreSQL queda expuesto en el host por el puerto `5433`.

```powershell
docker compose up -d postgres
$env:PGPASSWORD="POSTGRES"
psql -h localhost -p 5433 -U postgres -d erp_db -f database-backups\erp_db_demo_backup.sql
pnpm prisma:generate
```

## Restaurar con PostgreSQL local

Si usas un servicio PostgreSQL instalado en Windows y escuchando en `5432`:

```powershell
$env:PGPASSWORD="POSTGRES"
psql -h localhost -p 5432 -U postgres -d erp_db -f database-backups\erp_db_demo_backup.sql
pnpm prisma:generate
```

El dump ejecuta `DROP ... IF EXISTS`, por lo que reemplaza tablas existentes de la base destino. Úsalo solo con datos de prueba o después de hacer backup.
