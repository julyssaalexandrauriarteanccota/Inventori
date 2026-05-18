# 04 — Comunicación de baja

> Cómo anular un comprobante ya aceptado por SUNAT. Las reglas son
> **distintas para factura y para boleta**, y este es uno de los puntos
> donde más sistemas fallan en producción.

---

## 1. Concepto: anular ≠ "marcar como anulado"

**No basta con cambiar `estado=ANULADO` en la base de datos.** Si SUNAT ya
aceptó el comprobante, ese documento sigue siendo legalmente válido hasta
que se le comunique formalmente la baja.

Hay dos mecanismos válidos según el tipo de comprobante:

| Tipo origen | Mecanismo de anulación |
|-------------|------------------------|
| Factura | **Comunicación de Baja (RA)** — documento independiente firmado y enviado a SUNAT |
| Nota vinculada a factura | **Comunicación de Baja (RA)** — mismo mecanismo |
| Boleta (modalidad individual) | **Nota de Crédito** motivo "01 - Anulación de la operación" |
| Boleta (modalidad RC) | Incluir en el RC del día con estado "anulado" (Cat 19) — no aplica en V1 |

Como en V1 las boletas van por modalidad individual (decisión D1), **toda
boleta se anula por NC**. Esto simplifica el modelo: solo facturas y notas de
factura usan RA.

---

## 2. Comunicación de Baja (RA) para facturas

### 2.1. Qué es el RA

Es un documento XML independiente que el emisor envía a SUNAT diciendo
"este/estos comprobantes que envié antes, los doy de baja". SUNAT responde
con un ticket, y luego se consulta el ticket para obtener el CDR de la baja.

A diferencia del envío normal (que es síncrono), la baja es **asíncrona en
dos pasos**:

1. `sendSummary` → SUNAT devuelve un ticket.
2. `getStatus(ticket)` → SUNAT devuelve el CDR cuando termina de procesar.

### 2.2. Estructura del RA

```xml
<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<VoidedDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1"
                 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                 xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                 xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                 xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1">

  <ext:UBLExtensions>...firma...</ext:UBLExtensions>

  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>

  <cbc:ID>RA-20260505-001</cbc:ID>
  <cbc:ReferenceDate>2026-05-04</cbc:ReferenceDate>  <!-- fecha de emisión del CPE a anular -->
  <cbc:IssueDate>2026-05-05</cbc:IssueDate>          <!-- fecha de emisión del RA -->

  <cac:Signature>...</cac:Signature>
  <cac:AccountingSupplierParty>...</cac:AccountingSupplierParty>

  <sac:VoidedDocumentsLine>
    <cbc:LineID>1</cbc:LineID>
    <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>  <!-- 01 = Factura, 07 = NC, 08 = ND -->
    <sac:DocumentSerialID>F001</sac:DocumentSerialID>
    <sac:DocumentNumberID>123</sac:DocumentNumberID>
    <sac:VoidReasonDescription>Error en datos del receptor</sac:VoidReasonDescription>
  </sac:VoidedDocumentsLine>

  <!-- Se pueden incluir múltiples líneas en un mismo RA -->
</VoidedDocuments>
```

### 2.3. Identificador del RA

Formato: `RA-YYYYMMDD-NNN` donde:
- `YYYYMMDD` es la fecha de emisión del RA (no del CPE original).
- `NNN` es un correlativo propio del RA, secuencial por día.

Ejemplo: `RA-20260505-001`, `RA-20260505-002`, etc.

El sistema mantiene este correlativo en una tabla aparte
(`SerieDocumentoBaja` o como contador en `ConfigEmpresaFiscal`).

### 2.4. Plazo legal

El RA debe enviarse hasta **el 7° día calendario contado a partir del día
siguiente de recibida la CDR del comprobante a anular**.

Ejemplo:
- Factura emitida 01/05.
- CDR aceptada recibida 01/05.
- Plazo para enviar RA: hasta 08/05.

Pasado ese plazo, la única opción es **NC con motivo apropiado**.

### 2.5. Flujo técnico de la comunicación de baja

