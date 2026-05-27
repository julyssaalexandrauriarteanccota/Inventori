# 02 — Flujos operativos

> Cómo se usa el sistema en la práctica. Patrón B + emisión rápida en POS,
> reglas de transición, casos de uso paso a paso, qué se valida y dónde.

---

## 1. Patrón elegido: B + emisión rápida en POS

Existen tres patrones posibles para conectar Ventas con Comprobantes:

- **Patrón A** — Emisión desde la venta (botón único en /erp/ventas).
- **Patrón B** — Bandeja de pendientes en /erp/comprobantes.
- **Patrón C** — Pre-comprobante editable antes de emitir.

**Decisión**: Patrón B con la opción adicional de **emisión rápida desde POS**
para boletas a consumidor final. Esta combinación cubre los dos modos
operativos reales:

1. **POS rápido**: el cajero escanea, cobra, emite boleta y entrega ticket en
   segundos. No tiene tiempo ni interés de revisar bandejas. Solo aplica a
   boletas (las facturas requieren validación más cuidadosa del receptor).

2. **Bandeja contable**: el facturador revisa el día, valida datos, emite
   facturas, gestiona rechazos, comunica bajas, emite notas. Trabajo
   asincrónico y deliberado.

---

## 2. Roles y dónde vive cada uno

| Rol | Vive en | Puede emitir | Puede gestionar SUNAT |
|-----|---------|--------------|------------------------|
| Cajero / Vendedor POS | `/erp/pos` | Boleta rápida | No (solo ve "enviado") |
| Vendedor regular | `/erp/ventas` | No (deja la venta para facturador) | No |
| Facturador / Contador | `/erp/comprobantes` | Factura, Boleta, NC, ND | Sí (rechazos, bajas) |
| Admin tributario | `/erp/configuracion/tributario` | No | Configura cert, series, ambiente |

Detalle de permisos en [09-ui-comprobantes](./09-ui-comprobantes.md), sección
"Roles y permisos".

---

## 3. Flujo: Emisión normal desde la bandeja (Patrón B)

Caso típico: vendedor cerró la venta sin emitir; facturador procesa después.

```
[Vendedor en /erp/ventas]
  │
  ├─ Crea cotización                                          [Venta: COTIZACION]
  ├─ Cliente acepta → Confirma                                [Venta: ORDEN_CONFIRMADA]
  │  → descuenta stock, asigna equipos, crea garantías
  ├─ Entrega producto/servicio                                [Venta: ENTREGADA]
  └─ NO emite comprobante todavía                             [estadoFacturacion: SIN_COMPROBANTE]

[Facturador en /erp/comprobantes → tab "Por emitir"]
  │
  ├─ Ve la venta listada (filtro: ORDEN_CONFIRMADA o ENTREGADA, sin comprobante)
  ├─ Click "Emitir"
  │
  ├─ Modal de emisión:
  │    ├─ Tipo: FACTURA / BOLETA (autodetectado según cliente, modificable)
  │    ├─ Serie: F001 / B001 (autocompletado de SerieDocumento activa)
  │    ├─ Fecha emisión: hoy (no editable salvo permiso especial)
  │    ├─ Forma de pago: Contado / Crédito (con cuotas si Crédito)
  │    └─ Observaciones (opcional, va al campo SUNAT correspondiente)
  │
  ├─ Validación previa (ValidacionFiscalService):
  │    ├─ Empresa: cert vigente, ambiente definido, credenciales SOL OK
  │    ├─ Cliente: tipo y número documento válido para el tipo de comprobante
  │    ├─ Líneas: códigos producto, unidades de medida, afectación IGV
  │    └─ Si hay BLOQUEANTES → muestra qué corregir, no toma correlativo
  │
  ├─ Toma correlativo (transacción atómica con lock pesimista)
  │    └─ SerieDocumento.correlativoActual++
  │
  ├─ Crea Comprobante:
  │    ├─ estado: PENDIENTE_ENVIO
  │    ├─ snapshot fiscal congelado
  │    ├─ operationId único (para idempotencia)
  │    └─ numeroCompleto: F001-00000123
  │
  ├─ Actualiza Venta:
  │    └─ estadoFacturacion: EN_EMISION
  │
  ├─ Encola job en BullMQ: `emitirCpe(comprobanteId)`
  │
  └─ UI muestra: "Comprobante creado. Enviando a SUNAT..." (badge amarillo)

[Worker BullMQ procesa async]
  │
  ├─ Construye XML UBL 2.1
  ├─ Firma con certificado .p12
  ├─ Envía SOAP a SUNAT
  ├─ Procesa CDR
  │
  └─ Resultado:
       ├─ ACEPTADO → Comprobante.estado = ACEPTADO
       │             Venta.estadoFacturacion = EMITIDA
       │             Sube XML+CDR a MinIO
       │             Genera PDF y lo sube
       │             Envía email al receptor (XML+PDF adjunto)
       │
       ├─ ACEPTADO_CON_OBS → idem + flag + alerta operativa
       │
       ├─ RECHAZADO → Comprobante.estado = RECHAZADO
       │              Venta.estadoFacturacion = RECHAZADA
       │              Guarda mensaje de error en log
       │              UI muestra badge rojo + acción "Ver error"
       │
       └─ ERROR_TECNICO → reintento exponencial (3 min, 15 min, 60 min)
                          tras 3 reintentos: alerta a operaciones

[Facturador ve el resultado en la bandeja]
  │
  └─ Tab "Facturas" o "Boletas" muestra el comprobante con badge final
```

