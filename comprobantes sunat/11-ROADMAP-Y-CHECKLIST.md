# 11 — Roadmap y Checklist consolidado

> **Pre-requisito de lectura**: todos los documentos anteriores.

Plan de ejecución por fases. Cada tarea apunta al documento donde está el detalle. **No saltarse el orden** — las fases se construyen unas sobre otras.

---

## Resumen de fases

| Fase | Objetivo | Bloquea producción |
|---|---|---|
| 0 | Limpieza previa y preparación | — |
| 1 | Corrección de fundamentos (estados, idempotencia, almacenamiento) | Sí |
| 2 | Hub de Comprobantes (Patrón B) | Sí |
| 3 | Comunicación de baja real | Sí |
| 4 | Notas (NC regular, NC excepcional, ND) | No |
| 5 | Portal cliente y operaciones | Sí (legal) |
| 6 | Mejoras y métricas | No |
| 7 | (Futuro) Resumen diario, guías, retenciones | No |

---

## Fase 0 — Limpieza previa y preparación

> Tareas para dejar el terreno listo. Pueden hacerse en paralelo.

### Tareas

- [x] Búsqueda global del repo: `Nubefact | nubefact | NUBEFACT`.
  - 2026-05-09: no quedan referencias en código ejecutable ni `.env.example`.
  - Hitos documentales históricos preservados: `docs/facturacion-sunat-roadmap.md`, `docs/handoff-arquitectura-escalable.md`, `docs/seguimiento-arquitectura-escalable.md`, `docs/sunat-beta-checklist.md`.
- [x] Eliminar configuración muerta de proveedor fiscal externo (env vars, factories, código no usado). Ver `02-PROBLEMAS-DETECTADOS.md` (P4).
- [x] Reemplazar menciones legacy en READMEs por: "Emisión directa a SUNAT vía SOAP. Ver `06-COLA-SUNAT.md`."
- [~] Backup completo de la BD de producción. No aplica en este workspace local; ejecutar como paso operativo antes de deploy.
- [~] Backup completo de XML/CDR actuales (export a archivos antes de migrar). No aplica en este workspace local; `backfill-storage.ts` queda disponible para ejecución operativa.
- [x] Crear `.env.example` con todas las variables nuevas que se van a introducir (`MINIO_*`, `FISCAL_MASTER_KEY_BASE64`, etc.).
- [x] Documentar el ambiente de desarrollo local en `README.md` raíz: cómo levantar el stack completo (BD, Redis para BullMQ, MinIO).
- [~] Crear ramas de trabajo en git: una por fase, mergeables a main por feature flag. No aplica: este workspace no tiene metadata `.git`.

---

## Fase 1 — Corrección de fundamentos

> **Objetivo**: arreglar lo que está mal en BD y workers antes de tocar UI. Lo hacemos primero porque es lo que más bloquea.

### 1.1. Refactor de estados de Venta (P1)

Documentos: `02-PROBLEMAS-DETECTADOS.md` §P1, `04-MODELO-DATOS.md` §2.

- [ ] Crear migración: agregar columna `estadoFacturacion` (enum nuevo) a `Venta` con default `SIN_COMPROBANTE`.
- [ ] Crear migración: renombrar columna `estado` a `estadoComercial` en `Venta`.
- [ ] Eliminar valor `FACTURADA` del enum `EstadoComercialVenta`.
- [ ] Script de backfill: para cada venta, calcular `estadoFacturacion` a partir del `Comprobante` actual.
- [ ] Script de backfill: para ventas con `estado = FACTURADA`, mover a `estadoComercial = ENTREGADA`.
- [ ] Validar que ningún query/reporte usa `estado = 'FACTURADA'`. Buscar globalmente.
- [ ] Actualizar todos los queries afectados.
- [ ] Implementar listener de eventos `comprobante.aceptado | rechazado | anulado | aceptado_con_obs` que actualiza `Venta.estadoFacturacion`.
- [ ] Tests: ciclo completo venta → comprobante → CDR aceptado → estados correctos en ambas entidades.

