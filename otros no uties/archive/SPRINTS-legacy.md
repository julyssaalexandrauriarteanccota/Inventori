# SPRINTS.md — Plan de desarrollo ERP · Fotocopiadoras

> Orden estricto: cada sprint depende del anterior.
> No avanzar al siguiente hasta tener el actual funcionando y probado.
> Duración estimada por sprint: 3–7 días dependiendo del ritmo con agentes IA.

---

## Fase 1 — Backend núcleo (API · NestJS)

### Sprint 1 · Infraestructura base y autenticación
**Objetivo**: el sistema tiene login, JWT y roles funcionando. Sin esto nada más funciona.

Tareas `apps/api/`:
- [ ] `common/` completo: guards, decorators, filters, interceptors, tipos
  - [ ] `jwt-auth.guard.ts`
  - [ ] `roles.guard.ts`
  - [ ] `current-user.decorator.ts` — `@CurrentUser()`
  - [ ] `roles.decorator.ts` — `@Roles()`
  - [ ] `public.decorator.ts` — `@Public()`
  - [ ] `http-exception.filter.ts` — formato estándar de errores
  - [ ] `transform.interceptor.ts` — envuelve todas las respuestas en `{data, meta}`
  - [ ] `logging.interceptor.ts`
  - [ ] `PaginatedResponse<T>` en `common/types/`
- [ ] `database/prisma.service.ts` — singleton, se inyecta en todos los módulos
- [ ] `modules/auth/` completo
  - [ ] `POST /api/v1/auth/login` — devuelve access token + refresh token
  - [ ] `POST /api/v1/auth/refresh` — renueva access token con refresh token
  - [ ] `POST /api/v1/auth/logout`
  - [ ] `GET  /api/v1/auth/me` — retorna el usuario autenticado actual
- [ ] `modules/usuarios/` completo
  - [ ] CRUD completo con paginación
  - [ ] Cambio de contraseña (requiere contraseña actual)
  - [ ] Solo ADMIN puede crear/editar/eliminar usuarios
  - [ ] Hash con bcryptjs — nunca guardar contraseña en texto plano
- [ ] Seed inicial: crear usuario ADMIN por defecto en `prisma/seed.ts`
- [ ] Swagger configurado en `main.ts`

Verificación:
```bash
POST /api/v1/auth/login  → devuelve token
GET  /api/v1/auth/me     → devuelve usuario con rol
GET  /api/v1/usuarios    → solo accesible con ADMIN
```

---

### Sprint 2 · Clientes, Proveedores y Catálogo base
**Objetivo**: los datos maestros del negocio están completos.

Tareas `apps/api/`:
- [ ] `modules/clientes/`
  - [ ] CRUD con paginación y filtros (tipo, búsqueda por nombre/DNI/RUC)
  - [ ] `GET /clientes/:id/equipos` — equipos del cliente
  - [ ] `GET /clientes/:id/tickets` — tickets del cliente
  - [ ] `POST /clientes/:id/contactos` — registrar interacción CRM
  - [ ] Validación: si tipo=NATURAL requiere DNI, si tipo=EMPRESA requiere RUC
- [ ] `modules/proveedores/`
  - [ ] CRUD con paginación
  - [ ] `GET /proveedores/:id/productos` — productos que provee
- [ ] `modules/productos/`
  - [ ] Gestión de Categorías (árbol padre/hijo)
  - [ ] Gestión de Marcas
  - [ ] CRUD de Productos con paginación y filtros
  - [ ] `POST /productos/:id/proveedores` — vincular proveedor con precio
  - [ ] `POST /productos/compatibilidades` — registrar repuesto compatible con modelo
  - [ ] `GET  /productos/:id/compatibilidades`
  - [ ] Validación: si `tieneNumeroSerie=true` → categoría debe ser impresora/fotocopiadora

Verificación:
```bash
POST /api/v1/clientes          → crea cliente natural con DNI
POST /api/v1/productos         → crea producto con categoría y marca
GET  /api/v1/productos?search=bizhub → búsqueda funciona
```

---

### Sprint 3 · Inventario y movimientos de stock
**Objetivo**: el stock se controla correctamente, nunca se modifica directo.

Tareas `apps/api/`:
- [ ] `modules/inventario/`
  - [ ] Gestión de Almacenes (CRUD)
  - [ ] `GET  /inventario/stock` — stock actual por producto (con filtros de almacén)
  - [ ] `GET  /inventario/stock/:productoId` — stock de un producto en todos los almacenes
  - [ ] `POST /inventario/movimientos` — registrar cualquier movimiento
    - Valida que TECNICO solo puede hacer `CONSUMO_SOPORTE`
    - Valida que `AJUSTE_*` requiere campo `justificacion`
    - Actualiza `AlmacenStock` automáticamente
    - Valida que no quede stock negativo (salvo config especial)
  - [ ] `GET  /inventario/movimientos` — historial con filtros y paginación
  - [ ] `GET  /inventario/alertas` — productos en o por debajo del stock mínimo
  - [ ] Transferencia entre almacenes genera dos movimientos (salida + entrada)