```
[Facturador click "Comunicar baja"]
   │
   ▼
[Crear ComunicacionBaja en BD]
   ├─ identificadorBaja = "RA-20260505-001" (con lock para correlativo)
   ├─ comprobanteId = id del CPE a anular
   ├─ motivo = texto libre del usuario
   ├─ estado = PENDIENTE
   └─ Comprobante.estado = BAJA_PENDIENTE

   │
   ▼
[Encolar job: comunicarBaja(comunicacionBajaId)]
   │
   ▼
[Worker]
   ├─ Validar plazo (≤ 7 días calendario desde CDR original)
   ├─ Construir XML RA (VoidedDocuments)
   ├─ Firmar XML
   ├─ Subir XML a MinIO (key: /bajas/{anio}/{mes}/{ra-id}.xml)
   ├─ Llamar SOAP `sendSummary` a SUNAT
   │
   └─ Respuesta: ticket
       └─ Guardar en ComunicacionBaja.ticketSunat

   │
   ▼
[Reencolar job: consultarTicketBaja(comunicacionBajaId)]
   │ (con delay inicial de 30s)
   │
   ▼
[Worker consulta ticket]
   ├─ Llamar SOAP `getStatus(ticket)` a SUNAT
   │
   └─ Posibles respuestas:
       ├─ Status "0" → procesando, reintentar en 30s
       │
       ├─ Status "98" → ya procesada, CDR disponible
       │   ├─ Si CDR ACEPTADO:
       │   │   ├─ ComunicacionBaja.estado = ACEPTADA
       │   │   ├─ ComunicacionBaja.cdrStorageKey = key MinIO
       │   │   ├─ Comprobante.estado = ANULADO
       │   │   └─ Venta.estadoFacturacion = ANULADA_FISCAL
       │   │
       │   └─ Si CDR RECHAZADO:
       │       ├─ ComunicacionBaja.estado = RECHAZADA
       │       ├─ ComunicacionBaja.errorMessage = motivo
       │       └─ Comprobante.estado vuelve a ACEPTADO (sigue válido)
       │
       └─ Status "99" → error, ver detalle, marcar RECHAZADA
```

### 2.6. ¿Por qué un job separado para consultar el ticket?

Porque el procesamiento en SUNAT puede tardar minutos a horas. Mantener un
worker bloqueado esperando es ineficiente. El patrón estándar es:

1. Job 1: envío + obtener ticket.
2. Job 2: consulta de ticket con backoff (30s, 60s, 120s, ...).
3. Si tras N consultas no hay respuesta, alertar.

### 2.7. Errores comunes en RA

| Código error | Causa | Cómo prevenirlo |
|--------------|-------|-----------------|
| 1032 | Comprobante a dar de baja no existe en SUNAT | No intentar baja sobre comprobantes que nunca llegaron a ACEPTADO |
| 1033 | Comprobante ya fue dado de baja | Validar `Comprobante.estado != ANULADO` antes de iniciar |
| 1034 | Plazo de baja vencido | Validar plazo en frontend Y backend antes de crear el RA |
| 0306 | Identificador RA duplicado | Asegurar correlativo atómico de RA |

---

## 3. Anulación de boleta vía Nota de Crédito

Como decisión D1 las boletas van por modalidad individual, no se incluyen
en RC. Por tanto, anular una boleta = emitir una NC con motivo "01 -
Anulación de la operación".

### 3.1. Diferencias clave con RA

| Aspecto | Comunicación de Baja (RA) | NC anulación |
|---------|---------------------------|--------------|
| Tipo de documento | RA (resumen de bajas) | NC (nota de crédito) |
| Aplica a | Factura, NC de factura, ND de factura | Boleta (en V1), también puede usarse para factura como alternativa |
| Plazo | 7 días desde CDR | El plazo SUNAT estándar para NC (también vinculado a obligaciones fiscales del periodo) |
| Síncrono | No (2 pasos: enviar + consultar ticket) | Sí (1 paso: enviar y recibir CDR) |
| Numeración | Correlativo propio por día (RA-yyyymmdd-NNN) | Correlativo de serie de NC (FC01 o BC01) |
| Efecto en estado del CPE original | Pasa a ANULADO en SUNAT | El origen sigue ACEPTADO; la NC lo "neutraliza" contablemente |