### 3.1. Tiempos esperados

- Validación previa: < 100 ms.
- Toma de correlativo + creación: < 500 ms.
- Envío SUNAT (SOAP + CDR): 2-10 segundos en condiciones normales.
- Total desde click hasta CDR aceptado: típicamente < 15 segundos.

Si pasan más de 30 segundos sin CDR, el UI debe pasar de "Enviando..." a
"En proceso, te avisaremos por email" para no bloquear al usuario.

---

## 4. Flujo: Emisión rápida desde POS

Caso típico: tienda física, venta de mostrador, cliente paga y se va con el
ticket impreso.

```
[Cajero en /erp/pos]
  │
  ├─ Escanea/agrega productos → carrito
  ├─ Cliente: por defecto "Consumidor Final" (o se busca por DNI/RUC)
  │
  ├─ Click "Cobrar"
  │
  ├─ Modal de pago:
  │    ├─ Método: Efectivo / Tarjeta / Yape / etc.
  │    ├─ Monto recibido / vuelto
  │    └─ Opción "Emitir comprobante ahora": ☑ activado por defecto
  │
  ├─ Si NO hay datos de cliente → fuerza tipo BOLETA
  ├─ Si monto ≥ S/ 700 → exige documento de identidad (modal extra)
  ├─ Si tipo BOLETA + DNI o "consumidor final" → OK
  ├─ Si quiere FACTURA → modal completo de cliente con RUC
  │
  ├─ Confirmar:
  │    ├─ Crea Venta (auto-confirmada, auto-entregada)
  │    ├─ Descuenta stock, registra caja
  │    ├─ Crea Comprobante PENDIENTE_ENVIO
  │    ├─ Encola envío SUNAT
  │    └─ Imprime ticket (representación impresa, válida sin esperar CDR)
  │
  └─ Cajero pasa al siguiente cliente

[Worker procesa en background, igual que flujo normal]
  │
  └─ Si SUNAT rechaza → alerta al cajero/operaciones (notificación)
                        El facturador resuelve desde /erp/comprobantes
```

### 4.1. ¿Por qué se imprime ticket antes del CDR?

SUNAT permite la representación impresa del comprobante en cuanto este se
genera, no requiere esperar el CDR. Si después es rechazado, el flujo de
corrección es: emitir nota de crédito (motivo "anulación de la operación") y
emitir un nuevo comprobante con los datos correctos.

Esto es operativamente necesario en POS porque el cliente no puede esperar
10-30 segundos por el ticket.

### 4.2. Restricciones del modo POS rápido

- **Solo boletas y facturas simples** (sin descuentos globales complejos, sin
  detracciones, sin retenciones, sin múltiples formas de pago combinadas).
- **Ambiente PRODUCCION solo** (en BETA mostrar advertencia visible).
- Si el caso es complejo, el cajero usa "Guardar para facturación" → la venta
  va a la bandeja del facturador.

---