Verificación:
```bash
GET  /api/v1/inventario/stock             → lista con cantidades
POST /api/v1/inventario/movimientos       → crea movimiento y actualiza stock
GET  /api/v1/inventario/alertas           → productos bajo mínimo
```

---

### Sprint 4 · Equipos y garantías
**Objetivo**: el digital twin de cada equipo existe. Las garantías se pueden consultar públicamente.

Tareas `apps/api/`:
- [ ] `modules/equipos/` (dentro de productos o módulo propio)
  - [ ] `POST /equipos` — registrar equipo con número de serie
  - [ ] `GET  /equipos/:serie` — ficha completa del equipo (producto, cliente actual, garantía, tickets)
  - [ ] `POST /equipos/:serie/asignar-cliente` — asignar equipo a cliente (cierra registro anterior)
  - [ ] `GET  /equipos/:serie/historial` — todos los clientes que tuvo el equipo
- [ ] `modules/garantias/`
  - [ ] `POST /garantias` — crear garantía para un equipo
  - [ ] `GET  /garantias/:id`
  - [ ] `GET  /garantias/verificar/:codigoQR` — **`@Public()`** — consulta sin login
  - [ ] `POST /garantias/:id/casos` — registrar caso de garantía
  - [ ] `PATCH /garantias/:id/casos/:casoId` — resolver caso (aceptar/rechazar)
  - [ ] Auto-generar garantía al confirmar venta de equipo serializado

Verificación:
```bash
GET /api/v1/garantias/verificar/UUID  → accesible sin JWT, retorna estado
POST /api/v1/equipos                  → registra equipo con serie
GET  /api/v1/equipos/SERIE            → ficha completa del equipo
```

---

### Sprint 5 · Compras
**Objetivo**: el ciclo completo de compra a proveedor funciona.

Tareas `apps/api/`:
- [ ] `modules/compras/`
  - [ ] CRUD de Órdenes de Compra con detalles
  - [ ] `PATCH /compras/:id/aprobar` — solo ADMIN/ENCARGADO, cambia estado a APROBADA
  - [ ] `POST  /compras/:id/recepciones` — recepción total o parcial
    - Al recibir: crea `MovimientoStock` tipo `COMPRA_RECIBIDA` por cada producto
    - Actualiza `cantidadRecibida` en cada detalle
    - Si todos los detalles están completos → estado `RECIBIDA_TOTAL`
    - Si parcial → estado `RECIBIDA_PARCIAL`
  - [ ] `GET   /compras` — listado con filtros por estado y proveedor
  - [ ] `GET   /compras/:id` — detalle con recepciones

Verificación:
```bash
POST /api/v1/compras                    → crea OC en estado BORRADOR
PATCH /api/v1/compras/:id/aprobar       → cambia a APROBADA
POST /api/v1/compras/:id/recepciones    → recibe y mueve stock
GET  /api/v1/inventario/stock           → stock aumentó correctamente
```

---

### Sprint 6 · Ventas y cotizaciones
**Objetivo**: el flujo de cotización → orden confirmada → facturada funciona.

Tareas `apps/api/`:
- [ ] `modules/ventas/`
  - [ ] `POST /ventas` — crear cotización
  - [ ] `PATCH /ventas/:id` — editar mientras es COTIZACION
  - [ ] `PATCH /ventas/:id/confirmar` — COTIZACION → ORDEN_CONFIRMADA, descuenta stock
  - [ ] `PATCH /ventas/:id/entregar` — FACTURADA → ENTREGADA
    - Si el detalle tiene equipo serializado: crea `EquipoCliente` asignando al cliente
    - Si el producto genera garantía: crea `Garantia` automáticamente
  - [ ] `GET   /ventas` — listado con filtros por estado, cliente, fechas
  - [ ] `GET   /ventas/:id` — detalle completo
  - [ ] Lógica de precios: validar que precioUnitario ≥ precioMinimo del producto

Verificación:
```bash
POST /api/v1/ventas                     → crea cotización
PATCH /api/v1/ventas/:id/confirmar      → confirma y descuenta stock
GET  /api/v1/inventario/stock           → stock bajó correctamente
```

---

