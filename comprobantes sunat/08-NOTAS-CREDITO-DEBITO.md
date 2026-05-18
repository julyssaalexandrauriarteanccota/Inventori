# 08 — Notas de Crédito y Débito

> **Pre-requisito de lectura**: `03-NORMATIVA-SUNAT.md` (§8 NC, §9 ND), `07-COMUNICACION-BAJA.md`.

Define los flujos de NC y ND, distinguiendo el caso regular del excepcional, y las reglas que el sistema debe aplicar.

---

## 1. Cuándo emitir NC vs ND vs RA

| Necesidad | Documento correcto |
|---|---|
| Anular factura dentro de 7 días | RA (`07-COMUNICACION-BAJA.md`) |
| Anular factura después de 7 días | NC con motivo `01` (anulación) |
| Anular boleta (siempre, modalidad individual) | NC con motivo `01` |
| Corregir error en RUC de factura/boleta dentro de 10 días hábiles | NC excepcional con motivo `02` |
| Corregir descripción del bien/servicio dentro de 10 días hábiles | NC excepcional con motivo `01` (mismo código pero contexto excepcional) |
| Aplicar descuento posterior | NC con motivo `04` (global) o `05` (por ítem) |
| Devolución total del bien | NC con motivo `06` |
| Devolución parcial | NC con motivo `07` |
| Cobrar intereses por mora | ND con motivo `01` |
| Cobrar penalidad | ND con motivo `03` |
| Cobrar más por aumento de valor pactado | ND con motivo `02` |

---

## 2. Nota de Crédito — flujo regular

### Precondiciones

- Comprobante origen existe y está en estado `ACEPTADO` o `ACEPTADO_CON_OBS`.
- Suma de NCs previas + esta NC ≤ monto total del comprobante origen.
- Motivo del Cat 09 válido y aplicable al tipo de comprobante origen.
- Para motivo `04` (descuento global): origen es factura (no boleta a consumidor final).
- Plazo de envío: igual al del tipo del comprobante origen (factura: mismo día; boleta individual: 5 días).

### Pipeline de emisión

```
1. Usuario en detalle del comprobante origen click "Generar Nota de Crédito"
2. Modal:
   ├─ Tipo: Nota de Crédito (read-only)
   ├─ Comprobante origen: F001-00000123 (read-only, link)
   ├─ Serie: FC01 (si origen es factura) o BC01 (si origen es boleta)
   ├─ Próximo correlativo: 00000005 (preview)
   ├─ Motivo (Cat 09): [dropdown agrupado: "Regular" / "Excepcional"]
   ├─ Descripción del motivo: [texto libre obligatorio]
   ├─ ¿Anula totalmente? [checkbox]
   ├─ Si NO anula totalmente:
   │  └─ Líneas: tabla editable con cantidad/monto a acreditar por ítem
   └─ Validaciones en vivo:
       ├─ Monto a acreditar > 0
       ├─ Suma ≤ saldo no acreditado del origen
       └─ Motivo aplicable al tipo de origen

3. Click "Emitir NC"
4. Pipeline igual que comprobante normal pero:
   ├─ tipo = NOTA_CREDITO
   ├─ comprobanteOrigenId = id del origen
   ├─ motivoCodigo = código Cat 09
   ├─ motivoDescripcion = texto del usuario
   └─ snapshot incluye referencia al origen (para BillingReference en UBL)
```

### Si la NC anula totalmente

Cuando llega `comprobante.aceptado` para una NC con motivo `01` por monto total:

```
NC.estado = ACEPTADO
Comprobante origen sigue en ACEPTADO ante SUNAT
Pero:
  Venta del comprobante origen:
    estadoFacturacion = ANULADA_FISCAL
```

Esto permite al vendedor cancelar la venta posteriormente (que ahora cumple precondición).

### UI en detalle del origen

Después de emitir NC, en la vista de detalle de la factura/boleta origen aparece:

```
┌── Notas de Crédito vinculadas ──────────┐
│  FC01-00000005  -S/ 1,180.00  Aceptada  │
│  Motivo: 01 - Anulación de la operación │
└─────────────────────────────────────────┘
```

---

## 3. Nota de Crédito — caso excepcional

### Cuándo aplica

Solo en estos dos casos, dentro de los **10 días hábiles** siguientes a la emisión del comprobante origen:

- **Motivo `01` (en contexto excepcional)**: el comprobante se emitió a un sujeto distinto (ej. RUC del cliente equivocado, era para Pedro pero salió para Juan).
- **Motivo `02` (corrección de error en RUC, descripción)**: la descripción del bien/servicio no corresponde a lo realmente vendido.

### Diferencia con NC regular

