# 07 — Comunicación de baja (anulación)

> **Pre-requisito de lectura**: `03-NORMATIVA-SUNAT.md` (§7), `04-MODELO-DATOS.md` (entidad `ComunicacionBaja`).

Anular un comprobante NO es cambiar un estado local. Es un proceso real con SUNAT que difiere según el tipo de comprobante.

---

## 1. Resumen ejecutivo

| Comprobante | Cómo se anula | Documento técnico | Plazo |
|---|---|---|---|
| **Factura ACEPTADA** | Comunicación de Baja (RA) | XML `VoidedDocuments` vía `sendSummary` | 7° día calendario desde día siguiente de emisión |
| **Boleta ACEPTADA** (envío individual) | Nota de Crédito con motivo Cat 09 = `01` | XML `CreditNote` vía `sendBill` | 5 días calendario (plazo de boleta) |
| **NC/ND vinculada a factura** | RA (igual que factura) | `VoidedDocuments` | 7 días |
| **NC/ND vinculada a boleta** | Otra NC (sí, NC sobre NC) o asumir el error | `CreditNote` | 5 días |
| **Comprobante RECHAZADO** | No se anula. No existe ante SUNAT. Se corrige y reemite con nuevo correlativo. | — | — |
| **Comprobante en `REQUIERE_REVISION`** | No se anula directo. Resolver primero el envío. | — | — |

---

## 2. Flujo: anular Factura (Comunicación de Baja con RA)

### Precondiciones

- Comprobante de tipo `FACTURA` (o NC/ND vinculada a factura).
- Estado del comprobante: `ACEPTADO` o `ACEPTADO_CON_OBS`.
- Plazo: `fechaEmision + 7 días calendario` no vencido (contado desde el día siguiente).
- Usuario tiene permiso `comprobantes:anular`.

### Pipeline

```
1. Usuario en /erp/comprobantes/:id click "Comunicar baja"
2. Modal: motivo de baja (texto libre obligatorio, mínimo 10 caracteres)
3. Confirmación explícita ("Esta acción es irreversible")
4. Click "Confirmar baja"

5. INICIAR TRANSACCIÓN
   ├─ Tomar correlativo de RA del día (RA-YYYYMMDD-NNN)
   ├─ Crear ComunicacionBaja en estado PENDIENTE_ENVIO
   ├─ Comprobante.estado = BAJA_PENDIENTE
   ├─ Crear log evento BAJA_INICIADA
   └─ COMMIT

6. Publicar evento `baja.iniciada` → encola job en baja.processor

7. UI: redirige a vista del comprobante con badge "Baja en proceso..."
```

### Worker `baja.processor` (ya descrito en `06-COLA-SUNAT.md` §6)

Resumen:
1. Construir XML `VoidedDocuments`.
2. Firmar.
3. Subir XML a MinIO.
4. Enviar vía `sendSummary` → recibe ticket.
5. Encolar `consulta.processor` con delay 30s.

### Worker `consulta.processor`

1. Polling de `getStatus(ticket)` con backoff exponencial.
2. Cuando SUNAT responde:
   - **Aceptada**: `ComunicacionBaja.estado = ACEPTADA`, `Comprobante.estado = ANULADO`, evento `baja.aceptada`.
   - **Rechazada**: `ComunicacionBaja.estado = RECHAZADA`, alerta al facturador, `Comprobante` vuelve a estado anterior (`ACEPTADO`).

### Resultado en la venta

Cuando llega `baja.aceptada`:

```
Venta.estadoFacturacion = ANULADA_FISCAL
```

La venta sigue como `ENTREGADA` o lo que estuviera. Si se quiere cancelar la venta también:
- Acción manual del vendedor: "Cancelar venta" (precondición ahora cumplida porque `estadoFacturacion = ANULADA_FISCAL`).
- Reverso comercial: stock, caja, equipos, garantías.

---

## 3. Estructura del XML `VoidedDocuments` (RA)

### Esqueleto UBL

