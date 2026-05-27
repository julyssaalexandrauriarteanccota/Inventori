# 03 — Normativa SUNAT

> Plazos legales, modalidades de envío, catálogos de códigos, validaciones
> obligatorias, versión UBL vigente. Esta es la referencia normativa que el
> sistema debe respetar para no acumular incumplimientos.

---

## 1. Documentos electrónicos que el sistema emite

| Tipo | Código SUNAT | Serie | Uso |
|------|--------------|-------|-----|
| Factura electrónica | 01 | F### (alfanum) | Operaciones B2B (cliente con RUC) |
| Boleta de venta electrónica | 03 | B### (alfanum) | Operaciones B2C (consumidor final o con DNI) |
| Nota de crédito electrónica | 07 | FC## o BC## | Anulaciones, devoluciones, descuentos sobre F o B |
| Nota de débito electrónica | 08 | FD## o BD## | Cargos adicionales, intereses, recuperación de costos |
| Comunicación de baja | RA | RA-yyyymmdd-### | Anulación de factura aceptada |
| Resumen diario (modalidad RC) | RC | RC-yyyymmdd-### | Boletas vía resumen (no usado en V1) |

**V1 emite**: 01, 03, 07, 08 y RA. La modalidad RC queda para fase futura
(decisión D1 del README).

---

## 2. Plazos legales de envío

Plazos máximos para enviar el ejemplar a SUNAT. **El sistema debe respetarlos
y alertar antes de su vencimiento.**

### 2.1. Factura electrónica y notas vinculadas

Desde el 01/01/2023 el plazo es **la fecha de emisión consignada** en el
documento. Si se envía después es **rechazado por SUNAT**, aun cuando ya
hubiere sido entregado al receptor.

En la práctica esto significa: **emitir y enviar el mismo día**. La cola
SUNAT debe tratar facturas y notas como prioritarias.

### 2.2. Boleta electrónica (modalidad individual, decisión D1)

Plazo máximo: **5 días calendario contados desde la fecha de emisión**.

Esto da margen razonable: si SUNAT cae el viernes, hay hasta el miércoles
siguiente. Pero la cola debe procesarlas el mismo día por defecto y solo
diferir si hay problemas.

### 2.3. Boleta vía resumen diario (modalidad RC, no usada en V1)

Plazo máximo: **7 días calendario** desde la emisión. Para referencia futura
si activamos esta modalidad.

### 2.4. Comunicación de baja (RA)

Plazo: hasta **el 7° día calendario contado a partir del día siguiente de
recibida la CDR del comprobante**. Pasado ese plazo, ya no se puede dar de
baja con RA y queda solo la opción de NC (si aplica).

### 2.5. Nota de crédito excepcional (motivos 01 y 02)

Plazo: hasta **el 10° día hábil** de emitido el comprobante de pago
electrónico. Solo aplicable a:

- Motivo 01: el comprobante se emitió a un sujeto distinto al adquirente real.
- Motivo 02: la descripción del bien o servicio no corresponde a lo
  efectivamente entregado.

Detalle en [05-notas-credito-debito](./05-notas-credito-debito.md).

### 2.6. Tabla de plazos

| Documento | Plazo máximo | Recomendado |
|-----------|--------------|-------------|
| Factura | mismo día de emisión | mismo día |
| Nota vinculada a factura | mismo día de emisión | mismo día |
| Boleta (individual) | 5 días calendario | mismo día |
| Boleta (resumen) | 7 días calendario | día siguiente |
| Comunicación baja factura | 7 días desde CDR | mismo día de detectar el error |
| NC excepcional | 10 días hábiles | en cuanto se detecta el error |

### 2.7. Implementación de control de plazos

Cada job en BullMQ debe tener un campo `deadline` calculado al crear el
comprobante:

```typescript
const deadline = calcularDeadlineEnvio(comprobante.tipo, comprobante.fechaEmision);
```

El worker:
- Si está por vencerse el plazo (< 6h restantes) y aún no se envió → prioridad alta + alerta a operaciones.
- Si se venció → marcar como FALLIDO_PLAZO, alerta crítica, NO reintentar (será rechazado).

---

## 3. Modalidad de envío de boletas (decisión D1: INDIVIDUAL)

Existen dos modalidades válidas para enviar boletas a SUNAT:

| Modalidad | Cómo funciona | Plazo |
|-----------|---------------|-------|
| **Individual** (elegida) | Cada boleta se envía como CPE individual, mismo flujo que facturas | 5 días |
| Resumen diario (RC) | Las boletas del día se agrupan en un RC y se envía como un único documento | 7 días |

