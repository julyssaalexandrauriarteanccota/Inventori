# 09 — Almacenamiento (MinIO) y Portal Cliente

> **Pre-requisito de lectura**: `02-PROBLEMAS-DETECTADOS.md` (P3, P8), `03-NORMATIVA-SUNAT.md` (§14).

Define la infraestructura de almacenamiento documental y el portal público de consulta para receptores. Cubre las dos obligaciones SUNAT relacionadas: conservación 5+ años y disponibilidad para el receptor 1+ año.

---

## 1. Por qué MinIO self-hosted

Decisión ya tomada. Justificación rápida para que quede registrado:

- **S3-compatible**: el día que se quiera migrar a AWS S3, Cloudflare R2, Backblaze B2 o cualquier proveedor S3, el código no cambia. Solo cambia el endpoint y las credenciales.
- **Self-hosted**: no hay dependencia de proveedor cloud todavía. Corre en un VPS o en el mismo servidor del ERP en un contenedor Docker.
- **Versionado nativo**: protege contra sobreescritura accidental.
- **Políticas de retención (object locking)**: cumple con la conservación 5+ años exigida por SUNAT.
- **Bucket policies y signed URLs**: el portal cliente puede servir descargas con URLs firmadas con TTL sin exponer las credenciales.
- **Sin vendor lock-in y sin costo de licencia**.

Migración futura a cloud: cambiar `MINIO_ENDPOINT`, mover los buckets con `mc mirror`, fin.

---

## 2. Setup de MinIO

### Docker compose

```yaml
# docker-compose.yml (fragmento)
services:
  minio:
    image: minio/minio:latest
    container_name: erp-minio
    restart: unless-stopped
    ports:
      - "9000:9000"      # API S3
      - "9001:9001"      # Consola web admin
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER_REDIRECT_URL: https://minio-admin.tudominio.com
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"

volumes:
  minio-data:
    driver: local
```

### Buckets a crear

| Bucket | Propósito | Versionado | Object lock | TTL |
|---|---|---|---|---|
| `cpe-beta` | XML, CDR, PDF de ambiente BETA | Sí | No | 90 días (es solo testing) |
| `cpe-produccion` | XML, CDR, PDF de ambiente PRODUCCION | Sí | Sí (compliance mode, retención 6 años) | infinito |
| `bajas-beta` | XML y CDR de comunicaciones de baja BETA | Sí | No | 90 días |
| `bajas-produccion` | XML y CDR de comunicaciones de baja PRODUCCION | Sí | Sí (6 años) | infinito |
| `temp-uploads` | área de paso para uploads del usuario (ej. certificado en tránsito) | No | No | 24 h (auto-delete) |

### Configuración de retención (compliance mode)

```bash
# CLI mc (cliente MinIO)
mc retention set --default compliance "6y" myminio/cpe-produccion
mc retention set --default compliance "6y" myminio/bajas-produccion
```

`compliance mode` = ni el admin puede borrar antes del plazo. Esto cumple con la prescripción tributaria (5 años + margen).

### Usuarios y políticas

Crear dos usuarios IAM en MinIO:

- **`erp-app`**: el backend del ERP. Permisos: read/write en todos los buckets de producción y beta. NO puede modificar políticas ni borrar buckets.
- **`erp-portal`**: el portal cliente. Permisos: read-only en `cpe-produccion` y `cpe-beta`. NO puede listar buckets enteros.

Las credenciales viven en variables de entorno del backend.

---

## 3. Estructura de keys (paths)

> **Convención**: hierarchical y predecible. Permite navegar en consola admin y aplicar reglas por prefijo.

```
{bucket}/
  {ruc}/
    {ambiente}/
      {anio}/
        {mes}/
          {tipo}/
            {ruc}-{tipo_codigo}-{serie}-{correlativo}.xml
            {ruc}-{tipo_codigo}-{serie}-{correlativo}.cdr.zip
            {ruc}-{tipo_codigo}-{serie}-{correlativo}.pdf
```

### Ejemplos