## 5. Flujo: Rechazo SUNAT y reintento

```
[Comprobante en estado RECHAZADO]
  │
  ├─ Facturador ve badge rojo en bandeja
  ├─ Click "Ver detalle" → ve mensaje de error de SUNAT (Cat 50, etc.)
  │
  ├─ Tipo de error:
  │    ├─ Datos del receptor incorrectos (RUC inválido, etc.)
  │    │    → Click "Corregir cliente" (deep link a ficha cliente)
  │    │    → Vuelve y click "Reintentar emisión"
  │    │       → ¿Mismo correlativo?
  │    │          ✅ SÍ, si el rechazo NO consumió la serie (la mayoría)
  │    │          ❌ NO, si SUNAT lo invalidó por error de estructura grave
  │    │
  │    ├─ Error de configuración (cert vencido, ambiente mal)
  │    │    → Notificación al admin tributario
  │    │
  │    └─ Error de líneas (código producto, afectación IGV mal)
  │         → Aquí complejo: la venta ya está confirmada y entregada
  │         → Opción 1: corregir snapshot (excepción permitida solo a admin)
  │         → Opción 2: anular venta y rehacer
  │
  └─ Reintento exitoso → Comprobante.estado = ACEPTADO
                          Venta.estadoFacturacion = EMITIDA
```

### 5.1. ¿Cuándo se libera el correlativo en rechazo?

Esta es una pregunta delicada. Depende del motivo del rechazo:

- **Rechazo por contenido recuperable** (RUC mal escrito, dirección mal):
  el correlativo se mantiene, se corrige y se reenvía con el mismo número.
- **Rechazo por correlativo duplicado, fecha fuera de rango, o estructura UBL
  inválida**: el correlativo no se puede reusar porque SUNAT lo trata como
  intentado. Hay que tomar el siguiente y dejar el anterior como "anulado por
  rechazo no recuperable".

Implementación recomendada: por defecto **mantener el correlativo** y reintentar.
Si tras tres reintentos sigue rechazando, ofrecer al admin la opción de "saltar
correlativo" con justificación obligatoria (queda en log de auditoría).

---

## 6. Flujo: Anulación de comprobante aceptado

Detalle completo en [04-comunicacion-baja](./04-comunicacion-baja.md). Resumen
del flujo desde UI:

```
[Facturador en /erp/comprobantes → detalle del comprobante ACEPTADO]
  │
  ├─ Click "Comunicar baja" o "Anular"
  │
  ├─ Modal:
  │    ├─ Motivo (texto libre, requerido)
  │    ├─ Confirmación: "Esto se enviará a SUNAT y no se puede revertir"
  │    └─ ¿El comprobante ya fue entregado al cliente? (warning informativo)
  │
  ├─ Validación: dentro del plazo legal (7 días desde CDR para factura;
  │              día de emisión para boleta vía RC, o usar NC)
  │
  ├─ Crea ComunicacionBaja en estado PENDIENTE
  ├─ Comprobante.estado = BAJA_PENDIENTE
  ├─ Encola job en BullMQ: `comunicarBaja(comunicacionBajaId)`
  │
  └─ UI muestra: "Baja en proceso..."

[Worker procesa]
  │
  ├─ Para FACTURA: genera RA, firma, envía SOAP `sendSummary` (con ticket)
  │    └─ Espera ticket → consulta cada 30s hasta tener CDR
  │
  ├─ Para BOLETA: incluye en RC del día (si vamos por modalidad RESUMEN)
  │    └─ O emite NC excepcional motivo 01 (sujeto distinto) si fuera de plazo
  │
  └─ Resultado:
       ├─ ACEPTADA → ComunicacionBaja.estado = ACEPTADA
       │             Comprobante.estado = ANULADO
       │             Venta.estadoFacturacion = ANULADA_FISCAL
       │
       └─ RECHAZADA → ComunicacionBaja.estado = RECHAZADA
                       Comprobante vuelve a ACEPTADO (sigue válido)
                       Notifica al facturador para resolver
```

---

## 7. Flujo: Nota de Crédito regular

Detalle completo en [05-notas-credito-debito](./05-notas-credito-debito.md).
Resumen:

