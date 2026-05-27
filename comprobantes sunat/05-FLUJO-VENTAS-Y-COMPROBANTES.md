# 05 — Flujo de Ventas y Comprobantes

> **Pre-requisito de lectura**: `01-ARQUITECTURA.md`, `04-MODELO-DATOS.md`.

Define cómo se ven y se comportan las pantallas, qué transiciones son válidas y qué reglas las gobiernan.

---

## 1. Mapa de pantallas

```
/erp/ventas                       → ciclo comercial
/erp/pos                          → caja rápida + emisión rápida
/erp/comprobantes                 → hub fiscal (NUEVO, antes era /erp/ventas/facturacion)
   ├── /por-emitir                → bandeja
   ├── /facturas                  → emitidas (badge SUNAT)
   ├── /boletas                   → emitidas (badge SUNAT)
   ├── /notas-credito             → emitidas
   ├── /notas-debito              → emitidas
   ├── /bajas                     → comunicaciones de baja en curso/aceptadas
   └── /:id                       → detalle de comprobante
/erp/configuracion/tributario     → config empresa, fiscal, certificado, validaciones, series
/portal-cliente                   → portal público de consulta (NUEVO)
```

---

## 2. Flujo desde Ventas (caso típico)

```
[Vendedor en /erp/ventas]
   │
   ├─ Crea cotización (estadoComercial = COTIZACION)
   │     • estadoFacturacion = SIN_COMPROBANTE (no aplica todavía)
   │
   ├─ Confirma orden (estadoComercial = ORDEN_CONFIRMADA)
   │     • Descuenta stock, registra caja, asigna equipos serializados
   │     • Crea garantías
   │     • Aparece en /erp/comprobantes/por-emitir
   │
   ├─ (Opcional) Marca como entregada (estadoComercial = ENTREGADA)
   │
   └─ NO emite comprobante directamente (salvo POS rápido)
```

### Botón "Emitir directo" (opcional desde Venta)

Disponible solo si:
- `estadoComercial ∈ {ORDEN_CONFIRMADA, ENTREGADA}`
- `estadoFacturacion = SIN_COMPROBANTE`
- Usuario tiene permiso `comprobantes:emitir`

Al hacer click, redirige a `/erp/comprobantes/por-emitir` con el filtro aplicado a esa venta y el modal de emisión abierto.

---

## 3. Flujo en Hub de Comprobantes — Tab "Por emitir"

### Vista

| Fecha venta | Cliente | Total | Estado venta | Acción |
|---|---|---|---|---|
| 2026-05-05 | EMPRESA SAC | S/ 1,180.00 | Entregada | [Emitir] |
| 2026-05-05 | Carlos Rojas | S/ 50.00 | Confirmada | [Emitir] |

Filtros: rango fecha, cliente, monto, estadoComercial, vendedor.

### Acción "Emitir"

```
Click "Emitir" en una venta
       │
       ▼
┌───────────────────────────────────────────────────┐
│ Modal: Emitir comprobante                          │
│                                                    │
│ Tipo:         ( ) Factura                          │
│               ( ) Boleta                           │
│                                                    │
│ Serie:        [F001 ▼]  (filtrado por tipo)        │
│ Próximo nº:   00000123  (preview, no se reserva)   │
│                                                    │
│ Fecha emisión: [2026-05-05]  (default hoy)         │
│ Hora:          [14:30]                             │
│                                                    │
│ Receptor:     EMPRESA SAC (RUC 20...)              │
│               [Validar contra padrón SUNAT] ✓      │
│                                                    │
│ Validaciones:                                      │
│   ✓ Cliente con RUC válido                        │
│   ✓ Razón social presente                         │
│   ✓ Dirección completa                            │
│   ⚠ RUC en estado "habido" pero no validado hace 30 días (advertencia) │
│                                                    │
│ Observaciones (opcional): [_________________]      │
│                                                    │
│         [Cancelar]      [Emitir →]                 │
└───────────────────────────────────────────────────┘
```

### Pipeline al hacer click "Emitir →"

```
1. Re-validar cliente (puede haber cambiado mientras el modal estaba abierto)
   ├─ Si bloqueante: mostrar error con link a corregir el recurso
   └─ Si pasa: continuar
2. Validar config fiscal de empresa (cert vigente, credenciales SOL, ambiente)
   └─ Si falla: error con link a /erp/configuracion/tributario
3. INICIAR TRANSACCIÓN
4. Tomar correlativo (SerieDocumento, lock pesimista, incrementa)
5. Construir snapshot fiscal (SnapshotFiscalService)
6. Crear Comprobante en estado PENDIENTE_ENVIO con operationId nuevo
7. Crear ComprobanteSnapshot
8. Actualizar Venta.estadoFacturacion = EN_EMISION
9. Crear ComprobanteEnvioLog (evento ENCOLADO)
10. COMMIT TRANSACCIÓN
11. Publicar evento `comprobante.creado` → encola job en BullMQ
12. Cerrar modal, mostrar toast "Comprobante encolado: F001-00000123"
13. Redirigir a /erp/comprobantes/:id (vista detalle)
```