| Aspecto | NC regular | NC excepcional |
|---|---|---|
| Plazo | igual al del origen (1 o 5 días) | 10 días hábiles |
| Motivos válidos | todos del Cat 09 | solo `01` y `02` |
| Marca interna | `esExcepcional = false` | `esExcepcional = true` |
| Validación adicional | suma ≤ saldo del origen | el comprobante origen aún esté dentro de 10 días hábiles |

### UI

En el modal de emisión de NC, los motivos se agrupan visualmente:

```
Motivo:
  ┌── Regular (plazo del comprobante origen) ──────────┐
  │  ( ) 03 - Corrección por error en la descripción   │
  │  ( ) 04 - Descuento global                         │
  │  ( ) 05 - Descuento por ítem                       │
  │  ( ) 06 - Devolución total                         │
  │  ( ) 07 - Devolución por ítem                      │
  │  ( ) 08 - Bonificación                             │
  │  ( ) 09 - Disminución en el valor                  │
  │  ( ) 10 - Otros conceptos                          │
  │  ( ) 13 - Ajustes - montos y/o fechas de pago      │
  └────────────────────────────────────────────────────┘

  ┌── Excepcional (10 días hábiles) ───────────────────┐
  │  ( ) 01 - Anulación de la operación                │
  │  ( ) 02 - Anulación por error en el RUC            │
  └────────────────────────────────────────────────────┘
```

Si el comprobante origen tiene > 10 días hábiles, la sección excepcional aparece deshabilitada con mensaje "Plazo vencido (excedió 10 días hábiles)".

### Cálculo de "10 días hábiles"

```typescript
function diasHabilesEntre(desde: Date, hasta: Date, feriados: Date[]): number {
  // Excluye sábados, domingos y feriados oficiales
}
```

Mantener una tabla `FeriadosNacionales` actualizable manualmente por año (los feriados peruanos no cambian frecuentemente, pero sí se decretan días no laborables específicos).

---

## 4. Reglas de validación de monto

### NC: la suma no puede exceder el origen

```typescript
const saldoNoAcreditado = origen.total - sumaNcsAceptadas(origen.id);
if (montoNuevaNc > saldoNoAcreditado) {
  throw new ValidationError(`El monto excede el saldo no acreditado del origen (S/ ${saldoNoAcreditado})`);
}
```

### NC con motivo `01` por anulación total

- El monto debe ser exactamente igual al saldo no acreditado del origen.
- Las líneas de la NC deben replicar las del origen (con cantidades y montos negativos en el sentido contable).

### Una sola NC en proceso por comprobante origen

Para evitar que dos usuarios emitan NCs simultáneas que sumadas excedan el saldo:

- Mientras una NC esté en estado `PENDIENTE_ENVIO`, `EN_PROCESO_SUNAT` o `RECHAZADO` (esta última hasta que se decida), bloquear emisión de otra NC sobre el mismo origen.
- En la UI, deshabilitar botón "Generar NC" con tooltip explicativo.

---

## 5. Estructura del XML `CreditNote`

### Esqueleto

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- Firma XAdES-BES -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>

  <!-- Identificación: serie-correlativo de la NC -->
  <cbc:ID>FC01-00000005</cbc:ID>
  <cbc:IssueDate>2026-05-06</cbc:IssueDate>
  <cbc:IssueTime>09:15:00</cbc:IssueTime>

  <!-- Tipo de NC del Cat 09 -->
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>F001-00000123</cbc:ReferenceID>  <!-- comprobante origen -->
    <cbc:ResponseCode>01</cbc:ResponseCode>            <!-- motivo Cat 09 -->
    <cbc:Description>Anulación de la operación por error en el receptor</cbc:Description>
  </cac:DiscrepancyResponse>

  <!-- Referencia al documento origen -->
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>F001-00000123</cbc:ID>
      <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>  <!-- 01=factura, 03=boleta -->
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>

  <!-- Firma -->
  <cac:Signature>...</cac:Signature>

  <!-- Emisor -->
  <cac:AccountingSupplierParty>...</cac:AccountingSupplierParty>

  <!-- Receptor (el mismo del origen) -->
  <cac:AccountingCustomerParty>...</cac:AccountingCustomerParty>

  <!-- Totales y líneas -->
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="PEN">1180.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:CreditNoteLine>
    <cbc:ID>1</cbc:ID>
    <cbc:CreditedQuantity unitCode="NIU">2</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">200.00</cbc:LineExtensionAmount>
    <!-- ... resto de campos igual que en factura -->
  </cac:CreditNoteLine>