**V1 implementa solo INDIVIDUAL.** El modelo de datos contempla ambas para
poder activar RESUMEN sin migrar BD si el volumen lo amerita más adelante.

Configuración: `ConfigEmpresaFiscal.modalidadEnvioBoletas = 'INDIVIDUAL'`.

### 3.1. Implicancias operativas de INDIVIDUAL

- Cada boleta tiene su propio CDR en minutos (mismo SLA que facturas).
- Anular una boleta requiere NC (no se incluye en RC).
- Más volumen de llamadas SOAP a SUNAT (una por boleta vs una por día).
- Mejor feedback al usuario.

### 3.2. Cuándo migrar a RESUMEN

Si se llega a más de ~500 boletas/día y los costos de operación o el rate
limiting de SUNAT se vuelven problemáticos. Discusión técnica de la migración
en [11-roadmap](./11-roadmap.md), fase 5.

---

## 4. Catálogos SUNAT más usados

Lista de catálogos que el builder UBL debe consumir. Las tablas completas y
versiones actualizadas están en
[cpe.sunat.gob.pe/guias-y-manuales](https://cpe.sunat.gob.pe/guias-y-manuales).

| Catálogo | Qué codifica | Dónde se usa |
|----------|--------------|--------------|
| **Cat 01** | Tipo de documento (01=F, 03=B, 07=NC, 08=ND) | Header CPE |
| **Cat 02** | Tipo de moneda (PEN, USD, EUR) | DocumentCurrencyCode |
| **Cat 03** | Unidad de medida (NIU=unidad, ZZ=servicio, KGM=kilogramo, etc.) | InvoiceLine |
| **Cat 05** | Tipos de tributos (1000=IGV, 2000=ISC, 7152=ICBPER, 9999=Otros) | TaxTotal |
| **Cat 06** | Tipo de documento de identidad (1=DNI, 6=RUC, 7=Pasaporte, 4=CE, 0=Sin doc) | Cliente.tipoDoc |
| **Cat 07** | Afectación IGV por línea (10=Gravado, 20=Exonerado, 30=Inafecto, 11-17=Gratuitos, etc.) | InvoiceLine/TaxCategory |
| **Cat 08** | Sistema de cálculo del ISC (al valor, específico, etc.) | InvoiceLine/TaxCategory ISC |
| **Cat 09** | Motivos de NC (01=Anulación, 02=Anulación por error RUC, 03=Corrección descripción, 04=Descuento global, 05=Descuento ítem, 06=Devolución total, 07=Devolución ítem, 08=Bonificación, 09=Disminución valor, 10=Otros) | DiscrepancyResponse en NC |
| **Cat 10** | Motivos de ND (01=Intereses por mora, 02=Aumento en el valor, 03=Penalidades) | DiscrepancyResponse en ND |
| **Cat 12** | Documentos relacionados tributarios (orden de compra, guía de remisión, etc.) | AdditionalDocumentReference |
| **Cat 13** | UBIGEO (código geográfico de 6 dígitos: dpto+prov+dist) | RegistrationAddress |
| **Cat 16** | Tipo de precio de venta unitario (01=Precio unitario incluye IGV, 02=Valor referencial unitario en operaciones no onerosas) | PricingReference |
| **Cat 17** | Tipo de operación (0101=Venta interna, 0200=Exportación, 0401=Ventas no domiciliados que no califican como exportación, etc.) | InvoiceTypeCode SUNAT |
| **Cat 19** | Estado de ítem en RC (1=Adicionar, 2=Modificar, 3=Anulado) | Solo en RC |
| **Cat 20** | Motivos de traslado (solo Guía de Remisión, no usada en V1) | GRE |
| **Cat 51** | Tipo de operación detallada (factura: 0101 hasta 1004) | SUNATTransaction |
| **Cat 52** | Leyendas (1000=monto en letras obligatorio, 1002=transferencia gratuita, 2006=detracción, etc.) | AdditionalProperty |

### 4.1. Mantenimiento de catálogos

SUNAT actualiza estos catálogos periódicamente. Recomendación:

- Mantener una tabla local `CatalogoSunat` con versión y fecha de
  actualización.
- Tener un script que pueda reimportar desde los Excel oficiales (publican
  PDFs y XLSX en cpe.sunat.gob.pe).
- Validar contra estas tablas en el `ValidacionFiscalService` antes de
  construir el XML.

---

## 5. Validaciones SUNAT obligatorias

Estas son validaciones que SUNAT aplica al recibir el CPE. Si no se cumplen,
**rechazo automático con código de error**. El sistema debe validarlas
**antes** de tomar correlativo y enviar.

### 5.1. RUC del emisor

- 11 dígitos numéricos.
- Validación módulo 11.
- Empieza con 10, 15, 17 o 20.
- El RUC debe estar **activo** y en **condición de habido** en SUNAT (esto
  no se puede validar offline, pero se puede consultar al endpoint de SUNAT
  o asumir y manejar el rechazo).

### 5.2. Documento del receptor

| Tipo CPE | Documentos aceptados |
|----------|----------------------|
| Factura | RUC obligatorio (Cat 06: 6) |
| Boleta | DNI (1), CE (4), Pasaporte (7), Sin documento (0 = consumidor final) |

**Consumidor final** solo es válido en boleta y solo si **el monto total
≤ S/ 700**. Si supera ese monto, exigir documento de identidad y razón social.

Validación módulo 11 para RUC también del receptor.

### 5.3. Razón social / Nombres

- Para Factura: razón social del receptor obligatoria, no vacía, máximo 100
  chars.
- Para Boleta con documento: nombres y apellidos o razón social, según tipo.
- Para Boleta consumidor final: se puede usar la cadena "VARIOS" o similar.

### 5.4. Ubigeo

Código de 6 dígitos según Cat 13. Debe corresponder al UBIGEO real (no
inventar). Si la dirección del receptor no es de Perú, usar el campo
`Country` con código distinto a "PE" y omitir UBIGEO.

### 5.5. Líneas

- Cantidad > 0.
- Valor unitario ≥ 0 (puede ser 0 en operaciones gratuitas, con afectación
  IGV correspondiente).
- Unidad de medida válida en Cat 03.
- Código de afectación IGV válido en Cat 07.
- Si afectación es gravado (10), el IGV debe calcularse al 18% del valor de
  venta.

### 5.6. Totales

- `subtotal` debe igualar la suma de `valorTotal` de todas las líneas.
- `igv` debe igualar la suma de `igv` de líneas gravadas.
- `importeTotal` debe igualar `subtotal + igv + isc + icbper + otros - descuentos`.
- Tolerancia de redondeo: ± 0.01 por total. SUNAT acepta esa tolerancia.

### 5.7. Forma de pago

Desde 2023 es obligatorio especificar:

- **Contado** (`Contado`): pago al contado, sin cuotas.
- **Crédito** (`Credito`): debe especificar cada cuota con fecha y monto.

Esto va en `cac:PaymentTerms` y es un requerimiento que muchos sistemas
todavía no cumplen bien.

### 5.8. Validaciones específicas por tipo

#### Factura

- Receptor con RUC obligatorio.
- Si total > S/ 700 y operación grava IGV → puede aplicar detracción según
  rubro (Cat 54). Validar contra el catálogo si el producto/servicio está
  sujeto a detracción.

#### Boleta

- Si total > S/ 700 → identificación obligatoria del receptor.
- Si total ≤ S/ 700 y receptor sin documento → permitido.

#### NC

- Referencia obligatoria al comprobante origen (`cac:BillingReference`).
- Motivo del Cat 09 obligatorio.
- Sustento textual obligatorio.
- Si motivo es 01 (anulación), monto debe coincidir 100% con el origen.

#### ND

- Referencia obligatoria al comprobante origen.
- Motivo del Cat 10 obligatorio.
- Solo aplica para incrementar el monto del comprobante origen.

---

## 6. UBL 2.1: versión vigente y archivos oficiales

**Versión vigente: UBL 2.1**

- XSD oficial: actualizado al 28/02/2022.
- XSL oficial: actualizado al 06/09/2022.
- Customization ID: `2.0` (importante en el header del XML).

Archivos descargables en
[cpe.sunat.gob.pe/guias-y-manuales](https://cpe.sunat.gob.pe/guias-y-manuales).

### 6.1. Estructura general de un CPE UBL 2.1

```xml
<?xml version="1.0" encoding="ISO-8859-1" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- Aquí va la firma digital -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>F001-00000123</cbc:ID>
  <cbc:IssueDate>2026-05-05</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">01</cbc:InvoiceTypeCode>
  <cbc:Note languageLocaleID="1000">DOSCIENTOS TREINTA Y SEIS CON 00/100 SOLES</cbc:Note>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>

  <cac:Signature>...</cac:Signature>
  <cac:AccountingSupplierParty>...</cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>...</cac:AccountingCustomerParty>
  <cac:PaymentTerms>...</cac:PaymentTerms>
  <cac:TaxTotal>...</cac:TaxTotal>
  <cac:LegalMonetaryTotal>...</cac:LegalMonetaryTotal>
  <cac:InvoiceLine>...</cac:InvoiceLine>
</Invoice>
```

Para Boleta es el mismo template con `<Invoice>` cambiando algunos atributos.
Para NC y ND se usan `<CreditNote>` y `<DebitNote>` con campos adicionales.

### 6.2. Encoding y declaración XML

- Encoding: `ISO-8859-1` (no UTF-8). SUNAT es estricto con esto.
- `standalone="no"`.
- BOM: ausente.

Estos detalles son fuente común de rechazo. Documentarlo bien en el
`SunatPayloadBuilder`.

### 6.3. Firma digital

- Algoritmo de digestión: SHA-256.
- Algoritmo de firma: RSA-SHA256.
- La firma va dentro de `ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent`
  como un `ds:Signature` envuelto.
- El `ds:Reference URI=""` referencia al documento completo.
- El certificado se incluye en `ds:KeyInfo/ds:X509Data/ds:X509Certificate` en
  base64, sin headers PEM.

Detalles de implementación en [08-configuracion-tributaria](./08-configuracion-tributaria.md).

---

## 7. Reglas de Validación CPE (Anexo SUNAT)

SUNAT publica un Excel con todas las reglas de validación que aplica al
recibir un CPE. La última versión vigente al momento de redactar este
documento es del 24/04/2026. Está en
[cpe.sunat.gob.pe/guias-y-manuales](https://cpe.sunat.gob.pe/guias-y-manuales).

Tipos de reglas:

- **Errores** (rechazo): el CPE no se acepta, hay que corregir.
- **Observaciones** (aceptación con observaciones): el CPE se acepta pero hay
  algo que SUNAT marca. Genera estado `ACEPTADO_CON_OBSERVACIONES`.

El sistema debe consumir estas reglas y validarlas localmente antes de enviar
para evitar rechazos por errores triviales.

Recomendación: leer el Excel cada trimestre, comparar con la versión
implementada, y actualizar el `ValidacionFiscalService` con cualquier regla
nueva o modificada.

---

## 8. Conservación de documentos

Obligación legal del emisor electrónico:

- **Conservar** XML emitidos, CDR recibidos, resúmenes diarios y
  comunicaciones de baja por al menos **5 años**.
- **Poner a disposición** del receptor, vía portal web, los CPE emitidos por
  al menos **1 año** desde la emisión, con mecanismo de autenticación que
  garantice que solo el receptor accede.

El sistema implementa esto vía MinIO (storage 5+ años) y portal cliente
(consulta 1+ año). Detalle en [07-almacenamiento-documental](./07-almacenamiento-documental.md).

---

## 9. Quién está obligado a emitir electrónico

A partir del 2026, prácticamente todas las empresas que no estén en NRUS
están obligadas a emitir CPE. Esto significa que el sistema debe asumir que
**toda venta a partir de la confirmación requiere CPE**, salvo casos
explícitos de NRUS o exonerados.

Para clientes en NRUS hay una variante: solo emiten boletas, no facturas, y
no generan crédito fiscal. Si tu sistema soporta clientes NRUS como
emisores, considerar este caso. Si solo soporta RG/RMT/RER, no aplica.

---

## 10. Ambientes BETA y PRODUCCION

SUNAT tiene dos ambientes técnicos:

| Ambiente | Endpoint | Uso | Validez fiscal |
|----------|----------|-----|----------------|
| BETA | https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService | Pruebas de integración | NO tiene validez fiscal |
| PRODUCCION | https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService | Operación real | SÍ tiene validez fiscal |

**Reglas operativas**:

- Cada empresa puede operar en uno de los dos ambientes (no ambos a la vez en
  producción real).
- Al cambiar ambiente, los correlativos se reinician (la `SerieDocumento`
  tiene unicidad por `tipo + serie + ambiente`).
- BETA usa credenciales SOL distintas (usuario `MODDATOS`, clave `moddatos`
  por defecto, pero se debe configurar el usuario secundario propio).
- En BETA, los CPE no se entregan a clientes reales y no obligan a portal
  cliente.

UI debe mostrar **siempre visible** en qué ambiente se está operando, con
color distintivo (BETA: amarillo/naranja; PRODUCCION: verde).

---

## Siguiente lectura

- [04-comunicacion-baja](./04-comunicacion-baja.md) — anulación detallada.
- [05-notas-credito-debito](./05-notas-credito-debito.md) — NC y ND.
- [12-referencias](./12-referencias.md) — links a catálogos completos y
  documentación oficial.