```
cpe-produccion/20123456789/PRODUCCION/2026/05/factura/20123456789-01-F001-00000123.xml
cpe-produccion/20123456789/PRODUCCION/2026/05/factura/20123456789-01-F001-00000123.cdr.zip
cpe-produccion/20123456789/PRODUCCION/2026/05/factura/20123456789-01-F001-00000123.pdf

cpe-produccion/20123456789/PRODUCCION/2026/05/boleta/20123456789-03-B001-00000456.xml
cpe-produccion/20123456789/PRODUCCION/2026/05/nota_credito/20123456789-07-FC01-00000005.xml

bajas-produccion/20123456789/PRODUCCION/2026/05/RA-20260506-001.xml
bajas-produccion/20123456789/PRODUCCION/2026/05/RA-20260506-001.cdr.zip
```

### Por qué esta estructura

- **Por RUC en primer nivel**: si el sistema es multi-empresa, cada empresa queda aislada en su prefijo.
- **Por ambiente**: separa BETA de PRODUCCION; nunca se mezclan.
- **Por año/mes**: facilita aplicar lifecycle por antigüedad y auditar volumen.
- **Por tipo**: facilita navegación humana en consola admin.
- **Naming `{ruc}-{tipo}-{serie}-{correlativo}`**: es el estándar SUNAT para nombrar el ZIP que se envía. Conviene mantener la misma convención.

---

## 4. Servicio `StorageService`

### Interfaz

```typescript
interface StorageService {
  // Subidas
  putXml(comprobante: Comprobante, xmlContent: Buffer): Promise<string>;     // devuelve storageKey
  putCdrZip(comprobante: Comprobante, cdrZip: Buffer): Promise<string>;
  putPdf(comprobante: Comprobante, pdfContent: Buffer): Promise<string>;
  putBajaXml(baja: ComunicacionBaja, xmlContent: Buffer): Promise<string>;
  putBajaCdr(baja: ComunicacionBaja, cdrZip: Buffer): Promise<string>;

  // Descargas (uso interno backend)
  getXml(storageKey: string): Promise<Buffer>;
  getCdrZip(storageKey: string): Promise<Buffer>;
  getPdf(storageKey: string): Promise<Buffer>;

  // URLs firmadas (para portal cliente y descargas desde admin)
  getSignedUrl(storageKey: string, expiresInSeconds: number): Promise<string>;

  // Verificación
  exists(storageKey: string): Promise<boolean>;
}
```

### Implementación con MinIO