</CreditNote>
```

### Notas

- `cbc:ID` es la serie-correlativo de la NC, no del origen.
- `DiscrepancyResponse.ReferenceID` debe coincidir con el `ID` del comprobante origen.
- `BillingReference.InvoiceDocumentReference` también referencia el origen.
- `cbc:DocumentTypeCode` en `BillingReference` indica el tipo del origen (Cat 01).

---

## 6. Nota de Débito — flujo

### Catálogo 10

| Código | Motivo | Uso típico |
|---|---|---|
| 01 | Intereses por mora | Cliente pagó tarde, se cobra interés |
| 02 | Aumento en el valor | Se acordó posteriormente subir el precio |
| 03 | Penalidades / otros conceptos | Multas contractuales, recargos |
| 10 | Ajustes de operaciones de exportación | Caso especial |
| 11 | Ajustes afectos al IVAP | Caso especial |

### Pipeline

Idéntico al de NC pero:
- tipo = `NOTA_DEBITO`
- serie = `FD01` (vinculada a factura) o `BD01` (vinculada a boleta)
- motivoCodigo del Cat 10
- aumenta el monto a cobrar (no lo disminuye)

### Restricciones

- ND no anula nada. Solo agrega cargos.
- Suma de NDs no tiene tope en términos del origen (a diferencia de NC).
- ND debe usar la misma moneda que el origen.

### Estructura UBL

`DebitNote` (no `CreditNote`). Mismo esquema general pero con:
- Líneas: `cac:DebitNoteLine` con `cbc:DebitedQuantity`
- Motivo en `DiscrepancyResponse.ResponseCode` del Cat 10

---

## 7. Casos especiales

### 7.1. NC sobre NC (NC de NC)

No es habitual pero ocurre cuando se emite una NC y luego se quiere "deshacer" esa NC. Técnicamente es válido:

- La nueva NC referencia a la NC anterior (no al comprobante original).
- Suma neta: origen − NC1 + NC2 = monto correcto.

Tratarlo como un caso especial en validaciones: el "comprobante origen" puede ser de tipo `07` (NC) o `08` (ND), no solo `01`/`03`.

### 7.2. NC en moneda diferente al origen

No permitido por SUNAT. La NC debe usar la misma moneda que el comprobante origen.

### 7.3. Origen rechazado o anulado

- Si origen está `RECHAZADO`: no se puede emitir NC. El origen no existe ante SUNAT.
- Si origen está `ANULADO` (por RA): no se puede emitir NC. Ya está anulado.
- Si origen está `ANULADA_FISCAL` (su venta) por una NC previa: depende. Si la NC previa fue por monto total, ya no hay saldo. Si fue parcial, sí se puede emitir otra NC por la diferencia.

### 7.4. Anular una NC ya aceptada

Para facturas: se usa RA (Comunicación de Baja) sobre la NC, igual que con factura.
Para boletas: se emite NC de NC (raro pero técnicamente posible).

---

## 8. UI: vista de NC en detalle del origen

```
┌── Detalle de Factura F001-00000123 ─────────────────────┐
│ ...                                                       │
│                                                           │
│ Notas de Crédito:                                         │
│ ┌──────────────┬────────────┬──────────┬───────────────┐ │
│ │ FC01-00000005│ -S/ 1,180.00│ Aceptada │ 01 - Anulac.. │ │
│ │ FC01-00000007│ -S/ 100.00  │ Aceptada │ 05 - Descto.. │ │
│ └──────────────┴────────────┴──────────┴───────────────┘ │
│ Saldo no acreditado: S/ 0.00                              │
│ [Generar NC] (deshabilitado, sin saldo)                   │
│                                                           │
│ Notas de Débito:                                          │
│ ┌──────────────┬────────────┬──────────┬───────────────┐ │
│ │ FD01-00000003│ +S/ 50.00   │ Aceptada │ 01 - Mora     │ │
│ └──────────────┴────────────┴──────────┴───────────────┘ │
│ [Generar ND]                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Tareas

- [ ] Implementar `EmisionNotaService.emitirNc(comprobanteOrigenId, motivo, lineas, esExcepcional)`
- [ ] Implementar `EmisionNotaService.emitirNd(comprobanteOrigenId, motivo, lineas)`
- [ ] Implementar `NotaPayloadBuilder.build(snapshot)` para `CreditNote` y `DebitNote`
- [ ] Validación: suma NCs ≤ monto origen
- [ ] Validación: una sola NC en proceso por origen
- [ ] Validación: motivo aplicable al tipo de origen (ej. `04` no en boleta a consumidor final)
- [ ] Validación: plazo NC excepcional (10 días hábiles)
- [ ] Tabla `FeriadosNacionales` para cálculo de días hábiles
- [ ] UI: agrupación visual de motivos (regular vs excepcional)
- [ ] UI: deshabilitar sección excepcional si plazo vencido
- [ ] UI: mostrar NCs y NDs en detalle del comprobante origen con saldo
- [ ] UI: tab "Notas de crédito" y "Notas de débito" en hub
- [ ] Listener de evento `nc.emitida_total` que actualiza `Venta.estadoFacturacion = ANULADA_FISCAL`
- [ ] Tests: NC parcial sumada con NC parcial = anulación total → estado venta cambia
