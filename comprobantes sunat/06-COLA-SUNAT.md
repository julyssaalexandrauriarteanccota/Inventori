# 06 — Cola SUNAT (workers BullMQ)

> **Pre-requisito de lectura**: `04-MODELO-DATOS.md`, `03-NORMATIVA-SUNAT.md` (§4 plazos).

Define los workers BullMQ que procesan envíos a SUNAT, su idempotencia, política de reintentos y manejo de plazos.

---

## 1. Workers definidos

| Worker | Responsabilidad | Cola |
|---|---|---|
| `sunat.processor` | Envío de factura, boleta, NC, ND vía `sendBill` | `cola-envio-cpe` |
| `baja.processor` | Envío de RA (comunicación de baja) vía `sendSummary` y consulta de ticket | `cola-baja` |
| `consulta.processor` | Consulta de tickets pendientes (RA en proceso) | `cola-consulta-ticket` |
| `monitor.plazos` | Cron cada 15 min: lista comprobantes con plazo próximo a vencer | `cola-monitor` |
| `monitor.certificado` | Cron diario: alerta certificados próximos a vencer | `cola-monitor` |

---

## 2. Worker `sunat.processor` — flujo

```
JOB: { comprobanteId, intentoNumero, deadlineISO }

1. Cargar Comprobante con su Snapshot
2. Validar precondiciones:
   ├─ estado debe ser PENDIENTE_ENVIO
   ├─ plazo no vencido (Date.now() < deadline)
   ├─ certificado vigente
   └─ si alguna falla: marcar REQUIERE_REVISION + log + alertar

3. IDEMPOTENCIA:
   ├─ Buscar último ComprobanteEnvioLog con evento ENVIO_INICIADO o ENVIO_EXITOSO
   ├─ Si existe payloadHash y SUNAT respondió, NO reenviar
   │  └─ Procesar la respuesta cacheada
   └─ Si no, continuar

4. Cambiar estado: EN_PROCESO_SUNAT
5. Log: ENVIO_INICIADO

6. Construir XML (SunatPayloadBuilder.build(snapshot))
7. Firmar XML (SunatXmlSigner.sign(xml, certificado))
8. Calcular payloadHash = sha256(xmlFirmado)
9. Subir XML a MinIO → xmlStorageKey
10. Actualizar Comprobante.xmlStorageKey, digestValue, signatureValue

11. Enviar SOAP (SunatDirectGateway.sendBill(xmlFirmado, credenciales))
   ├─ TIMEOUT: 30 segundos
   └─ Capturar errores de red, timeout, etc.

12. Procesar respuesta:
   ├─ Si error técnico (red, timeout): lanzar excepción → BullMQ reintentará
   └─ Si recibió CDR:
       ├─ Subir CDR a MinIO → cdrStorageKey
       ├─ Parsear CDR (código, mensaje, observaciones)
       ├─ Actualizar Comprobante con cdrCodigoRespuesta, cdrMensaje, cdrObservaciones
       ├─ Determinar estado final:
       │  ├─ Código 0 sin obs → ACEPTADO
       │  ├─ Código 0 con obs (4xxx) → ACEPTADO_CON_OBS
       │  └─ Otros códigos → RECHAZADO
       ├─ Cambiar estado del comprobante
       ├─ Log: CDR_RECIBIDO
       └─ Publicar evento (`comprobante.aceptado | aceptado_con_obs | rechazado`)

13. Si estado es ACEPTADO o ACEPTADO_CON_OBS:
    └─ Generar PDF (PdfRenderer.render(snapshot, cdr)) → subir a MinIO

14. FIN
```

---

## 3. Política de reintentos

Configuración BullMQ:

```typescript
{
  attempts: 4,
  backoff: {
    type: 'exponential',
    delay: 3 * 60 * 1000  // 3 min, 9 min, 27 min, 81 min
  },
  removeOnComplete: false,  // mantener jobs completados para auditoría
  removeOnFail: false       // mantener jobs fallidos
}
```