### 3.2. Flujo de NC anulación de boleta

Es exactamente el mismo flujo que cualquier NC. Ver
[05-notas-credito-debito](./05-notas-credito-debito.md) sección 4.

Particularidades para anulación total:

- Motivo: `01 - Anulación de la operación`.
- Líneas: TODAS las líneas del comprobante origen, con los mismos montos.
- Sustento: descripción clara de por qué se anula.
- Si la NC es ACEPTADA, disparar reverso comercial: stock vuelve, equipos
  liberados, caja revertida.

### 3.3. ¿Y si la boleta tenía error de receptor?

Aquí entra la **NC excepcional** (ver [05-notas-credito-debito](./05-notas-credito-debito.md)
sección 5):

- Motivo `01` (sujeto distinto al adquirente): se emite NC excepcional
  anulando la boleta + se emite una boleta nueva con el receptor correcto.
  Plazo: 10 días hábiles.
- Motivo `02` (descripción incorrecta): se emite NC excepcional corrigiendo
  solo la descripción, sin cambiar montos.

---

## 4. Modelo de datos para baja

Recordatorio del schema (definido en [01-arquitectura](./01-arquitectura.md)):

```prisma
model ComunicacionBaja {
  id                  String   @id @default(cuid())
  comprobanteId       String
  comprobante         Comprobante @relation(fields: [comprobanteId], references: [id])

  identificadorBaja   String   @unique  // RA-20260505-001
  motivo              String
  fechaGeneracion     DateTime @default(now())
  fechaReferencia     DateTime  // fecha de emisión del CPE a anular

  estado              EstadoComunicacionBaja
  ticketSunat         String?
  cdrStorageKey       String?
  xmlStorageKey       String?

  errorMessage        String?
  iniciadoPor         String   // userId

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum EstadoComunicacionBaja {
  PENDIENTE
  EN_PROCESO   // ya enviada, esperando consulta de ticket
  ACEPTADA
  RECHAZADA
}
```

### 4.1. Tabla de correlativo RA

```prisma
model SerieDocumentoBaja {
  id                String   @id @default(cuid())
  empresaId         String
  ambiente          AmbienteSunat
  fecha             String   // YYYYMMDD
  correlativoActual Int      @default(0)

  @@unique([empresaId, ambiente, fecha])
}
```

Cada vez que se genera un RA, se incrementa el correlativo del día (con
lock pesimista). Si no existe entrada para hoy, se crea con correlativo 1.

---

## 5. Validaciones obligatorias antes de iniciar baja

Antes de crear la `ComunicacionBaja`, verificar (en orden):

1. **Comprobante existe y está en estado correcto**: `ACEPTADO` o
   `ACEPTADO_CON_OBSERVACIONES`. Si está `BAJA_PENDIENTE` o `ANULADO`,
   bloquear.

2. **Plazo no vencido**:
   - Si Factura/NC/ND: ≤ 7 días calendario desde fecha CDR.
   - Si Boleta: usar NC anulación, plazo de NC.

3. **No hay NCs aceptadas previas que ya anulen**: si ya existe una NC
   `ACEPTADA` motivo 01 contra este comprobante, no se puede comunicar baja
   adicional.

4. **Permisos**: usuario tiene rol facturador o superior.

5. **Configuración fiscal completa**: certificado vigente, ambiente definido,
   credenciales SOL OK.

Si alguna falla, mostrar mensaje claro y NO crear la `ComunicacionBaja`.

---

## 6. Reverso comercial al anular

Cuando una baja se acepta, el dominio Comprobantes emite el evento
`comprobante.anulado`. El dominio Ventas debe escucharlo y ejecutar el
reverso:

