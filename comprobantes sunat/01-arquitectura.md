# 01 — Arquitectura

> Modelo de datos, separación de responsabilidades, máquinas de estado y
> snapshot fiscal. Este documento es la base conceptual del módulo. Todo lo que
> venga después depende de que estos conceptos queden claros.

---

## 1. Separación de responsabilidades

El módulo se compone de **tres dominios independientes** que se acoplan solo
por identificadores y eventos. La regla mental es: cada dominio tiene su propio
ciclo de vida y su propia tabla maestra.

### 1.1. Dominio Ventas (comercial)

Vive en `/erp/ventas` y `/erp/pos`. Su preocupación es:

- Cotizar, confirmar y entregar bienes/servicios.
- Mover stock, registrar caja, asignar equipos serializados, crear garantías.
- Cancelar y revertir.

**No sabe nada de SUNAT.** No conoce series, certificados, XML ni CDR. Lo único
que sabe del mundo fiscal es un campo: `estadoFacturacion`, que se actualiza
por eventos del dominio Comprobantes.

### 1.2. Dominio Comprobantes (fiscal)

Vive en `/erp/comprobantes`. Su preocupación es:

- Construir el comprobante a partir de una venta (snapshot fiscal).
- Tomar correlativo de serie de forma transaccional. 2.1, firmarlo, enviarlo y procesar el CDR.
- Generar XML UBL
- Gestionar comunicaciones de baja, notas de crédito y notas de débito.
- Mantener trazabilidad completa (logs de envío, hashes, errores).

**No sabe nada de stock, caja ni equipos.** Solo lee el snapshot y opera sobre
él. Los snapshots son inmutables desde el momento de la emisión.

### 1.3. Dominio SUNAT (canal técnico)

Vive como capa de infraestructura (workers BullMQ, builders UBL, firmador,
gateway SOAP). Su preocupación es:

- Construir el payload UBL.
- Firmar con certificado digital.
- Enviar SOAP a SUNAT.
- Procesar respuesta (CDR aceptado / rechazado / observado).
- Reintentar fallos técnicos.
- Notificar al dominio Comprobantes vía evento.

**No sabe nada del modelo de negocio.** Recibe un comprobante por id, hace su
trabajo, devuelve resultado.

### 1.4. Comunicación entre dominios

La comunicación entre dominios es **siempre por eventos**, nunca por llamadas
síncronas que crucen la frontera. Ejemplos:

- Venta confirmada → no dispara nada en Comprobantes (es decisión humana).
- Comprobante creado → dispara `venta.estadoFacturacion = EN_EMISION`.
- Comprobante aceptado por SUNAT → dispara `venta.estadoFacturacion = EMITIDA`.
- Comprobante rechazado → dispara `venta.estadoFacturacion = RECHAZADA`.
- Baja aceptada → dispara `venta.estadoFacturacion = ANULADA_FISCAL`.

Implementación recomendada: event emitter interno o transactional outbox.
Evitar webhooks o colas externas para esto; es comunicación intra-proceso.

---

## 2. Modelo de datos

Schema sugerido en notación Prisma. Adaptar nombres y tipos a la convención del
proyecto. Lo que importa son las **relaciones, los campos clave y los enums**.

### 2.1. Tabla `Venta`

```prisma
model Venta {
  id                  String   @id @default(cuid())
  numero              String   @unique  // V-2025-00123 o similar
  clienteId           String
  cliente             Cliente  @relation(fields: [clienteId], references: [id])

  // Ciclo comercial
  estado              EstadoVenta  // COTIZACION | ORDEN_CONFIRMADA | ENTREGADA | CANCELADA
  fechaCreacion       DateTime @default(now())
  fechaConfirmacion   DateTime?
  fechaEntrega        DateTime?

  // Ciclo fiscal (separado del comercial)
  estadoFacturacion   EstadoFacturacionVenta @default(SIN_COMPROBANTE)
  comprobante         Comprobante?  // 1:1 opcional

  // Totales (para validar contra el snapshot del comprobante)
  subtotal            Decimal
  igv                 Decimal
  total               Decimal

  detalles            VentaDetalle[]
  // ... otros campos comerciales: vendedor, sucursal, etc.
}

enum EstadoVenta {
  COTIZACION
  ORDEN_CONFIRMADA
  ENTREGADA
  CANCELADA
}

enum EstadoFacturacionVenta {
  SIN_COMPROBANTE     // no se ha emitido nada
  EN_EMISION          // hay comprobante creado, aún sin CDR final
  EMITIDA             // CDR aceptado
  EMITIDA_CON_OBS     // CDR aceptado con observaciones
  RECHAZADA           // CDR rechazado, requiere acción
  ANULADA_FISCAL      // baja comunicada y aceptada
}
```