### Clasificación de errores

| Tipo | Acción |
|---|---|
| **Recuperable**: red, timeout, 5xx de SUNAT, "servicio no disponible" | Reintentar (BullMQ automatic) |
| **No recuperable**: XML inválido, certificado expirado, datos del receptor mal | NO reintentar; marcar `REQUIERE_REVISION` |
| **Funcional**: CDR rechazado por reglas de negocio | NO reintentar automático; marcar `RECHAZADO`; el facturador decide si corregir y reintentar |

### Tras agotar reintentos

```
1. Estado del comprobante = REQUIERE_REVISION
2. Log: REQUIERE_REVISION con razón
3. Notificación crítica al rol facturador y admin tributario
4. NO se libera el correlativo (queda quemado hasta resolución manual)
```

---

## 4. Idempotencia

### Por qué importa

Si el worker envía el XML a SUNAT, SUNAT lo procesa, pero el worker se cae antes de guardar la respuesta: al reintentar enviaría de nuevo, generando duplicado.

### Mecanismo

1. **`operationId`**: UUID único por comprobante (no por intento). Generado al crear el comprobante.
2. **`payloadHash`**: SHA-256 del XML firmado. Se calcula antes de enviar.
3. **Antes de cada envío**:
   ```
   logUltimo = ComprobanteEnvioLog
       .where(comprobanteId, evento ∈ {ENVIO_INICIADO, CDR_RECIBIDO, ENVIO_ERROR})
       .orderBy(fechaEvento desc)
       .first()

   si logUltimo.evento == ENVIO_INICIADO y SUNAT no respondió:
       → estamos en estado dudoso, consultar SUNAT antes de reenviar
   si logUltimo.evento == CDR_RECIBIDO:
       → ya tenemos respuesta, no reenviar; usar logUltimo
   ```

4. **El XML enviado debe ser bit-a-bit el mismo en cada intento** para el mismo comprobante. Si el snapshot cambió (no debería), abortar.

### Consulta a SUNAT antes de reenviar (cuando estado es dudoso)

SUNAT no provee un "consultar comprobante por hash" para `sendBill` (sí para `sendSummary` vía ticket). En el caso de `sendBill`, si el estado es dudoso, la opción es:

- Esperar 30 segundos por si llega respuesta tardía.
- Reenviar.
- Si SUNAT responde con código de "duplicado" (típicamente 1033 o similar), tratar como ACEPTADO si la primera respuesta fue ACEPTADO; si no, marcar REVISION.

Esta lógica va en `SunatDirectGateway.sendBillWithIdempotency()`.

---

## 5. Gestión de plazos (deadlines)

### Cálculo de `fechaVencimientoPlazo`

Al crear el comprobante:

```typescript
function calcularDeadline(tipo: TipoComprobante, fechaEmision: Date): Date {
  switch (tipo) {
    case 'FACTURA':
      // Mismo día emisión, hasta 23:59:59 hora Lima
      return endOfDay(fechaEmision, 'America/Lima');

    case 'BOLETA':
      // 5 días calendario (modalidad INDIVIDUAL)
      return endOfDay(addDays(fechaEmision, 5), 'America/Lima');

    case 'NOTA_CREDITO':
    case 'NOTA_DEBITO':
      // Heredan el plazo del tipo del comprobante origen
      const origen = await loadOrigen(comprobante);
      return calcularDeadline(origen.tipo, fechaEmision);
  }
}
```

### Worker `monitor.plazos`

Cron cada 15 min:

```sql
SELECT id FROM Comprobante
WHERE estado IN ('PENDIENTE_ENVIO', 'EN_PROCESO_SUNAT', 'RECHAZADO', 'REQUIERE_REVISION')
  AND fechaVencimientoPlazo < NOW() + interval '30 minutes';
```