```xml
<?xml version="1.0" encoding="UTF-8"?>
<VoidedDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1"
                 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                 xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                 xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- Firma XAdES-BES aquí -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>

  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>

  <!-- Identificación del documento RA -->
  <cbc:ID>RA-20260505-001</cbc:ID>
  <cbc:ReferenceDate>2026-05-05</cbc:ReferenceDate>  <!-- fecha del comprobante a anular -->
  <cbc:IssueDate>2026-05-06</cbc:IssueDate>          <!-- fecha de emisión del RA -->

  <cac:Signature>
    <cbc:ID>RA-20260505-001</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>20123456789</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>MI EMPRESA SAC</cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>

  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>20123456789</cbc:CustomerAssignedAccountID>
    <cbc:AdditionalAccountID>6</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>MI EMPRESA SAC</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Una línea por cada comprobante a anular -->
  <sac:VoidedDocumentsLine>
    <cbc:LineID>1</cbc:LineID>
    <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>  <!-- 01=factura, 07=NC, 08=ND -->
    <sac:DocumentSerialID>F001</sac:DocumentSerialID>
    <sac:DocumentNumberID>123</sac:DocumentNumberID>
    <sac:VoidReasonDescription>Error en datos del receptor</sac:VoidReasonDescription>
  </sac:VoidedDocumentsLine>

  <!-- Más líneas si se anulan varios comprobantes a la vez -->
</VoidedDocuments>
```

### Reglas

- **`ReferenceDate`**: fecha en que se emitió el comprobante a anular. **Todas las líneas del mismo RA deben tener el mismo `ReferenceDate`** (es decir, todos los comprobantes deben ser del mismo día de emisión).
- **`IssueDate`**: fecha en que se está enviando la baja.
- **Numeración**: `RA-YYYYMMDD-NNN` donde `NNN` es correlativo del día.
- Un RA puede anular varios comprobantes del mismo día, pero en nuestra v1 lo hacemos uno por uno (más simple, más trazable).

### `DocumentTypeCode` permitido en RA

| Código | Documento que se puede anular |
|---|---|
| 01 | Factura |
| 07 | Nota de crédito (vinculada a factura) |
| 08 | Nota de débito (vinculada a factura) |

**No se puede usar RA para boletas** (código 03). Para boletas, ver §4.

---

## 4. Flujo: anular Boleta (vía Nota de Crédito)

### Precondiciones

- Comprobante de tipo `BOLETA`.
- Estado: `ACEPTADO` o `ACEPTADO_CON_OBS`.
- Plazo: 5 días calendario desde emisión.
- Usuario tiene permiso `comprobantes:emitir-nc`.

### Pipeline

```
1. Usuario en /erp/comprobantes/:id (boleta) click "Anular con NC"
2. Redirige a /erp/comprobantes/nueva-nc?origen=:id&motivo=01
3. Modal pre-llenado:
   ├─ Tipo: Nota de Crédito (BC01)
   ├─ Comprobante origen: B001-00000123 (read-only)
   ├─ Motivo: "01 - Anulación de la operación" (read-only)
   ├─ Monto: total del comprobante origen (read-only)
   └─ Descripción del motivo: [texto libre obligatorio]

4. Usuario confirma
5. Pipeline igual al de emisión normal (ver `05-FLUJO-VENTAS-Y-COMPROBANTES.md` §3)
   pero con tipo NOTA_CREDITO y referencia al comprobante origen

6. Worker procesa el envío
7. Si la NC es ACEPTADA:
   ├─ Comprobante NC.estado = ACEPTADO
   ├─ Boleta origen NO cambia de estado (sigue ACEPTADO ante SUNAT)
   ├─ Pero la venta asociada a la boleta:
   │  └─ Venta.estadoFacturacion = ANULADA_FISCAL (si NC anula por monto total)
   └─ UI muestra la boleta con badge adicional "Anulada por NC BC01-00000005"
```

### Resultado visual en UI

En la lista de comprobantes, la boleta anulada se muestra:

```
Boleta B001-00000123    [✓ ACEPTADO] [⊘ Anulada por BC01-00000005]    S/ 1,180.00
```

El badge "Anulada por NC" tiene un link directo a la NC.

---

## 5. Manejo de plazos vencidos

### Si pasaron > 7 días desde la factura

- No se puede usar RA.
- La única opción es Nota de Crédito (con motivo del Cat 09 que aplique).
- Si el motivo es realmente "anulación" pero ya pasó el plazo de NC excepcional (10 días hábiles), se debe documentar como ajuste contable y consultar con el contador.

### Si pasaron > 5 días desde la boleta

- No se puede usar NC para anular dentro del plazo regular.
- Si el motivo es excepcional (sujeto distinto, descripción incorrecta) y aún se está dentro de 10 días hábiles, usar NC excepcional (ver `08-NOTAS-CREDITO-DEBITO.md` §3).
- Si pasaron > 10 días hábiles: queda como error histórico, ajuste contable.

---