### 2.2. Tabla `Comprobante`

```prisma
model Comprobante {
  id                  String   @id @default(cuid())

  // Vínculo con la venta (1:1)
  ventaId             String   @unique
  venta               Venta    @relation(fields: [ventaId], references: [id])

  // Identificación fiscal
  tipo                TipoComprobante  // FACTURA | BOLETA | NOTA_CREDITO | NOTA_DEBITO
  serie               String           // F001, B001, FC01, FD01...
  correlativo         Int
  numeroCompleto      String           @unique  // F001-00000123 (denormalizado para búsqueda)

  // Fechas
  fechaEmision        DateTime
  fechaVencimiento    DateTime?

  // Estado fiscal
  estado              EstadoComprobante
  ambiente            AmbienteSunat    // BETA | PRODUCCION

  // Snapshot fiscal (inmutable desde emisión)
  snapshot            Json             // ver sección 4 de este documento

  // Para notas
  comprobanteOrigenId String?
  comprobanteOrigen   Comprobante?     @relation("NotaReferencia", fields: [comprobanteOrigenId], references: [id])
  notas               Comprobante[]    @relation("NotaReferencia")
  motivoNota          String?          // Cat 09 o Cat 10
  motivoNotaDescripcion String?
  esNotaExcepcional   Boolean          @default(false)  // ver doc 05

  // Trazabilidad SUNAT
  operationId         String           @unique  // para idempotencia
  ticketSunat         String?          // si aplica (algunos endpoints devuelven ticket)
  hashCpe             String?          // digestValue del XML firmado

  // Almacenamiento documental (storage keys, no contenido)
  xmlStorageKey       String?
  cdrStorageKey       String?
  pdfStorageKey       String?

  // Metadata
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  emitidoPor          String   // userId que disparó la emisión

  // Relaciones
  envios              ComprobanteEnvioLog[]
  comunicacionesBaja  ComunicacionBaja[]

  @@index([estado])
  @@index([fechaEmision])
  @@index([tipo, serie])
}

enum TipoComprobante {
  FACTURA
  BOLETA
  NOTA_CREDITO
  NOTA_DEBITO
}

enum EstadoComprobante {
  PENDIENTE_ENVIO              // creado, en cola
  EN_PROCESO_SUNAT             // enviado, esperando CDR
  ACEPTADO                     // CDR aceptado
  ACEPTADO_CON_OBSERVACIONES   // válido pero con observaciones
  RECHAZADO                    // CDR rechazado
  BAJA_PENDIENTE               // baja iniciada, esperando CDR
  ANULADO                      // baja aceptada por SUNAT
}

enum AmbienteSunat {
  BETA
  PRODUCCION
}
```

### 2.3. Tabla `ComprobanteEnvioLog` (auditoría)

Cada intento de envío deja una huella, sin importar si fue exitoso o fallido.

```prisma
model ComprobanteEnvioLog {
  id              String   @id @default(cuid())
  comprobanteId   String
  comprobante     Comprobante @relation(fields: [comprobanteId], references: [id])

  intento         Int      // 1, 2, 3...
  tipo            TipoEnvio  // ENVIO_INICIAL | REINTENTO | CONSULTA_TICKET | COMUNICACION_BAJA
  fecha           DateTime @default(now())

  // Request/response técnicos
  requestPayload  Json?    // referencia o resumen, NO el XML completo (ese va a storage)
  responseCode    String?
  responseDescription String?
  cdrStorageKey   String?  // si la respuesta tuvo CDR
  errorMessage    String?
  durationMs      Int?

  @@index([comprobanteId, intento])
}

enum TipoEnvio {
  ENVIO_INICIAL
  REINTENTO
  CONSULTA_TICKET
  COMUNICACION_BAJA
}
```