Cliente: [`minio` (npm)](https://www.npmjs.com/package/minio) o `@aws-sdk/client-s3` apuntando a MinIO.

Recomendado: `@aws-sdk/client-s3` porque al migrar a S3 real no cambia nada.

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,        // ej. http://minio:9000
  region: 'us-east-1',                          // arbitrario para MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,                         // requerido por MinIO
});
```

### Generación de la storageKey

```typescript
function buildStorageKey(c: Comprobante, ext: 'xml' | 'cdr.zip' | 'pdf'): string {
  const fechaEmision = c.fechaEmision;
  const ruc = c.snapshot.contenido.emisor.ruc;
  const tipoCodigo = mapTipoToCodigo(c.tipo);     // 01, 03, 07, 08
  const tipoFolder = mapTipoToFolder(c.tipo);     // factura, boleta, nota_credito, nota_debito
  const anio = fechaEmision.getFullYear();
  const mes = String(fechaEmision.getMonth() + 1).padStart(2, '0');
  const filename = `${ruc}-${tipoCodigo}-${c.serie}-${String(c.correlativo).padStart(8, '0')}.${ext}`;

  return `${ruc}/${c.ambiente}/${anio}/${mes}/${tipoFolder}/${filename}`;
}
```

---

## 5. Migración de datos (P3 — XML/CDR de BD a MinIO)

### Paso 1: backfill

Script one-shot que recorre todos los comprobantes existentes y sube su contenido a MinIO:

```typescript
// scripts/backfill-storage.ts
async function backfill() {
  const batchSize = 100;
  let offset = 0;

  while (true) {
    const batch = await prisma.comprobante.findMany({
      where: { xmlStorageKey: null, xmlContent: { not: null } },
      take: batchSize,
      skip: offset,
      orderBy: { fechaCreacion: 'asc' },
    });

    if (batch.length === 0) break;

    for (const c of batch) {
      try {
        const xmlKey = await storage.putXml(c, Buffer.from(c.xmlContent));
        const cdrKey = c.cdrContent ? await storage.putCdrZip(c, Buffer.from(c.cdrContent)) : null;
        const pdfKey = c.pdfContent ? await storage.putPdf(c, Buffer.from(c.pdfContent)) : null;

        await prisma.comprobante.update({
          where: { id: c.id },
          data: { xmlStorageKey: xmlKey, cdrStorageKey: cdrKey, pdfStorageKey: pdfKey },
        });

        console.log(`✓ ${c.id} migrado`);
      } catch (err) {
        console.error(`✗ ${c.id}:`, err);
        // continuar con el siguiente
      }
    }

    offset += batch.length;
  }
}
```

### Paso 2: verificación

Antes de borrar las columnas viejas, verificar que TODOS los comprobantes tengan `xmlStorageKey` y que los archivos en MinIO se puedan leer correctamente.

```sql
SELECT COUNT(*) FROM "Comprobante"
WHERE "xmlContent" IS NOT NULL AND "xmlStorageKey" IS NULL;
-- Debe ser 0 antes de continuar
```

### Paso 3: drop de columnas

Solo después de confirmación manual y backup completo:

```sql
ALTER TABLE "Comprobante" DROP COLUMN "xmlContent";
ALTER TABLE "Comprobante" DROP COLUMN "cdrContent";
ALTER TABLE "Comprobante" DROP COLUMN "pdfContent";
```

### Plan de rollback

- Backup completo de la BD antes del paso 3.
- Backup completo de MinIO con `mc mirror` a un directorio externo.
- Si algo sale mal, restaurar BD; los archivos en MinIO no se tocan en el backfill (solo se suben).

---

## 6. Generación del PDF (representación impresa)

El PDF no es un documento fiscal por sí mismo (el XML firmado lo es), pero SUNAT exige que el receptor pueda obtener una representación impresa.

### Cuándo se genera

Al recibir CDR `ACEPTADO` o `ACEPTADO_CON_OBS`. Antes no, porque podría imprimirse algo que SUNAT rechaza.

### Contenido obligatorio del PDF

- Datos completos del emisor (RUC, razón social, dirección, ubigeo).
- Datos completos del receptor.
- Tipo de comprobante, serie y correlativo en lugar visible.
- Fecha y hora de emisión.
- Detalle de líneas: cantidad, descripción, valor unitario, valor total, IGV.
- Totales: gravado, exonerado, inafecto, IGV, total.
- Total en letras.
- **Código QR** con: `RUC|TipoDoc|Serie|Correlativo|IGV|Total|FechaEmision|TipoDocReceptor|NumDocReceptor|HashFirma`
- **Hash de la firma digital** (los primeros 4 caracteres del `digestValue` o el valor completo según preferencia).
- Leyenda "Representación impresa de la {tipo}" si aplica.

### Stack recomendado para generar PDF

- **Puppeteer/Playwright** (HTML → PDF): flexible, fácil de maquetar con HTML/CSS, costoso en RAM.
- **PDFKit** (programático): más liviano, código más verboso.
- **PDFMake**: balance entre los dos.

Recomendación: **Puppeteer con plantilla HTML por tipo de comprobante**. Servicio `PdfRenderer` con métodos `renderFactura(snapshot, cdr)`, `renderBoleta`, `renderNc`, `renderNd`.

### Almacenamiento

El PDF se sube a MinIO con el mismo path que el XML pero extensión `.pdf`. Se regenera bajo demanda si se pierde (no es documento fiscal).

---

## 7. Portal Cliente (consulta pública)

### Obligación SUNAT

> Disponibilidad mínima de **1 año** desde emisión, mediante página web con autenticación que garantice confidencialidad.

### Diseño

App pública en `/portal-cliente` (puede ser subdominio `comprobantes.tudominio.com`). NO requiere login con usuario/contraseña; usa autenticación ligera por datos del comprobante.

### Esquema de autenticación

Tres modos posibles:

#### Modo A — Por datos del comprobante (público pero anti-bot)

Formulario:
- RUC del emisor
- Tipo de comprobante (factura/boleta/NC/ND)
- Serie y correlativo
- Tipo y número de documento del receptor (DNI/RUC/CE)
- Captcha (hCaptcha o similar)

El sistema busca el comprobante. Si los datos coinciden, devuelve la vista.

**Ventaja**: cualquier receptor puede consultar sin compartir nada extra.
**Desventaja**: alguien con los datos puede consultar comprobantes ajenos.

#### Modo B — Por token único (recomendado)

Al emitir el comprobante, el sistema genera un `tokenConsulta` (UUID) que se incluye en:
- El correo enviado al receptor: link directo `https://comprobantes.tudominio.com/c/{tokenConsulta}`.
- El código QR del PDF.