### Sprint 7 · Facturación SUNAT (Nubefact)
**Objetivo**: emitir facturas y boletas de forma async y segura.

Tareas `apps/api/`:
- [ ] `modules/facturacion/`
  - [ ] `POST /facturacion/emitir/:ventaId` — inicia el proceso (solo crea registro PENDIENTE + encola)
    - Valida que la venta esté en ORDEN_CONFIRMADA
    - Genera número de comprobante (serie + correlativo desde `ConfigEmpresa`)
    - Incrementa correlativo en `ConfigEmpresa` (transacción atómica)
    - Crea `Comprobante` en estado PENDIENTE
    - Encola job en BullMQ
  - [ ] `queues/ocr.processor.ts` → `queues/sunat.processor.ts`
    - Llama a Nubefact API
    - Guarda CDR
    - Actualiza estado a ACEPTADO o RECHAZADO
    - Si falla: reintenta hasta 3 veces con backoff exponencial
  - [ ] `GET  /facturacion/comprobantes` — listado con filtros
  - [ ] `GET  /facturacion/comprobantes/:id` — detalle + CDR
  - [ ] `GET  /facturacion/comprobantes/:id/pdf` — URL del PDF
  - [ ] `POST /facturacion/notas-credito` — solo ADMIN
  - [ ] `GET  /facturacion/config` — ver config de empresa y series
  - [ ] `PATCH /facturacion/config` — solo ADMIN, editar config

Verificación:
```bash
POST /api/v1/facturacion/emitir/:ventaId  → crea PENDIENTE, encola job
# Esperar el job → comprobante pasa a ACEPTADO
GET  /api/v1/facturacion/comprobantes/:id → muestra CDR y hash
```

---

### Sprint 8 · Soporte técnico (Tickets)
**Objetivo**: el flujo completo de ticket de soporte funciona con historial y adjuntos.

Tareas `apps/api/`:
- [ ] `modules/soporte/`
  - [ ] `POST /soporte/tickets` — crear ticket
    - Auto-asignar código: `TKT-2025-0001`
    - Crear primera entrada en `HistorialTicket`
  - [ ] `GET  /soporte/tickets` — listado con filtros (estado, técnico, cliente, prioridad, fechas)
  - [ ] `GET  /soporte/tickets/:id` — ficha completa con historial y detalles
  - [ ] `PATCH /soporte/tickets/:id` — actualizar campos (estado, técnico, diagnóstico)
    - Cada cambio de estado/técnico/prioridad genera entrada en `HistorialTicket`
  - [ ] `POST /soporte/tickets/:id/repuestos` — registrar repuesto usado
    - Crea `DetalleTicket`
    - Crea `MovimientoStock` tipo `CONSUMO_SOPORTE`
  - [ ] `POST /soporte/tickets/:id/adjuntos` — subir fotos/documentos
  - [ ] `PATCH /soporte/tickets/:id/cerrar` — cierre con firma y geolocalización
  - [ ] `GET  /soporte/tickets/:codigo/publico` — **`@Public()`** — seguimiento sin login
  - [ ] Cálculo de `montoTotal` al cerrar: mano de obra + repuestos

Verificación:
```bash
POST /api/v1/soporte/tickets              → crea ticket con código TKT-XXXX
PATCH /api/v1/soporte/tickets/:id         → cambia estado, genera historial
GET  /api/v1/soporte/tickets/TKT-0001/publico  → accesible sin JWT
```

---

### Sprint 9 · Configuración y reportes básicos
**Objetivo**: la empresa puede configurarse y ver sus números.

Tareas `apps/api/`:
- [ ] `modules/reportes/`
  - [ ] `GET /reportes/ventas` — ventas por período (día/semana/mes), total e IGV
  - [ ] `GET /reportes/stock` — stock actual, alertas, movimientos del período
  - [ ] `GET /reportes/tickets` — tickets por estado, técnico, tiempo de resolución
  - [ ] `GET /reportes/clientes` — clientes nuevos del período, top clientes
  - [ ] `GET /reportes/dashboard` — todos los KPIs en una sola llamada para el dashboard
- [ ] `modules/config/` — solo ADMIN
  - [ ] `GET  /config/empresa` — datos de la empresa
  - [ ] `PATCH /config/empresa` — editar datos y logo
  - [ ] `GET  /config/series` — series de documentos SUNAT
  - [ ] `PATCH /config/series` — editar series (con advertencia: afecta correlativos)

---

## Fase 2 — Frontend ERP (apps/web · Next.js 15)

### Sprint 10 · Layout, auth y estructura base del ERP
**Objetivo**: el ERP tiene login y el shell de navegación completo.