### 2.4. Tabla `ComunicacionBaja`

Entidad de primera clase, no un campo en `Comprobante`. Detalles de uso en
[04-comunicacion-baja](./04-comunicacion-baja.md).

```prisma
model ComunicacionBaja {
  id                  String   @id @default(cuid())
  comprobanteId       String
  comprobante         Comprobante @relation(fields: [comprobanteId], references: [id])

  // Identificación SUNAT del documento de baja (RA-yyyymmdd-NNNN)
  identificadorBaja   String   @unique

  motivo              String   // descripción libre
  fechaGeneracion     DateTime @default(now())
  fechaReferencia     DateTime // fecha del comprobante a anular

  estado              EstadoComunicacionBaja
  ticketSunat         String?
  cdrStorageKey       String?

  errorMessage        String?
  iniciadoPor         String   // userId

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum EstadoComunicacionBaja {
  PENDIENTE
  EN_PROCESO
  ACEPTADA
  RECHAZADA
}
```

### 2.5. Tabla `SerieDocumento`

```prisma
model SerieDocumento {
  id              String   @id @default(cuid())
  empresaId       String
  tipo            TipoComprobante
  serie           String   // F001, B001, FC01, FD01
  ambiente        AmbienteSunat
  correlativoActual Int    @default(0)
  activa          Boolean  @default(true)

  @@unique([empresaId, tipo, serie, ambiente])
}
```

**Crítico**: tomar correlativo debe ser una transacción con lock pesimista
(`SELECT ... FOR UPDATE`) o usar `INSERT ... RETURNING` con secuencia. Nunca
leer y escribir en operaciones separadas porque el race condition garantiza
correlativos duplicados bajo carga, y eso es un rechazo SUNAT inmediato.

### 2.6. Tabla `ConfigEmpresa` y `ConfigEmpresaFiscal`

Definidas en [08-configuracion-tributaria](./08-configuracion-tributaria.md).

---

## 3. Máquinas de estado

### 3.1. Estado de la Venta (comercial)

```
                ┌──────────────┐
                │  COTIZACION  │
                └──────┬───────┘
                       │ confirmar (descuenta stock,
                       │            asigna equipos,
                       │            crea garantías)
                       ▼
              ┌────────────────────┐
              │ ORDEN_CONFIRMADA   │──────┐
              └──────┬─────────────┘      │
                     │ entregar           │ cancelar
                     ▼                    │ (reverso completo)
              ┌────────────────┐          │
              │   ENTREGADA    │──────────┤
              └────────────────┘          ▼
                                  ┌──────────────┐
                                  │  CANCELADA   │
                                  └──────────────┘
```

**Reglas**:
- De `COTIZACION` solo se puede ir a `ORDEN_CONFIRMADA` o `CANCELADA`.
- De `ORDEN_CONFIRMADA` solo se puede ir a `ENTREGADA` o `CANCELADA`.
- De `ENTREGADA` solo se puede ir a `CANCELADA` (y solo si no hay comprobante
  emitido y aceptado, o si la NC de anulación ya fue aceptada).
- `CANCELADA` es terminal.

### 3.2. Estado fiscal de la Venta (campo separado)

```
   SIN_COMPROBANTE
        │ crear comprobante
        ▼
    EN_EMISION
        │
   ┌────┼─────────────┐
   │    │             │
   ▼    ▼             ▼
EMITIDA  EMITIDA_CON_OBS  RECHAZADA
   │                       │
   │ comunicar baja        │ reintentar (vuelve a EN_EMISION)
   │ (aceptada)            │
   ▼                       
ANULADA_FISCAL
```

**Regla de oro**: el `estadoFacturacion` solo lo modifica el dominio
Comprobantes mediante eventos. Ningún flujo comercial lo toca directamente.

### 3.3. Estado del Comprobante