```typescript
// En el handler del evento (dominio Ventas)
async function onComprobanteAnulado(event) {
  const venta = await prisma.venta.findUnique({
    where: { id: event.ventaId },
    include: { detalles: true, equiposAsignados: true, garantias: true }
  });

  if (!venta) return;

  await prisma.$transaction(async (tx) => {
    // 1. Devolver stock
    for (const detalle of venta.detalles) {
      await tx.stock.increment({
        where: { productoId: detalle.productoId },
        data: { cantidad: detalle.cantidad }
      });
    }

    // 2. Liberar equipos serializados
    for (const equipo of venta.equiposAsignados) {
      await tx.equipoSerializado.update({
        where: { id: equipo.id },
        data: { estado: 'DISPONIBLE', ventaId: null }
      });
    }

    // 3. Eliminar/cancelar garantías
    await tx.garantia.updateMany({
      where: { ventaId: venta.id },
      data: { estado: 'CANCELADA' }
    });

    // 4. Revertir caja (movimiento contrario)
    await tx.movimientoCaja.create({
      data: {
        tipo: 'EGRESO',
        monto: venta.total,
        concepto: `Anulación venta ${venta.numero}`,
        ventaId: venta.id
      }
    });

    // 5. Actualizar venta
    await tx.venta.update({
      where: { id: venta.id },
      data: {
        estadoFacturacion: 'ANULADA_FISCAL',
        // Nota: el estado comercial NO cambia automáticamente.
        // La cancelación comercial es un paso separado.
      }
    });
  });
}
```

**Importante**: el reverso es transaccional. Si falla cualquier paso, todo
se revierte y se reintenta. La idempotencia se garantiza chequeando que
`venta.estadoFacturacion != 'ANULADA_FISCAL'` antes de empezar.

---

## 7. Casos especiales

### 7.1. Anular una NC

Una NC también puede ser anulada con RA (mismo `DocumentTypeCode = 07`).
Esto es raro pero ocurre si la NC fue emitida por error.

Validación adicional: si la NC anulada era una NC tipo 01 (anulación), al
anular la NC el comprobante origen "vuelve a la vida". El sistema debe
revertir el reverso comercial que se hizo cuando la NC se aceptó.

Esto es complejo y se recomienda **bloquear esta operación en V1** y
gestionarla manualmente con intervención del admin tributario hasta que se
implemente bien.

### 7.2. Múltiples bajas en un solo RA

SUNAT permite incluir varias líneas de comprobantes a anular en un solo RA.
Esto puede ser útil si se anulan muchos al mismo tiempo, pero complica la
máquina de estados (¿qué pasa si SUNAT acepta unas y rechaza otras?).

Recomendación V1: **un RA por comprobante**. Más simple, más trazable. Si en
el futuro hace falta optimizar, agrupar.

### 7.3. SUNAT acepta el RA pero el comprobante ya estaba anulado

Caso de carrera: dos usuarios inician baja del mismo comprobante casi
simultáneamente. El segundo intento debe fallar al crear la
`ComunicacionBaja` porque `Comprobante.estado` ya es `BAJA_PENDIENTE` o
`ANULADO`.

Implementación: validación a nivel servicio + constraint UNIQUE
implícito en que solo puede haber una `ComunicacionBaja` activa por
`comprobanteId` (validar al crear).

---

## 8. UI mínima de bajas

En el detalle del comprobante:

- Si estado = `ACEPTADO` o `ACEPTADO_CON_OBS` y dentro del plazo:
  - Botón "Comunicar baja" (visible para rol facturador+).
- Si estado = `BAJA_PENDIENTE`:
  - Banner: "Baja en proceso, esperando confirmación de SUNAT (ticket: XXX)".
  - Botón "Consultar estado ahora" (fuerza una consulta del ticket).
- Si estado = `ANULADO`:
  - Banner rojo: "Comprobante anulado el [fecha], motivo: [motivo]".
  - Botón para descargar XML del RA y CDR de la baja.

En el tab "Bajas" del hub:

- Lista de todas las `ComunicacionBaja`, ordenadas por fecha desc.
- Filtros: estado, fecha, comprobante asociado.
- Cada fila: ID baja, comprobante anulado, fecha, motivo, estado SUNAT.

---

## Siguiente lectura

- [05-notas-credito-debito](./05-notas-credito-debito.md) — flujo completo de
  NC, incluyendo NC excepcional.
- [06-cola-sunat](./06-cola-sunat.md) — implementación de los workers
  asíncronos.