Tareas `apps/web/`:
- [ ] `lib/api.ts` — cliente fetch base con JWT header automático y refresh automático
- [ ] `hooks/use-auth.ts` — estado de sesión global con Zustand
- [ ] `app/auth/login/page.tsx` — página de login
- [ ] `app/(erp)/layout.tsx` — layout del ERP
  - [ ] `Sidebar.tsx` — navegación con todos los módulos, colapsa en mobile
  - [ ] `Header.tsx` — nombre de usuario, rol, logout
  - [ ] Redirección automática si no hay token
- [ ] Componentes base de shadcn instalados:
  - [ ] Button, Input, Label, Card, Badge, Avatar
  - [ ] Table, Dialog, Sheet, Dropdown
  - [ ] Form (react-hook-form integration)
  - [ ] Sonner (toasts para feedback)
- [ ] `components/tables/DataTable.tsx` — tabla genérica reutilizable con TanStack Table
  - [ ] Paginación, búsqueda, filtros por columna
  - [ ] Skeleton loader mientras carga
- [ ] `components/forms/` — formularios base reutilizables

---

### Sprint 11 · Módulos core del ERP (frontend)
**Objetivo**: los módulos más usados en el día a día tienen UI completa.

Tareas por módulo (mismo patrón en cada uno):
- [ ] Página de lista con DataTable, búsqueda y filtros
- [ ] Página de detalle / ficha completa
- [ ] Modal o drawer para crear/editar
- [ ] Confirmación para eliminar (soft delete)

Módulos en este sprint:
- [ ] `(erp)/clientes/` — lista, ficha con equipos y tickets del cliente, form
- [ ] `(erp)/productos/` — lista con filtros por categoría/marca, ficha, form con imagen
- [ ] `(erp)/inventario/`
  - [ ] Vista de stock actual con alertas resaltadas
  - [ ] Formulario de registro de movimiento (con validación de rol TECNICO)
  - [ ] Historial de movimientos con filtros
- [ ] `(erp)/soporte/`
  - [ ] Kanban o lista de tickets con filtros por estado/técnico/prioridad
  - [ ] Ficha de ticket con historial visual, repuestos usados, adjuntos
  - [ ] Formulario de creación rápida de ticket
  - [ ] Modal de cierre con área de firma digital (signature_pad)

---

### Sprint 12 · Módulos secundarios (frontend)
- [ ] `(erp)/ventas/` — cotizaciones y órdenes, flujo cotización → confirmar → facturar
- [ ] `(erp)/compras/` — órdenes de compra y recepciones
- [ ] `(erp)/garantias/` — lista, detalle, casos
- [ ] `(erp)/proveedores/` — lista y ficha
- [ ] `(erp)/reportes/` — gráficos con Recharts
- [ ] `(erp)/dashboard/` — KPIs en tiempo real, alertas de stock, tickets abiertos

---

## Fase 3 — Sitio público (apps/web · Next.js 15 SSR)

### Sprint 13 · Sitio público completo
**Objetivo**: cualquier persona puede llegar al sitio, ver el catálogo y consultar su garantía.

Tareas `apps/web/app/(public)/`:
- [ ] `page.tsx` — home con hero, servicios destacados, CTA contacto
- [ ] `catalogo/page.tsx` — catálogo con filtros por categoría/marca, paginación SSR
- [ ] `catalogo/[sku]/page.tsx` — ficha de producto con fotos y especificaciones
- [ ] `garantia/page.tsx` — formulario de consulta por número de serie o DNI
- [ ] `garantia/[codigoQR]/page.tsx` — resultado de la consulta con estado y cobertura
- [ ] `ticket/page.tsx` — formulario para consultar estado de ticket por código
- [ ] `contacto/page.tsx` — datos de contacto, mapa, botón WhatsApp, formulario de solicitud
- [ ] SEO: metadata, Open Graph, sitemap.xml, robots.txt
- [ ] `layout.tsx` — header y footer del sitio público

---

## Fase 4 — Tiempo real, AI y PWA

### Sprint 14 · WebSockets y notificaciones en tiempo real
- [ ] `websockets/events.gateway.ts` en NestJS — room por usuario/rol
- [ ] Eventos a emitir: `ticket.created`, `stock.alerta`, `comprobante.aceptado`, `comprobante.rechazado`
- [ ] `hooks/use-socket.ts` en Next.js — conecta y escucha eventos
- [ ] Toast + badge de notificaciones en el Header del ERP
- [ ] Contador de tickets abiertos en el sidebar se actualiza en tiempo real

---