```
PENDIENTE_ENVIO
     │ worker toma el job
     ▼
EN_PROCESO_SUNAT
     │
     ├── CDR aceptado ───▶ ACEPTADO
     ├── CDR aceptado con obs ───▶ ACEPTADO_CON_OBSERVACIONES
     ├── CDR rechazado ───▶ RECHAZADO
     └── error técnico ───▶ vuelve a PENDIENTE_ENVIO (con backoff)

ACEPTADO / ACEPTADO_CON_OBSERVACIONES
     │ usuario solicita baja
     ▼
BAJA_PENDIENTE
     │ baja aceptada
     ▼
ANULADO

RECHAZADO
     │ usuario corrige y reintenta
     ▼
PENDIENTE_ENVIO
```

**Reglas**:
- `PENDIENTE_ENVIO`, `EN_PROCESO_SUNAT`, `BAJA_PENDIENTE` son **estados
  transitorios**. Si un comprobante lleva más de 24h en estos estados, alertar
  a operaciones.
- `ACEPTADO`, `ACEPTADO_CON_OBSERVACIONES`, `RECHAZADO`, `ANULADO` son
  **terminales o pseudo-terminales** (RECHAZADO se puede recuperar).
- No se pueden emitir notas contra `RECHAZADO` ni `ANULADO`. Solo contra
  `ACEPTADO` o `ACEPTADO_CON_OBSERVACIONES`.

---

## 4. Snapshot fiscal: qué se congela exactamente

El snapshot es la **fotografía inmutable** del comprobante al momento de la
emisión. Cualquier cambio posterior en producto, cliente, precio o
configuración no debe afectar al comprobante ya emitido. Esto es crítico
porque:

1. SUNAT validó ese contenido específico, cualquier cambio lo invalida.
2. Es el documento legal que respalda la operación.
3. Una auditoría debe poder reconstruir la operación tal como fue.

### 4.1. Estructura del snapshot

Va en una columna `JSONB` (PostgreSQL) o como tabla separada con todas las
columnas tipadas. Recomiendo JSONB por flexibilidad y porque el contenido es
de solo-lectura desde el momento de la emisión.

```json
{
  "version": "1.0",
  "emisor": {
    "ruc": "20123456789",
    "razonSocial": "MI EMPRESA SAC",
    "nombreComercial": "Mi Empresa",
    "direccionFiscal": {
      "direccion": "AV. EJEMPLO 123",
      "ubigeo": "150101",
      "departamento": "LIMA",
      "provincia": "LIMA",
      "distrito": "LIMA",
      "urbanizacion": "",
      "codigoPais": "PE"
    },
    "codigoEstablecimiento": "0000"
  },
  "receptor": {
    "tipoDocumento": "6",
    "numeroDocumento": "20987654321",
    "razonSocial": "CLIENTE EJEMPLO SAC",
    "direccion": "JR. EJEMPLO 456",
    "email": "cliente@ejemplo.com"
  },
  "comprobante": {
    "tipo": "01",
    "tipoNombre": "FACTURA",
    "serie": "F001",
    "correlativo": 123,
    "fechaEmision": "2026-05-05",
    "fechaVencimiento": null,
    "moneda": "PEN",
    "tipoOperacion": "0101",
    "formaPago": {
      "tipo": "Contado",
      "cuotas": []
    }
  },
  "lineas": [
    {
      "numeroLinea": 1,
      "codigoProducto": "PROD-001",
      "codigoProductoSunat": "47131800",
      "descripcion": "Producto de ejemplo",
      "unidadMedida": "NIU",
      "cantidad": 2,
      "valorUnitario": 100.00,
      "precioUnitarioConIgv": 118.00,
      "descuento": 0,
      "afectacionIgv": "10",
      "valorTotal": 200.00,
      "igv": 36.00,
      "isc": 0,
      "totalLinea": 236.00
    }
  ],
  "totales": {
    "totalGravado": 200.00,
    "totalExonerado": 0,
    "totalInafecto": 0,
    "totalGratuito": 0,
    "totalDescuentos": 0,
    "subtotal": 200.00,
    "igv": 36.00,
    "isc": 0,
    "icbper": 0,
    "otrosTributos": 0,
    "totalAnticipos": 0,
    "importeTotal": 236.00
  },
  "detraccion": null,
  "retencion": null,
  "leyendas": [
    { "codigo": "1000", "descripcion": "DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES" }
  ],
  "referenciaNota": null,
  "configuracion": {
    "ambiente": "PRODUCCION",
    "ublVersion": "2.1",
    "customizationId": "2.0",
    "certificadoHuella": "AB:CD:EF:..."
  }
}
```