### 1.2. Idempotencia y operationId (P6)

Documentos: `02-PROBLEMAS-DETECTADOS.md` §P6, `04-MODELO-DATOS.md` §3, `06-COLA-SUNAT.md` §4.

- [ ] Migración: agregar columna `operationId` (UUID) a `Comprobante`, único.
- [ ] Backfill: generar UUID para todos los comprobantes existentes.
- [ ] En `EmisionComprobanteService`: generar `operationId` al crear el comprobante.
- [ ] En `sunat.processor`: antes de `sendBill`, consultar `ComprobanteEnvioLog` por log previo.
- [ ] Implementar lógica de "estado dudoso" (envío iniciado sin respuesta confirmada).
- [ ] Política de reintentos en BullMQ: 4 intentos con backoff exponencial 3min/9min/27min/81min.
- [ ] Clasificación de errores (recuperable / no recuperable / funcional). Ver `06-COLA-SUNAT.md` §3.
- [ ] Estado nuevo `REQUIERE_REVISION` en `EstadoComprobante`.
- [ ] Tests: simular caída del worker entre `sendBill` y `guardarRespuesta`, verificar que el reintento no duplica.

### 1.3. Almacenamiento MinIO (P3)

Documentos: `02-PROBLEMAS-DETECTADOS.md` §P3, `09-ALMACENAMIENTO-MINIO.md` (todo).

- [ ] Levantar MinIO en docker-compose con volumen persistente.
- [ ] Crear buckets: `cpe-beta`, `cpe-produccion`, `bajas-beta`, `bajas-produccion`, `temp-uploads`.
- [ ] Configurar versionado en buckets de comprobantes y bajas.
- [ ] Configurar object lock compliance mode (6 años) en buckets de producción.
- [ ] Crear usuarios IAM `erp-app` (read/write) y `erp-portal` (read-only).
- [ ] Implementar `StorageService` con interfaz definida en `09-ALMACENAMIENTO-MINIO.md` §4.
- [ ] Implementar `buildStorageKey()` siguiendo §3 del mismo doc.
- [ ] Migración de BD: agregar columnas `xmlStorageKey`, `cdrStorageKey`, `pdfStorageKey` a `Comprobante`. Mantener las viejas (`xmlContent`, etc.) por ahora.
- [ ] Migración para `ComunicacionBaja`: columnas `xmlStorageKey`, `cdrStorageKey`.
- [ ] Conectar `sunat.processor` para subir XML antes de enviar y CDR al recibir.
- [ ] Conectar `baja.processor` igual.
- [ ] Script `backfill-storage.ts`: subir XML/CDR/PDF existentes a MinIO y guardar las keys.
- [ ] Verificación: `SELECT COUNT(*) FROM Comprobante WHERE xmlContent IS NOT NULL AND xmlStorageKey IS NULL` debe ser 0.
- [ ] Drop de columnas viejas (`xmlContent`, `cdrContent`, `pdfContent`).
- [ ] Configurar backup diario de MinIO con rotación 7d/8s/24m.

### 1.4. Comunicación de baja real (P2)

Documentos: `02-PROBLEMAS-DETECTADOS.md` §P2, `07-COMUNICACION-BAJA.md` (todo).

- [ ] Modelo `ComunicacionBaja` (ver `04-MODELO-DATOS.md` §6).
- [ ] Estado `BAJA_PENDIENTE` agregado al enum `EstadoComprobante`.
- [ ] `BajaService.iniciarBaja(comprobanteId, motivo)` con validaciones.
- [ ] `BajaPayloadBuilder.build()` que genera XML `VoidedDocuments` (ver `07-COMUNICACION-BAJA.md` §3).
- [ ] Numeración correlativa de RA: `RA-YYYYMMDD-NNN`.
- [ ] Worker `baja.processor` que envía RA via `sendSummary` (ver `06-COLA-SUNAT.md` §6).
- [ ] Worker `consulta.processor` que polea `getStatus` con backoff exponencial (`06-COLA-SUNAT.md` §7).
- [ ] Listener de evento `baja.aceptada` que actualiza `Comprobante.estado = ANULADO` y `Venta.estadoFacturacion = ANULADA_FISCAL`.
- [ ] Manejar baja rechazada: revertir comprobante a estado anterior, alertar.
- [ ] Tests: anular factura aceptada, verificar flujo completo hasta CDR de RA aceptado.