Para cada uno:
- Si está en `PENDIENTE_ENVIO`: re-encolar con prioridad alta.
- Si está en `EN_PROCESO_SUNAT`: forzar consulta de estado.
- Si está en `RECHAZADO` o `REQUIERE_REVISION`: alertar al facturador con urgencia.

### Cuando vence el plazo sin enviar

- Marcar como `REQUIERE_REVISION` con razón "plazo vencido".
- Alertar.
- El correlativo queda quemado.
- El facturador debe documentar y eventualmente emitir nuevo comprobante (con nuevo correlativo) si la operación lo amerita.

---

## 6. Worker `baja.processor` — flujo

```
JOB: { comunicacionBajaId, intentoNumero }

1. Cargar ComunicacionBaja con su Comprobante asociado
2. Validar:
   ├─ Comprobante.estado in (ACEPTADO, ACEPTADO_CON_OBS)
   ├─ Comprobante.tipo == FACTURA o NC/ND vinculada a factura
   ├─ Plazo: fechaCreacion + 7 días no vencido
   └─ ComunicacionBaja.estado == PENDIENTE_ENVIO

3. Construir XML del RA (BajaPayloadBuilder.build(comunicacionBaja))
4. Firmar
5. Subir XML a MinIO → ComunicacionBaja.xmlStorageKey

6. Enviar SOAP sendSummary
   └─ Devuelve ticket (string)

7. ComunicacionBaja.estado = ENVIADA_ESPERANDO_TICKET
   ComunicacionBaja.ticketSunat = ticket
   Log evento BAJA_INICIADA

8. Encolar job de consulta-ticket con delay 30s
```

---

## 7. Worker `consulta.processor` — flujo

```
JOB: { comunicacionBajaId, intentoNumero }

1. Cargar ComunicacionBaja
2. Si estado ya es ACEPTADA o RECHAZADA: exit
3. Llamar SunatDirectGateway.getStatus(ticket)
   ├─ Si estado "EN_PROCESO": re-encolar con delay creciente (30s, 60s, 5min, 15min, 1h)
   ├─ Si estado "PROCESADO":
   │  ├─ Subir CDR a MinIO
   │  ├─ Parsear CDR
   │  ├─ Si CDR aceptado:
   │  │  ├─ ComunicacionBaja.estado = ACEPTADA
   │  │  ├─ Comprobante.estado = ANULADO
   │  │  └─ Publicar evento `baja.aceptada`
   │  └─ Si CDR rechazado:
   │     ├─ ComunicacionBaja.estado = RECHAZADA
   │     └─ Alertar facturador
   └─ Log evento BAJA_TICKET_RECIBIDO o BAJA_RESUELTA
```

### Política de polling

Backoff exponencial con tope:

| Intento | Delay |
|---|---|
| 1 | 30 segundos |
| 2 | 1 minuto |
| 3 | 5 minutos |
| 4 | 15 minutos |
| 5 | 1 hora |
| 6+ | 1 hora hasta máximo 24 h |

Después de 24 h sin respuesta: alertar y marcar `REQUIERE_REVISION`.

---

## 8. Endpoints SUNAT y configuración

### Por ambiente

```typescript
const SUNAT_ENDPOINTS = {
  BETA: {
    billService: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    timeout: 30000,
  },
  PRODUCCION: {
    billService: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
    timeout: 30000,
  },
};
```

### Headers WS-Security

```xml
<wsse:Security>
  <wsse:UsernameToken>
    <wsse:Username>{RUC}{USUARIO_SOL}</wsse:Username>
    <wsse:Password>{CLAVE_SOL}</wsse:Password>
  </wsse:UsernameToken>
</wsse:Security>
```

`{RUC}` es el RUC de la empresa, `{USUARIO_SOL}` es el usuario secundario (típicamente `MODDATOS` para BETA), `{CLAVE_SOL}` la clave correspondiente.

---

## 9. Manejo del CDR