### 4.2. Campos críticos que no pueden faltar

Por tipo de comprobante:

| Campo | F | B | NC | ND |
|-------|---|---|----|-----|
| `emisor.ruc` y `razonSocial` | ✅ | ✅ | ✅ | ✅ |
| `emisor.codigoEstablecimiento` | ✅ | ✅ | ✅ | ✅ |
| `receptor.tipoDocumento` y `numeroDocumento` | ✅ (RUC) | ⚠️ (DNI si ≥ S/700) | ✅ | ✅ |
| `receptor.razonSocial` | ✅ | ⚠️ | ✅ | ✅ |
| `referenciaNota` (comprobante origen + motivo Cat 09/10) | ❌ | ❌ | ✅ | ✅ |
| `formaPago` (Contado/Crédito + cuotas si crédito) | ✅ | ✅ | ✅ | ✅ |
| `detraccion` si aplica al rubro | ⚠️ | ❌ | ⚠️ | ⚠️ |

**Regla**: el builder UBL debe **fallar fuerte** si falta cualquiera de estos
campos según el tipo. Mejor fallar al construir el XML que mandarlo y ser
rechazado por SUNAT.

### 4.3. Hash y firma

Una vez generado el XML firmado, el snapshot se acompaña de:

- `hashCpe`: el `digestValue` del XML firmado (SHA-256 del contenido firmado).
- `xmlStorageKey`: la ubicación del XML firmado en MinIO.
- `firmaCertificado`: huella del certificado usado (no el certificado completo).

Estos tres datos garantizan que un auditor pueda reconstruir y verificar la
firma años después.

---

## 5. Diagrama de relaciones simplificado

```
                        ┌──────────────┐
                        │   Cliente    │
                        └──────┬───────┘
                               │ 1:N
                               ▼
              1:N      ┌──────────────┐
        ┌──────────────│    Venta     │
        │              └──────┬───────┘
        │                     │ 0..1
        ▼                     ▼
   ┌──────────┐        ┌──────────────────┐
   │ Detalle  │        │   Comprobante    │
   └──────────┘        │  (snapshot JSONB)│
                       └──────┬───────────┘
                              │
              ┌───────────────┼─────────────────────┐
              │ N             │ 0..N                │ 0..N
              ▼               ▼                     ▼
       ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
       │ Comprobante  │  │ ComunicacionBaja │  │ Comprobante      │
       │ EnvioLog     │  └──────────────────┘  │ EnvioLog         │
       └──────────────┘                        └──────────────────┘

       Notas:           1:N
       Comprobante ─────────▶ Comprobante (auto-relación, comprobanteOrigenId)
                               para NC y ND
```

---

## 6. Dónde NO meter lógica de negocio

Para mantener la separación de dominios sana, evitar:

- **En el modelo Venta**: cualquier llamada a builders UBL, firmas o SUNAT.
- **En el modelo Comprobante**: cualquier modificación de stock, caja o
  equipos. Si se necesita revertir stock por una NC de devolución, eso lo hace
  el handler del evento `comprobante.nc_aceptada` en el dominio Ventas, no el
  Comprobante.
- **En los workers SUNAT**: cualquier consulta a Cliente, Producto o tablas
  comerciales. Solo deben leer el snapshot del Comprobante.

Esta disciplina es lo que permite cambiar la implementación de SUNAT (de
directo a OSE, o agregar un OSE de respaldo) sin tocar nada de Ventas.

---

## Siguiente lectura

- [02-flujos-operativos](./02-flujos-operativos.md) — cómo se usa todo esto en
  los flujos reales del usuario.
- [10-problemas-actuales](./10-problemas-actuales.md) — qué de esto está mal
  hoy y hay que corregir.