```
[Facturador en detalle del comprobante ACEPTADO]
  │
  ├─ Click "Generar Nota de Crédito"
  │
  ├─ Modal:
  │    ├─ Motivo (Cat 09, dropdown):
  │    │    01 - Anulación de la operación
  │    │    02 - Anulación por error en el RUC
  │    │    03 - Corrección por error en la descripción
  │    │    04 - Descuento global
  │    │    05 - Descuento por ítem
  │    │    06 - Devolución total
  │    │    07 - Devolución por ítem
  │    │    08 - Bonificación
  │    │    09 - Disminución en el valor
  │    │    10 - Otros conceptos
  │    │
  │    ├─ Sustento (texto libre, requerido)
  │    ├─ Líneas afectadas:
  │    │    ├─ Si motivo 01/02/03/06/10: todas las líneas, monto completo
  │    │    └─ Si motivo 04/05/07/08/09: selección parcial editable
  │    └─ Confirmar
  │
  ├─ Validaciones:
  │    ├─ Comprobante origen está ACEPTADO o ACEPTADO_CON_OBSERVACIONES
  │    ├─ Suma de NCs anteriores + esta no excede el monto del origen
  │    ├─ Tipo de NC apropiado para el origen (NC para F→F, NC para B→B)
  │    └─ Datos del receptor coinciden con el origen
  │
  ├─ Crea Comprobante tipo NOTA_CREDITO con:
  │    ├─ Serie FC01 (factura) o BC01 (boleta), correlativo siguiente
  │    ├─ comprobanteOrigenId apuntando al original
  │    ├─ motivoNota = código Cat 09
  │    ├─ Snapshot fiscal con líneas afectadas
  │    └─ esNotaExcepcional = false
  │
  ├─ Encola envío SUNAT (mismo flujo que factura/boleta)
  │
  └─ Si motivo es 01 (anulación total) y NC ACEPTADA:
       └─ Disparar reverso comercial: stock vuelve, equipos liberados,
          caja revertida (handler en dominio Ventas)
```

---

## 8. Flujo: Nota de Crédito excepcional

Caso especial: dentro de los 10 días hábiles, para corregir RUC del receptor
o descripción del producto en un comprobante ya aceptado por SUNAT.

```
[Facturador en detalle del comprobante ACEPTADO]
  │
  ├─ Click "Generar NC excepcional" (visible solo si dentro de 10 días hábiles)
  │
  ├─ Modal:
  │    ├─ Motivo (solo dos opciones permitidas):
  │    │    01 - Anulación de la operación (sujeto distinto)
  │    │    02 - Corrección por error en la descripción
  │    │
  │    ├─ Si motivo 01: el siguiente paso es emitir un comprobante nuevo
  │    │                  con el receptor correcto. UI guía esto.
  │    │
  │    └─ Si motivo 02: solo se ajusta la descripción, mismo monto.
  │
  └─ Resto del flujo igual que NC regular, con flag esNotaExcepcional = true
```

Detalle de validaciones en [05-notas-credito-debito](./05-notas-credito-debito.md).

---

## 9. Flujo: Cancelación de venta

```
[Vendedor o admin en /erp/ventas → detalle de Venta]
  │
  ├─ Click "Cancelar venta"
  │
  ├─ Validación según estadoFacturacion:
  │    │
  │    ├─ SIN_COMPROBANTE → cancelación directa permitida
  │    │
  │    ├─ EN_EMISION → bloquear: "Espera a que termine la emisión"
  │    │
  │    ├─ EMITIDA / EMITIDA_CON_OBS → no se puede cancelar la venta
  │    │     directamente. Primero anular el comprobante (NC o baja).
  │    │     UI debe sugerir: "Para cancelar, primero genera una nota
  │    │     de crédito de anulación"
  │    │
  │    ├─ RECHAZADA → permitir cancelación (el comprobante no quedó
  │    │              válido en SUNAT, pero queda como histórico)
  │    │
  │    └─ ANULADA_FISCAL → permitir cancelación
  │
  └─ Cancelación ejecuta reverso completo:
       ├─ Stock vuelve a inventario
       ├─ Equipos serializados se liberan
       ├─ Garantías se eliminan o marcan canceladas
       ├─ Caja se revierte (movimiento contrario)
       └─ Venta.estado = CANCELADA
```