**Importante**: pasos 4-10 son atómicos. Si falla cualquier paso intermedio, ROLLBACK y el correlativo no se quema.

Si falla el paso 11 (encolar) después del commit: el comprobante queda en `PENDIENTE_ENVIO` y un sweeper periódico lo encola.

---

## 4. Flujo en POS — Emisión rápida

### Caso de uso

Cliente compra en mostrador, cajero tipea ítems, cobra, imprime ticket. La boleta se emite y se envía a SUNAT en el mismo flujo, sin pasar por bandeja.

### Restricciones (no negociables)

- Solo **boletas**. Las facturas siempre pasan por la bandeja.
- Solo si `ConfigEmpresaFiscal.modalidadEnvioBoletas = INDIVIDUAL`.
- Cajero debe tener permiso `pos:emitir-boleta`.

### Flujo

```
1. Cajero arma carrito en POS
2. Click "Cobrar"
3. Modal de cobro: forma de pago, monto recibido, vuelto
4. Si monto < S/ 700: receptor = consumidor final por defecto
   Si monto ≥ S/ 700: pedir DNI/CE obligatorio
5. Click "Cobrar y emitir"
6. INICIAR TRANSACCIÓN
   ├─ Crear venta en estadoComercial = ENTREGADA, estadoFacturacion = EN_EMISION
   ├─ Tomar correlativo de boleta
   ├─ Crear Comprobante PENDIENTE_ENVIO
   ├─ Crear snapshot
   ├─ Registrar en caja, descontar stock
   └─ COMMIT
7. Publicar evento → encola
8. Imprimir ticket (PDF placeholder mientras llega CDR)
9. Mostrar pantalla "Enviado a SUNAT, recibirás CDR en breve"

[En paralelo, worker procesa]
   ├─ Si ACEPTADO: notificación a cajero "Boleta aceptada"
   └─ Si RECHAZADO: notificación al facturador (no al cajero, que ya está con otro cliente)
```

### Manejo de rechazos en POS

Si la boleta es rechazada:
- El cajero NO se entera en tiempo real.
- El facturador la ve en su bandeja con badge rojo.
- Si requiere acción del cajero (datos del cliente mal tipeados), el facturador contacta al vendedor.

---

## 5. Vista de detalle del comprobante

`/erp/comprobantes/:id`