### 1.5. Plazos legales y monitor (P10)

Documentos: `06-COLA-SUNAT.md` §5.

- [ ] Función `calcularDeadline(tipo, fechaEmision)` según tabla de plazos.
- [ ] Columna `fechaVencimientoPlazo` en `Comprobante`, calculada al crear.
- [ ] Worker `monitor.plazos` (cron 15 min): lista comprobantes con plazo próximo a vencer.
- [ ] Re-encolar con prioridad alta los `PENDIENTE_ENVIO` próximos a vencer.
- [ ] Forzar consulta de estado los `EN_PROCESO_SUNAT` próximos a vencer.
- [ ] Alertar al facturador los `RECHAZADO` y `REQUIERE_REVISION` próximos a vencer.
- [ ] Worker `monitor.certificado` (cron diario): alerta certificados próximos a vencer.

### 1.6. Modalidad de envío declarada (P7)

Documentos: `02-PROBLEMAS-DETECTADOS.md` §P7, `04-MODELO-DATOS.md` §8 (`ConfigEmpresaFiscal`).

- [ ] Migración: agregar columna `modalidadEnvioBoletas` a `ConfigEmpresaFiscal`, default `INDIVIDUAL`.
- [ ] Validar en `EmisionComprobanteService`: si modalidad ≠ `INDIVIDUAL`, rechazar con mensaje "no implementado en v1".

### Criterio de aceptación de Fase 1

- [ ] Una venta nunca aparece como "facturada" sin CDR aceptado.
- [ ] Un reintento de envío tras caída de worker no duplica en SUNAT.
- [ ] El XML, CDR y PDF de cualquier comprobante están en MinIO, no en BD.
- [ ] Una factura aceptada se puede dar de baja vía RA con CDR de baja aceptado.
- [ ] El sistema alerta antes de que venza un plazo SUNAT.

---

## Fase 2 — Hub de Comprobantes (Patrón B)

> **Objetivo**: trasladar el flujo a `/erp/comprobantes` y separar UI de Ventas. Aquí el usuario empieza a ver cambios.

Documentos: `05-FLUJO-VENTAS-Y-COMPROBANTES.md` (todo).

### 2.1. Estructura de rutas

- [ ] Crear ruta base `/erp/comprobantes` con tabs: Por emitir, Facturas, Boletas, NC, ND, Bajas.
- [ ] Vista detalle `/erp/comprobantes/:id` con sub-tabs (Detalle, Snapshot, Logs SUNAT, Vinculadas).
- [ ] Redirect 301 de `/erp/ventas/facturacion` y `/pos/comprobantes` → `/erp/comprobantes`.

### 2.2. Tab "Por emitir"

- [ ] Query: ventas con `estadoComercial ∈ {ORDEN_CONFIRMADA, ENTREGADA}` y `estadoFacturacion = SIN_COMPROBANTE`.
- [ ] Filtros: rango fecha, cliente, monto, estadoComercial, vendedor.
- [ ] Tabla con columnas: fecha venta, cliente, total, estado venta, acción.
- [ ] Acción "Emitir" → modal de emisión (siguiente sección).

### 2.3. Modal de emisión