### Sprint 15 · Servicio AI — OCR y clasificación
- [ ] `apps/ai/` configurado y corriendo en Docker
- [ ] `POST /ocr/invoice` — OCR de facturas de proveedores con Claude Vision
  - NestJS llama al endpoint cuando se sube una factura en el módulo de compras
  - Devuelve campos pre-llenados: proveedor, RUC, items, totales
- [ ] `POST /clasificar/ticket` — clasificación automática al crear un ticket
  - Asigna prioridad, tipo de falla, sugiere técnico
  - NestJS llama al endpoint al crear el ticket
- [ ] UI: botón "Escanear factura" en módulo de compras que activa el OCR
- [ ] UI: indicador de "clasificación automática aplicada" en el formulario de ticket

---

### Sprint 16 · PWA offline para técnicos
- [ ] `next.config.ts` — configurar next-pwa con Service Worker
- [ ] `hooks/use-offline-sync.ts` — detecta estado de red, cola peticiones offline
- [ ] Datos que se cachean offline: ticket asignado al técnico, ficha del cliente, ficha del equipo, catálogo de repuestos
- [ ] Formulario de cierre de ticket funciona offline:
  - Captura diagnóstico, solución, repuestos usados, firma, foto
  - Guarda en IndexedDB
  - Al recuperar conexión: sincroniza automáticamente
- [ ] Banner de estado "Sin conexión — los datos se sincronizarán al volver a conectar"

---

## Fase 5 — Calidad y despliegue

### Sprint 17 · Certificados QR y emails transaccionales
- [ ] Al crear una garantía: generar PDF con datos del equipo + QR que apunta a `/garantia/[codigoQR]`
- [ ] Al emitir comprobante ACEPTADO: enviar email al cliente con PDF adjunto
- [ ] Al cerrar ticket: enviar email de resumen al cliente
- [ ] Al crear ticket: enviar WhatsApp al técnico asignado (si tiene número registrado)

---

### Sprint 18 · Testing y hardening
- [ ] Tests de integración para los endpoints críticos:
  - [ ] Flujo completo de autenticación
  - [ ] Emisión de comprobante SUNAT (mock de Nubefact)
  - [ ] Movimiento de stock no queda negativo
  - [ ] Roles: TECNICO no puede hacer ajuste de inventario
- [ ] Validar que todos los endpoints protegidos devuelven 401 sin JWT
- [ ] Validar que el QR de garantía funciona sin login
- [ ] Revisar índices de PostgreSQL — `EXPLAIN ANALYZE` en queries lentas
- [ ] Variables de entorno validadas con Zod en ambos servicios

---

### Sprint 19 · Despliegue producción
- [ ] Dockerfiles de producción (multi-stage builds, imagen mínima)
- [ ] `docker-compose.prod.yml` — sin volúmenes de código, con imágenes construidas
- [ ] Configurar servidor (VPS mínimo: 2 vCPU, 4GB RAM, 50GB SSD)
- [ ] Nginx como reverse proxy: puerto 80/443 → web:3000 y api:4000
- [ ] SSL con Certbot (Let's Encrypt)
- [ ] Backups automáticos de PostgreSQL a S3 o similar
- [ ] `prisma migrate deploy` en producción (no `migrate dev`)
- [ ] Monitoreo básico: uptime, logs centralizados

---

## Resumen de fases y sprints

| Sprint | Módulo | Fase | Depende de |
|--------|--------|------|------------|
| 1 | Auth + Usuarios + Common | Backend | — |
| 2 | Clientes + Proveedores + Productos | Backend | S1 |
| 3 | Inventario | Backend | S2 |
| 4 | Equipos + Garantías | Backend | S2, S3 |
| 5 | Compras | Backend | S3 |
| 6 | Ventas | Backend | S2, S3, S4 |
| 7 | Facturación SUNAT | Backend | S6 |
| 8 | Soporte Técnico | Backend | S2, S3, S4 |
| 9 | Config + Reportes | Backend | S1–S8 |
| 10 | Layout + Auth frontend | Frontend | S1 |
| 11 | Módulos core frontend | Frontend | S10, S2–S8 |
| 12 | Módulos secundarios frontend | Frontend | S10, S11 |
| 13 | Sitio público | Frontend | S2, S4, S8 |
| 14 | WebSockets | Tiempo real | S10, S8 |
| 15 | AI · OCR + clasificación | AI | S5, S8 |
| 16 | PWA offline | PWA | S11, S8 |
| 17 | QR + Emails | Integración | S4, S7, S8 |
| 18 | Testing | QA | S1–S17 |
| 19 | Despliegue | Deploy | S18 |

---

*Total: 19 sprints · ~3 meses a ritmo normal · ~6–8 semanas con agentes IA acelerando*