```
┌─────────────────────────────────────────────────────────────────┐
│ Factura F001-00000123                                  [✓ ACEPTADO] │
│ Emitida el 2026-05-05 14:30                                     │
│                                                                  │
│ Receptor: EMPRESA SAC (RUC 20987654321)                         │
│ Total: S/ 1,180.00                                              │
│                                                                  │
│ ┌─ Acciones ────────────────────────────────────────────────┐  │
│ │  [Descargar XML] [Descargar CDR] [Descargar PDF]          │  │
│ │  [Reenviar al receptor por correo]                        │  │
│ │  [Comunicar baja]  (solo si ACEPTADO y < 7 días)          │  │
│ │  [Generar Nota de Crédito]                                │  │
│ │  [Generar Nota de Débito]                                 │  │
│ │  [Ver venta asociada]                                     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌─ Tabs ──────────────────────────────────────────────────────┐ │
│ │ [Detalle] [Snapshot fiscal] [Logs SUNAT] [Vinculadas]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ (contenido según tab)                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Tab "Logs SUNAT"

Muestra el historial completo de `ComprobanteEnvioLog` para este comprobante. Cada fila:

| Fecha | Evento | Intento | Endpoint | Código | Mensaje | Duración |
|---|---|---|---|---|---|---|
| 14:30:01 | ENCOLADO | 1 | — | — | — | — |
| 14:30:03 | ENVIO_INICIADO | 1 | sendBill | — | — | — |
| 14:30:08 | CDR_RECIBIDO | 1 | sendBill | 0 | Comprobante aceptado | 5247ms |

### Tab "Vinculadas"

Muestra:
- Comprobante origen (si este es NC/ND).
- NCs y NDs emitidas a partir de este (si las hay).
- Comunicación de baja asociada (si aplica).

---

## 6. Reglas de transición — tabla maestra

| Acción | Precondición Comprobante | Precondición Venta | Resultado Comprobante | Resultado Venta |
|---|---|---|---|---|
| Crear comprobante | — | `estadoComercial ∈ {ORDEN_CONFIRMADA, ENTREGADA}` y `estadoFacturacion = SIN_COMPROBANTE` | nuevo `PENDIENTE_ENVIO` | `estadoFacturacion = EN_EMISION` |
| Procesar (worker → SUNAT) | `PENDIENTE_ENVIO` | — | `EN_PROCESO_SUNAT` | sin cambio |
| CDR aceptado | `EN_PROCESO_SUNAT` | — | `ACEPTADO` | `estadoFacturacion = EMITIDA` |
| CDR aceptado con obs | `EN_PROCESO_SUNAT` | — | `ACEPTADO_CON_OBS` | `estadoFacturacion = EMITIDA_CON_OBS` |
| CDR rechazado (recuperable) | `EN_PROCESO_SUNAT` | — | `RECHAZADO` | `estadoFacturacion = RECHAZADA` |
| Reintentar envío | `RECHAZADO` y dentro de plazo | — | `PENDIENTE_ENVIO` | `estadoFacturacion = EN_EMISION` |
| Marcar revisión manual | tras N reintentos fallidos | — | `REQUIERE_REVISION` | sin cambio |
| Iniciar comunicación de baja (factura) | `ACEPTADO` o `ACEPTADO_CON_OBS`, < 7 días, tipo `FACTURA` o NC/ND vinculada a factura | — | `BAJA_PENDIENTE` | sin cambio |
| Baja aceptada | `BAJA_PENDIENTE` | — | `ANULADO` | `estadoFacturacion = ANULADA_FISCAL` |
| Anular boleta vía NC | NC con motivo `01` por monto total se acepta | — | sin cambio en boleta (sigue `ACEPTADO`) | `estadoFacturacion = ANULADA_FISCAL` |
| Emitir NC regular | comprobante origen `ACEPTADO` o `ACEPTADO_CON_OBS` | — | nuevo `PENDIENTE_ENVIO` (NC) | sin cambio (a menos que NC sea por total) |
| Emitir NC excepcional | comprobante origen `ACEPTADO` o `ACEPTADO_CON_OBS`, < 10 días hábiles, motivo `01` o `02` | — | nuevo `PENDIENTE_ENVIO` con `esExcepcional=true` | sin cambio |
| Cancelar venta | — | `estadoFacturacion ∈ {SIN_COMPROBANTE, ANULADA_FISCAL}` | — | `estadoComercial = CANCELADA`, reverso completo |

### Reglas que NO son válidas (errores de programador)

- ❌ Crear comprobante para venta `CANCELADA`.
- ❌ Crear comprobante para venta con `estadoFacturacion ≠ SIN_COMPROBANTE`.
- ❌ Cambiar `Comprobante.estado` directamente desde la UI sin pasar por el worker SUNAT.
- ❌ Emitir NC sobre comprobante `RECHAZADO` (no existe ante SUNAT).
- ❌ Marcar venta `FACTURADA` (este estado ya no existe).

---

## 7. UI: badges de estado

### En lista de ventas

| Estado comercial | Estado facturación | Badge a mostrar |
|---|---|---|
| ORDEN_CONFIRMADA | SIN_COMPROBANTE | "Confirmada" + "Sin comprobante" (gris) |
| ORDEN_CONFIRMADA | EN_EMISION | "Confirmada" + "Emitiendo..." (azul) |
| ENTREGADA | EMITIDA | "Entregada" + "Facturada ✓" (verde) |
| ENTREGADA | EMITIDA_CON_OBS | "Entregada" + "Facturada ⚠" (amarillo) |
| ENTREGADA | RECHAZADA | "Entregada" + "Rechazada por SUNAT ✕" (rojo) |
| CANCELADA | ANULADA_FISCAL | "Cancelada" + "Anulada fiscal" (gris oscuro) |

### En lista de comprobantes

| Estado comprobante | Badge |
|---|---|
| PENDIENTE_ENVIO | "Pendiente" (gris) |
| EN_PROCESO_SUNAT | "Procesando..." (azul, con spinner) |
| ACEPTADO | "Aceptado" (verde) |
| ACEPTADO_CON_OBS | "Aceptado con observaciones" (amarillo) |
| RECHAZADO | "Rechazado" (rojo) |
| REQUIERE_REVISION | "Requiere revisión" (rojo, parpadea) |
| BAJA_PENDIENTE | "Baja en proceso..." (azul) |
| ANULADO | "Anulado" (gris oscuro) |

---

## 8. Notificaciones al usuario

| Evento | Destinatario | Canal |
|---|---|---|
| Comprobante aceptado (POS) | Cajero | Toast in-app |
| Comprobante rechazado | Facturador | In-app + email |
| Comprobante requiere revisión | Facturador + Admin tributario | In-app + email + (opcional) Slack |
| Comprobante con plazo a vencer < 30 min | Facturador | In-app + email |
| Comunicación de baja aceptada | Facturador | In-app |
| Certificado por vencer (< 30 días) | Admin tributario | Email semanal |
| Certificado vencido | Admin tributario | Email diario hasta renovar; bloquear emisión nueva |

---

## 9. Tareas

- [ ] Crear ruta `/erp/comprobantes` con tabs definidos
- [ ] Implementar bandeja "Por emitir" con filtros
- [ ] Implementar modal de emisión con pipeline completo
- [ ] Implementar vista de detalle de comprobante con tabs (detalle, snapshot, logs, vinculadas)
- [ ] Agregar botón "Emitir directo" en venta (opcional)
- [ ] Implementar emisión rápida en POS (solo boletas)
- [ ] Implementar badges duales en lista de ventas
- [ ] Implementar sistema de notificaciones según tabla §8
- [ ] Migrar URLs antiguas `/erp/ventas/facturacion` → redirect a `/erp/comprobantes`