- [ ] Selector de tipo (Factura / Boleta) con reglas según cliente (boleta < S/700 puede ser consumidor final).
- [ ] Selector de serie (filtrado por tipo y empresa).
- [ ] Preview del próximo correlativo (sin reservar todavía).
- [ ] Sección "Validaciones" en vivo con bloqueantes y advertencias (ver `10-CONFIGURACION-Y-VALIDACIONES.md` §8).
- [ ] Botón "Validar contra padrón SUNAT" (consulta forzada con cache invalidado).
- [ ] Pipeline al confirmar: validar → tomar correlativo → snapshot → crear comprobante → encolar → redirigir a detalle.
- [ ] Manejo de errores con links directos a corregir el recurso.

### 2.4. Vista detalle del comprobante

- [ ] Header con badge de estado SUNAT.
- [ ] Acciones disponibles según estado (descargar XML/CDR/PDF, reenviar correo, comunicar baja, generar NC, generar ND, ver venta).
- [ ] Tab "Detalle": cliente, líneas, totales.
- [ ] Tab "Snapshot fiscal": JSON colapsable, read-only.
- [ ] Tab "Logs SUNAT": tabla de `ComprobanteEnvioLog` ordenada cronológicamente.
- [ ] Tab "Vinculadas": comprobante origen (si NC/ND), NCs y NDs derivadas, comunicación de baja.

### 2.5. Botón "Emitir directo" en venta

- [ ] En vista de venta, botón habilitado si precondiciones se cumplen.
- [ ] Click redirige a `/erp/comprobantes/por-emitir?ventaId=X` con modal abierto.

### 2.6. Emisión rápida en POS

- [ ] En flujo de cobro POS, opción "Cobrar y emitir".
- [ ] Solo boletas (validar tipo).
- [ ] Si monto ≥ S/ 700: forzar captura de DNI/CE.
- [ ] Pipeline atómico: crear venta + tomar correlativo + crear comprobante + descontar stock + registrar caja.
- [ ] Imprimir ticket placeholder (PDF preliminar).
- [ ] Mostrar pantalla "Enviado a SUNAT, recibirás CDR".
- [ ] Notificación in-app al cajero cuando llegue CDR aceptado.
- [ ] Si rechazado: notificar al facturador (no al cajero).

### 2.7. Badges duales en lista de ventas

- [ ] Componente `BadgeEstadoVenta` que recibe `estadoComercial` y `estadoFacturacion` y renderiza dos badges según tabla en `05-FLUJO-VENTAS-Y-COMPROBANTES.md` §7.

### 2.8. Notificaciones

- [ ] Sistema de notificaciones in-app por rol.
- [ ] Email para casos críticos (rechazo, requiere revisión, certificado por vencer).
- [ ] Tabla según `05-FLUJO-VENTAS-Y-COMPROBANTES.md` §8.

### Criterio de aceptación de Fase 2

- [ ] Un facturador puede ver todas las ventas pendientes de emitir y emitir desde un solo lugar.
- [ ] La validación previa atrapa errores antes de quemar correlativo.
- [ ] El cajero puede emitir boleta rápida desde POS sin pasar por la bandeja.
- [ ] Los logs SUNAT son visibles y rastreables.

---

## Fase 3 — Notas de crédito y débito

> **Objetivo**: completar los flujos fiscales de NC y ND. Crítico para anular boletas.

Documentos: `08-NOTAS-CREDITO-DEBITO.md` (todo).

### 3.1. NC regular

- [ ] `EmisionNotaService.emitirNc(origenId, motivo, lineas)`.
- [ ] `NotaPayloadBuilder.buildCreditNote(snapshot)` → XML UBL `CreditNote`.
- [ ] Validación: suma NCs ≤ monto origen.
- [ ] Validación: una sola NC en proceso por origen.
- [ ] Validación: motivo aplicable al tipo de origen (ej. `04` no en boleta a consumidor final).
- [ ] Modal de emisión de NC con motivos agrupados (regular vs excepcional).
- [ ] Si NC anula totalmente: listener `nc.emitida_total` → `Venta.estadoFacturacion = ANULADA_FISCAL`.

### 3.2. NC excepcional