---

## 10. Tabla maestra de transiciones

Referencia rápida. Las acciones que no aparecen en la tabla NO están permitidas.

| Acción | Precondición Venta | Precondición Comprobante | Resultado Venta | Resultado Comprobante |
|---|---|---|---|---|
| Confirmar venta | `COTIZACION` | — | `ORDEN_CONFIRMADA` | — |
| Entregar venta | `ORDEN_CONFIRMADA` | — | `ENTREGADA` | — |
| Crear comprobante | `ORDEN_CONFIRMADA` o `ENTREGADA` + `SIN_COMPROBANTE` | — | `EN_EMISION` | nuevo `PENDIENTE_ENVIO` |
| CDR aceptado | — | `EN_PROCESO_SUNAT` | `EMITIDA` | `ACEPTADO` |
| CDR aceptado con obs | — | `EN_PROCESO_SUNAT` | `EMITIDA_CON_OBS` | `ACEPTADO_CON_OBSERVACIONES` |
| CDR rechazado | — | `EN_PROCESO_SUNAT` | `RECHAZADA` | `RECHAZADO` |
| Reintentar envío | — | `RECHAZADO` | `EN_EMISION` | `PENDIENTE_ENVIO` |
| Comunicar baja factura | — | `ACEPTADO` o `ACEPTADO_CON_OBS`, ≤ 7 días desde CDR | sin cambio | `BAJA_PENDIENTE` |
| Baja aceptada | — | `BAJA_PENDIENTE` | `ANULADA_FISCAL` | `ANULADO` |
| Emitir NC regular | — | origen `ACEPTADO`, motivo Cat 09 válido | sin cambio (a menos que sea anulación total) | nuevo `NOTA_CREDITO` `PENDIENTE_ENVIO` |
| Emitir NC excepcional | — | origen `ACEPTADO`, ≤ 10 días hábiles, motivo 01 o 02 | sin cambio | nuevo `NOTA_CREDITO` con `esNotaExcepcional=true` |
| Emitir ND | — | origen `ACEPTADO`, motivo Cat 10 | sin cambio | nuevo `NOTA_DEBITO` `PENDIENTE_ENVIO` |
| Cancelar venta | sin comprobante o con NC anulación aceptada | — | `CANCELADA` + reverso | — |

---

## 11. Casos borde a considerar

### 11.1. Venta confirmada con comprobante PENDIENTE_ENVIO durante mucho tiempo

Si el worker está caído o saturado y la venta lleva > 1h en `EN_EMISION`,
mostrar warning visible al facturador y al admin. No es ilegal, pero indica
problema operativo.

### 11.2. Reintentos infinitos

Política: 3 reintentos automáticos con backoff (3min, 15min, 60min). Después,
estado `RECHAZADO` con flag `requiere_intervencion_manual=true` y notificación
a operaciones. Nunca reintentar más allá del plazo legal de envío.

### 11.3. Cliente cambia de datos después de emitir

El snapshot fiscal del comprobante NO cambia (es inmutable). El cliente como
entidad sí cambia. Esto es correcto: el comprobante representa la realidad al
momento de emisión, no la actual.

### 11.4. Emisión simultánea de dos comprobantes para la misma venta

Imposible por constraint de unicidad: `Comprobante.ventaId @unique`. Si la UI
permite hacer click dos veces, el segundo intento falla a nivel BD. La UI
también debe deshabilitar el botón al primer click.

### 11.5. NC contra una NC

No permitido. Una NC solo puede referenciar un comprobante origen tipo
FACTURA o BOLETA, nunca otra NC. Validación a nivel servicio.

### 11.6. NC parcial por devolución, después NC total por anulación

Permitido siempre que la suma no exceda el total del origen. La validación
debe sumar el `importeTotal` de todas las NC `ACEPTADAS` o `EN_EMISION` y
verificar contra el origen. Una NC `RECHAZADA` no cuenta.

---

## Siguiente lectura

- [03-normativa-sunat](./03-normativa-sunat.md) — plazos legales, modalidades,
  catálogos.
- [04-comunicacion-baja](./04-comunicacion-baja.md) — anulación detallada.
- [09-ui-comprobantes](./09-ui-comprobantes.md) — diseño concreto del hub UI.