El servicio `sendBill` devuelve el CDR como ZIP base64 dentro de la respuesta SOAP. Procesamiento:

```
1. Decodificar base64 → bytes ZIP
2. Subir ZIP completo a MinIO (cdrStorageKey)
3. Descomprimir en memoria → archivo XML del CDR
4. Parsear XML CDR:
   ├─ /ApplicationResponse/cac:DocumentResponse/cac:Response/cbc:ResponseCode → cdrCodigoRespuesta
   ├─ /ApplicationResponse/cac:DocumentResponse/cac:Response/cbc:Description → cdrMensaje
   └─ /ApplicationResponse/cac:DocumentResponse/cac:Response/cbc:Note → observaciones (puede haber varias)
5. Determinar estado final según §2 paso 12
```

---

## 10. Logging — qué registrar siempre

Cada job debe escribir un `ComprobanteEnvioLog` por evento significativo:

| Evento | Cuándo | Campos críticos |
|---|---|---|
| ENCOLADO | al crear comprobante | comprobanteId, intentoNumero=1 |
| ENVIO_INICIADO | antes de SOAP | endpointUsado, payloadHash, intentoNumero |
| ENVIO_ERROR | tras error de red/timeout | errorTrace, duracionMs |
| CDR_RECIBIDO | al obtener respuesta | codigoRespuesta, mensajeRespuesta, duracionMs |
| REINTENTO | cuando se re-encola | razón |
| REQUIERE_REVISION | tras N reintentos | razón |
| BAJA_INICIADA | al enviar RA | ticketSunat |
| BAJA_TICKET_RECIBIDO | en cada consulta de ticket | ticketSunat, status |
| BAJA_RESUELTA | al resolver ticket | codigoRespuesta |

---

## 11. Concurrencia y atomicidad

- **Tomar correlativo**: dentro de transacción, lock `SELECT ... FOR UPDATE` en `SerieDocumento`.
- **Crear comprobante**: misma transacción que tomar correlativo + crear snapshot + actualizar venta + crear log + commit.
- **Worker procesando un comprobante**: BullMQ garantiza que el mismo job no se ejecuta dos veces simultáneamente.
- **Múltiples workers en paralelo**: OK, cada uno toma jobs distintos.
- **Lock de envío por comprobante**: si un dev re-encola manualmente un comprobante que ya está en proceso, BullMQ detecta el job duplicado por jobId. Usar `jobId = comprobanteId-${intentoNumero}` para evitar ambigüedad.

---

## 12. Métricas a exponer

Para observabilidad (Prometheus / Grafana / lo que sea):

- `cpe_envios_total{tipo, estado}` — counter
- `cpe_envios_duracion_ms{tipo}` — histogram
- `cpe_cola_pendientes{tipo}` — gauge
- `cpe_plazos_proximos_vencer{tipo}` — gauge
- `cpe_certificados_proximos_vencer` — gauge
- `cpe_errores_por_codigo{codigo}` — counter

---

## 13. Tareas

- [ ] Configurar BullMQ con colas `cola-envio-cpe`, `cola-baja`, `cola-consulta-ticket`, `cola-monitor`
- [ ] Implementar `sunat.processor` siguiendo §2
- [ ] Implementar idempotencia por `operationId` y `payloadHash`
- [ ] Implementar política de reintentos con clasificación de errores
- [ ] Implementar `baja.processor` siguiendo §6
- [ ] Implementar `consulta.processor` con backoff exponencial
- [ ] Implementar `monitor.plazos` (cron 15 min)
- [ ] Implementar `monitor.certificado` (cron diario)
- [ ] Calcular y guardar `fechaVencimientoPlazo` al crear comprobante
- [ ] Conectar SunatDirectGateway con MinIO (subir XML antes de enviar, CDR al recibir)
- [ ] Exponer métricas
- [ ] Documentar en runbook qué hacer ante cada tipo de error