- [ ] Tabla `FeriadoNacional` con seed inicial.
- [ ] Función `diasHabilesEntre(desde, hasta)` que excluye fines de semana y feriados.
- [ ] Validación: comprobante origen dentro de 10 días hábiles.
- [ ] UI: deshabilitar sección excepcional si plazo vencido con tooltip explicativo.
- [ ] Marca `esExcepcional = true` en el `Comprobante` resultante.

### 3.3. ND

- [ ] `EmisionNotaService.emitirNd(origenId, motivo, lineas)`.
- [ ] `NotaPayloadBuilder.buildDebitNote(snapshot)` → XML UBL `DebitNote`.
- [ ] Motivos del Cat 10 disponibles en dropdown.
- [ ] No tiene tope (ND aumenta, no anula).

### 3.4. Anular boleta vía NC

- [ ] En detalle de boleta aceptada: botón "Anular con NC".
- [ ] Redirige a flujo de NC con motivo `01` precargado y monto total.
- [ ] Plazo: 5 días desde emisión de la boleta (mismo plazo que envío).
- [ ] Después de NC aceptada por monto total: `Venta.estadoFacturacion = ANULADA_FISCAL`.
- [ ] UI: en lista de boletas, badge adicional "Anulada por BC01-..." con link.

### 3.5. UI: vista de notas en detalle del origen

- [ ] Tabla de NCs vinculadas con saldo no acreditado.
- [ ] Tabla de NDs vinculadas.
- [ ] Botón "Generar NC" deshabilitado si saldo = 0.
- [ ] Botón "Generar NC" deshabilitado si hay NC en proceso.

### Criterio de aceptación de Fase 3

- [ ] Una boleta aceptada se puede anular emitiendo NC y la venta refleja el cambio.
- [ ] No se puede emitir NC que exceda el saldo del origen.
- [ ] La sección "excepcional" del modal solo aparece si hay plazo.
- [ ] Las NDs aceptadas aumentan el saldo a cobrar correctamente.

---

## Fase 4 — Configuración tributaria completa

> **Objetivo**: pantalla de configuración robusta con todas las reglas configurables.

Documentos: `10-CONFIGURACION-Y-VALIDACIONES.md` (todo).

### 4.1. Pantalla principal

- [ ] Ruta `/erp/configuracion/tributario` con 6 tabs.
- [ ] Permisos por rol según §10 del doc.

### 4.2. Tabs

- [ ] Tab "Datos fiscales": campos según §2 con validaciones.
- [ ] Tab "Series": CRUD con reglas de §3.
- [ ] Tab "Certificado": upload, listado, alertas, almacenamiento cifrado en MinIO.
- [ ] Tab "Credenciales SOL": almacenamiento cifrado + validación contra SUNAT al guardar.
- [ ] Tab "Validaciones": UI de reglas configurables persistidas en JSON.
- [ ] Tab "Feriados": CRUD + seed inicial de feriados peruanos.

### 4.3. Servicio de validación

- [ ] `ValidacionFiscalService.validar()` con interfaz §7.
- [ ] Implementar todas las reglas obligatorias (§6 tabla 1).
- [ ] Implementar todas las reglas configurables (§6 tabla 2).
- [ ] Cache de 24 h para validaciones contra padrón SUNAT.
- [ ] Conexión con `ClienteValidacionSunatService` existente.

### 4.4. Alertas

- [ ] Cron diario `monitor.certificado`: alerta a 60/30/7 días.
- [ ] Bloqueo de emisión si certificado vencido.

### Criterio de aceptación de Fase 4

- [ ] Un admin tributario puede gestionar todo lo fiscal sin tocar código.
- [ ] Las reglas configurables se aplican sin redeploy.
- [ ] El certificado nunca aparece en logs ni se descarga.

---

## Fase 5 — Portal Cliente

> **Objetivo**: cumplir obligación SUNAT de disponibilidad para el receptor.

Documentos: `09-ALMACENAMIENTO-MINIO.md` §7.

### 5.1. Backend