El receptor entra al link y ve el comprobante sin necesidad de tipear nada.

**Ventaja**: ergonómico y seguro.
**Desventaja**: si el receptor pierde el correo y no tiene el PDF, no puede consultar.

#### Modo C — Combinado (lo que vamos a implementar)

- **Vista principal**: link con token (Modo B) → acceso directo.
- **Fallback**: formulario público con datos + captcha (Modo A).

Esto da ergonomía y respaldo.

### Endpoints

```
GET  /portal-cliente/                          → home con formulario y explicación
POST /portal-cliente/buscar                    → busca por datos (Modo A)
GET  /portal-cliente/c/:tokenConsulta          → acceso directo (Modo B)
GET  /portal-cliente/comprobante/:id/xml       → descarga XML (signed URL)
GET  /portal-cliente/comprobante/:id/cdr       → descarga CDR
GET  /portal-cliente/comprobante/:id/pdf       → descarga PDF
GET  /portal-cliente/comprobante/:id/preview   → vista HTML previa del PDF
```

### Vista del comprobante

```
┌─────────────────────────────────────────────────────────┐
│ MI EMPRESA SAC                  RUC 20123456789          │
│                                                           │
│ FACTURA ELECTRÓNICA                                       │
│ F001-00000123                                             │
│                                                           │
│ Fecha: 05/05/2026 14:30                                   │
│                                                           │
│ Receptor: EMPRESA EJEMPLO SAC (RUC 20987654321)           │
│ Dirección: Av. Cliente 456                                │
│                                                           │
│ ┌─ Detalle ────────────────────────────────────────────┐ │
│ │ # │ Descripción       │ Cant │ V.Unit  │ Total       │ │
│ │ 1 │ Producto ejemplo  │  2   │ 100.00  │ 200.00      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ Subtotal:           S/   200.00                           │
│ IGV (18%):          S/    36.00                           │
│ TOTAL:              S/   236.00                           │
│ (DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES)             │
│                                                           │
│ Estado SUNAT: ✓ ACEPTADO el 05/05/2026 14:30:08          │
│                                                           │
│ [ Descargar XML ] [ Descargar CDR ] [ Descargar PDF ]    │
└─────────────────────────────────────────────────────────┘
```

### Auditoría

Cada acceso al portal se registra en una tabla:

```prisma
model PortalAccessLog {
  id              String   @id @default(cuid())
  comprobanteId   String
  metodoAcceso    String   // "TOKEN" | "FORMULARIO"
  ipOrigen        String
  userAgent       String?
  fechaAcceso     DateTime @default(now())
  accion          String   // "VIEW" | "DOWNLOAD_XML" | "DOWNLOAD_CDR" | "DOWNLOAD_PDF"

  @@index([comprobanteId, fechaAcceso])
}
```

### Rate limiting

- 10 requests/min por IP en `/portal-cliente/buscar`.
- 60 requests/min por IP en endpoints de descarga.
- Si se excede: 429 Too Many Requests con Retry-After.

### Disponibilidad