## 6. Casos especiales

### 6.1. Anular un comprobante con NC ya emitida

Si una factura tiene NCs vinculadas y se quiere anular la factura:

- Primero hay que anular las NCs (cada una con su propio RA).
- Luego anular la factura.
- O directamente emitir un RA que incluya factura + sus NCs (en el mismo `VoidedDocuments`, líneas separadas).

### 6.2. Anular un comprobante en `BAJA_PENDIENTE`

No se puede iniciar otra baja sobre un comprobante que ya tiene una en proceso. La UI debe deshabilitar el botón "Comunicar baja" si `estado = BAJA_PENDIENTE`.

### 6.3. Baja rechazada por SUNAT

Si SUNAT rechaza el RA:

```
ComunicacionBaja.estado = RECHAZADA
ComunicacionBaja.cdrCodigo = (código de error)
ComunicacionBaja.cdrMensaje = (mensaje)

Comprobante.estado = ACEPTADO  (vuelve al estado previo)

Log evento BAJA_RESUELTA con resultado RECHAZADA
Alerta al facturador con razón
```

El facturador puede:
- Corregir el motivo y re-iniciar baja (creando nueva ComunicacionBaja).
- O usar Nota de Crédito si el RA no es viable.

### 6.4. Tiempos de SUNAT con sendSummary

`sendSummary` puede tomar de minutos a horas en procesar. La UI debe gestionar bien esa expectativa: "La baja está en proceso. Recibirás notificación cuando SUNAT responda (puede tomar varios minutos)."

---

## 7. Servicios y componentes

| Componente | Responsabilidad |
|---|---|
| `BajaService.iniciarBaja(comprobanteId, motivo)` | Validar precondiciones, crear `ComunicacionBaja`, encolar |
| `BajaPayloadBuilder.build(comunicacionBaja)` | Generar XML `VoidedDocuments` |
| `baja.processor` | Worker BullMQ: enviar vía sendSummary |
| `consulta.processor` | Worker BullMQ: polling de ticket |
| `BajaService.cancelarBaja(comunicacionBajaId)` | Solo si aún no se envió a SUNAT (estado PENDIENTE_ENVIO) |

---

## 8. UI: detalle de la comunicación de baja

`/erp/comprobantes/bajas/:id`

```
┌──────────────────────────────────────────────────────────┐
│ Baja RA-20260506-001                       [Aceptada ✓]   │
│                                                            │
│ Comprobante anulado: F001-00000123 (factura)              │
│ Fecha del comprobante: 2026-05-05                         │
│ Fecha de baja: 2026-05-06 09:15                           │
│ Motivo: Error en datos del receptor                        │
│                                                            │
│ Ticket SUNAT: 1681589000123                                │
│ CDR: [Descargar CDR]                                       │
│ XML: [Descargar XML]                                       │
│                                                            │
│ Logs:                                                      │
│   09:15:00  BAJA_INICIADA                                  │
│   09:15:05  ENVIADA_ESPERANDO_TICKET (ticket=...)          │
│   09:15:35  CONSULTA_TICKET (en proceso)                   │
│   09:18:35  CONSULTA_TICKET (procesado)                    │
│   09:18:36  BAJA_RESUELTA (aceptada)                       │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Tareas

- [ ] Implementar `BajaService.iniciarBaja()` con validaciones de §2
- [ ] Implementar `BajaPayloadBuilder` siguiendo §3
- [ ] Numeración correlativa de RA por día (`RA-YYYYMMDD-NNN`)
- [ ] Implementar `baja.processor` (ver `06-COLA-SUNAT.md` §6)
- [ ] Implementar `consulta.processor` (ver `06-COLA-SUNAT.md` §7)
- [ ] UI: botón "Comunicar baja" en detalle de factura ACEPTADA
- [ ] UI: botón "Anular con NC" en detalle de boleta ACEPTADA → redirige al flujo de NC con motivo `01` precargado
- [ ] UI: vista de detalle de comunicación de baja (`/erp/comprobantes/bajas/:id`)
- [ ] UI: tab "Bajas" en hub de comprobantes
- [ ] Validar plazos (7 días para RA, 5 días para NC vinculada a boleta)
- [ ] Manejar caso de baja rechazada (revertir estado del comprobante)
- [ ] Bloquear acciones conflictivas (no permitir doble baja, no permitir baja sobre baja en proceso)
- [ ] Notificaciones según `05-FLUJO-VENTAS-Y-COMPROBANTES.md` §8