- [ ] App separada `/portal-cliente` (subdominio recomendado).
- [ ] Endpoints según §7 del doc.
- [ ] Modo C: token directo (Modo B) + formulario público con captcha (Modo A).
- [ ] Generación de `tokenConsulta` al crear cada comprobante.
- [ ] Inclusión del token en QR del PDF y en link del correo.
- [ ] Modelo `PortalAccessLog` con registro de cada acceso.
- [ ] Rate limiting (10/min búsqueda, 60/min descargas).
- [ ] Signed URLs de MinIO con TTL para descargas.

### 5.2. UI

- [ ] Página home con formulario y explicación.
- [ ] Vista del comprobante con datos clave + estado SUNAT + botones de descarga.
- [ ] Diseño responsive (móvil first, los receptores típicamente entran desde móvil).

### 5.3. Envío automático por correo

- [ ] Listener de `comprobante.aceptado` para facturas: envía email con XML+CDR+PDF y link al portal.
- [ ] Plantilla HTML del correo profesional.
- [ ] Manejo de bounces y notificación al facturador.

### 5.4. PDF render

- [ ] `PdfRenderer` con plantillas HTML por tipo (Puppeteer).
- [ ] QR generado con campos según especificación SUNAT.
- [ ] Hash de firma visible en el PDF.
- [ ] Subida automática a MinIO al recibir CDR aceptado.

### Criterio de aceptación de Fase 5

- [ ] Un cliente puede consultar su comprobante con solo el link del correo.
- [ ] La descarga de XML/CDR/PDF funciona y respeta TTL.
- [ ] Cada acceso queda auditado.
- [ ] El PDF cumple con todos los datos obligatorios y QR.

---

## Fase 6 — Mejoras y observabilidad

> **Objetivo**: hacer el sistema operable en producción seria.

### 6.1. Métricas

Documentos: `06-COLA-SUNAT.md` §12.

- [ ] Exponer métricas Prometheus: `cpe_envios_total`, `cpe_envios_duracion_ms`, `cpe_cola_pendientes`, etc.
- [ ] Dashboard Grafana con vistas: cola, errores, plazos, certificado.

### 6.2. Runbooks

- [ ] Documentar qué hacer ante cada tipo de error SUNAT.
- [ ] Documentar plan de disaster recovery (`09-ALMACENAMIENTO-MINIO.md` §9).
- [ ] Documentar cómo rotar certificado sin downtime.
- [ ] Documentar cómo cambiar de ambiente BETA → PRODUCCION.

### 6.3. Tests E2E

- [ ] Suite de tests que emite factura, boleta, NC, ND contra ambiente BETA real.
- [ ] Suite de tests de baja: emite + comunica baja contra BETA.
- [ ] Suite de tests de portal cliente.

### 6.4. Mejoras UX

- [ ] Búsqueda global de comprobantes en hub (por correlativo, RUC, monto).
- [ ] Exportación de listados a CSV/Excel.
- [ ] Vista "Resumen del mes" con totales por tipo y estado.

### Criterio de aceptación de Fase 6

- [ ] El equipo de operaciones tiene runbooks claros para cada tipo de incidente.
- [ ] Las métricas permiten detectar problemas antes de que el usuario los reporte.
- [ ] Los tests E2E corren en CI antes de cada deploy.

---

## Fase 7 — Futuro (no urgente)

Solo si el volumen y necesidades lo justifican.

- [ ] Resumen Diario de Boletas (modalidad alternativa) — solo si volumen > 1000 boletas/día.
- [ ] Guías de Remisión Electrónicas — solo si entras en logística.
- [ ] Comprobantes de Retención y Percepción — solo si tu cliente es agente retenedor/perceptor.
- [ ] OSE como fallback — solo si SUNAT directo da problemas operativos serios.
- [ ] Multi-empresa: soporte para que el ERP gestione varias empresas con sus propias series, certificados y validaciones.

---

## Checklist global de cumplimiento SUNAT

Independiente de fases, esto es lo que el sistema DEBE cumplir antes de operar en PRODUCCION:

- [ ] Plazo de envío codificado por tipo (factura mismo día, boleta 5 días)
- [ ] Modalidad INDIVIDUAL declarada y respetada
- [ ] Comunicación de baja real para facturas (RA + CDR)
- [ ] Anulación de boletas vía NC con motivo `01`
- [ ] Distinción NC regular / NC excepcional con plazo de 10 días hábiles
- [ ] Validación cliente factura: RUC válido + razón social + dirección
- [ ] Validación cliente boleta ≥ S/700: documento identidad obligatorio
- [ ] UBL 2.1 con XSD vigente (28/02/2022)
- [ ] Firma XAdES-BES con SHA-256
- [ ] Almacenamiento mínimo 5 años (compliance mode 6 años en MinIO)
- [ ] Portal de consulta del receptor (mínimo 1 año, nuestro setup cubre 6+)
- [ ] Envío automático del comprobante al receptor por correo (facturas)
- [ ] PDF con QR y hash de firma
- [ ] Logs de auditoría (`ComprobanteEnvioLog`, `PortalAccessLog`)
- [ ] Certificado cifrado server-side con `FISCAL_MASTER_KEY`
- [ ] Credenciales SOL cifradas
- [ ] Series y correlativos consistentes y sin saltos no documentados
- [ ] Idempotencia en envíos (no duplicar ante caídas)

---

## Cómo trabajar con estos documentos

1. **Lee el documento completo** del tema antes de modificar código relacionado. No leas solo el checklist.
2. **Marca la casilla** cuando completes una tarea, con commit y referencia al PR.
3. Si una tarea **no aplica o se decidió no hacer**, marca `- [~]` (tachada) y documenta la razón al lado.
4. Si descubres una tarea **nueva** durante la implementación, agrégala al documento correspondiente Y al roadmap.
5. **Si hay conflicto** entre documentos: gana el más reciente. Avisa para corregir el resto.
6. **No saltes el orden de fases.** Las dependencias están pensadas: Fase 2 asume que Fase 1 está hecha.

---

## Estado actual de fases

| Fase | Estado | Sprint(s) | Hitos clave |
|---|---|---|---|
| 0 — Limpieza | ✅ Completada | 11 | Env vars `NUBEFACT_*` eliminados; menciones en docs históricos preservadas como contexto. |
| 1 — Fundamentos | ✅ Completada | 1-7 | `EstadoFacturacionVenta`, `operationId` + idempotencia, MinIO + `*StorageKey`, `ComunicacionBaja` + RA, plazos legales con monitor. |
| 2 — Hub Comprobantes | ✅ Completada | 5 | Hub `/erp/comprobantes`, modal de emisión, vista detalle con sub-tabs, badges duales. |
| 3 — Notas | ✅ Completada | 8 | NC regular/excepcional, ND, anulación cumulativa de boletas, días hábiles + feriados. |
| 4 — Configuración | ✅ Completada | 10 | `ValidacionFiscalService` con reglas obligatorias y configurables; sub-tab "Reglas" + modal pre-emisión. |
| 5 — Portal Cliente | ✅ Completada | 9 | Modo C (token + formulario), `PortalAccessLog`, rate limiting, PDF con QR + hash de firma, envío automático por correo. |
| 6 — Observabilidad | 🟨 Parcial | 6 | `SunatMonitorService` + `monitor.plazos` + `monitor.certificado` operativos; runbooks/Prometheus aún pendientes. |
| 7 — Futuro | ⬜ Reservado | — | Resumen diario de boletas, guías de remisión, retenciones/percepciones, multi-empresa. |

> **Notas de cierre (sprints 1-11)**
>
> - Cualquier desviación entre lo descrito en el roadmap y la implementación real
>   se documenta en el doc temático correspondiente; el código manda.
> - Doc 11 ya no requiere actualizaciones por sprint: se relee al iniciar Fase 6
>   (observabilidad seria) o Fase 7 (features futuras).