El portal debe estar disponible **al menos por 1 año desde la emisión** del comprobante. Como nuestra política de retención en MinIO es 6 años (compliance mode), el portal naturalmente cumple con creces. Solo verificar que el servicio web esté operativo.

---

## 8. Envío automático al receptor por correo

### Obligatorio para facturas

Al recibir CDR `ACEPTADO`:

```
1. Construir email:
   - Asunto: "Comprobante electrónico {tipo} {serie}-{correlativo} de {emisor}"
   - Cuerpo: HTML con preview básico del comprobante + botón "Ver comprobante" → link al portal
   - Adjuntos: XML firmado, CDR.zip, PDF
2. Enviar a:
   - email del receptor (de su ficha de cliente)
   - copia opcional al emisor para tracking
3. Registrar en log:
   - email enviado, fecha, destinatario
4. Si rebota: alertar al facturador
```

### Opcional para boletas

Para boletas a consumidor final (sin email), no se envía nada por correo. El cajero entrega ticket impreso (PDF representación) o link al portal vía QR/SMS si el comprador da número.

---

## 9. Backup y disaster recovery

### Backup periódico de MinIO

```bash
# Cron diario a las 3am
mc mirror --overwrite --remove myminio/cpe-produccion /backup/cpe-produccion-$(date +%Y%m%d)
mc mirror --overwrite --remove myminio/bajas-produccion /backup/bajas-produccion-$(date +%Y%m%d)
```

Idealmente el destino del backup está en otro servidor o servicio (rsync a NAS, B2, S3 Glacier, etc.).

### Retención de backups

- Diarios: 7 días
- Semanales: 8 semanas
- Mensuales: 24 meses

### Plan ante pérdida de datos

| Escenario | Plan |
|---|---|
| Comprobante específico borrado por error | Compliance mode lo previene. Si se logró: restaurar de backup más reciente. |
| MinIO totalmente caído | Levantar nueva instancia, restaurar último backup, regenerar PDFs faltantes desde XMLs. |
| Pérdida de XML pero CDR sobrevive | El XML se puede regenerar desde el snapshot fiscal en BD. La firma cambia (hashes nuevos) pero contenido es el mismo. Marcar como "regenerado" en el log. |
| Pérdida de CDR pero XML sobrevive | El CDR no se puede regenerar (es respuesta SUNAT). Se puede consultar a SUNAT por la validez del comprobante via servicio de consulta de validez. |

---

## 10. Tareas

- [ ] Levantar MinIO en docker-compose con volumen persistente
- [ ] Crear buckets `cpe-beta`, `cpe-produccion`, `bajas-beta`, `bajas-produccion`, `temp-uploads`
- [ ] Configurar versionado en todos los buckets de comprobantes
- [ ] Configurar object lock compliance mode (6 años) en buckets de producción
- [ ] Crear usuarios IAM `erp-app` y `erp-portal` con políticas mínimas
- [ ] Implementar `StorageService` con interfaz §4
- [ ] Implementar `buildStorageKey()` siguiendo §3
- [ ] Conectar `sunat.processor` para subir XML antes de enviar y CDR al recibir
- [ ] Conectar `baja.processor` igual para RA y CDR de baja
- [ ] Implementar `PdfRenderer` con plantillas HTML por tipo
- [ ] Generar PDF al recibir CDR aceptado y subir a MinIO
- [ ] Generar QR según especificación SUNAT con todos los campos requeridos
- [ ] Migración de datos (P3): script `backfill-storage.ts`
- [ ] Verificar migración antes de drop de columnas viejas
- [ ] Drop de columnas `xmlContent`, `cdrContent`, `pdfContent`
- [ ] Implementar Portal Cliente con rutas §7
- [ ] Implementar Modo C (token + formulario) para autenticación
- [ ] Modelo `PortalAccessLog` y registro de cada acceso
- [ ] Rate limiting en endpoints públicos
- [ ] Implementar envío automático por email tras CDR aceptado
- [ ] Configurar backup diario de MinIO con rotación
- [ ] Documentar plan de disaster recovery en runbook
