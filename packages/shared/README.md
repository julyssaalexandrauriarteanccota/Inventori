# packages/shared

Paquete compartido del monorepo.

## Estado

- Paquete: `@erp/shared`
- Tipo: workspace package privado
- Propósito: fuente común de enums, schemas y tipos para `apps/api` y `apps/web`
- Dependencia runtime principal: `zod`

## Estructura de primer nivel

| Ruta | Propósito |
| --- | --- |
| `src/` | Código fuente del paquete |
| `dist/` | Salida de build |
| `node_modules/` | Dependencias locales |
| `package.json` | Entry points, scripts y dependencias |
| `tsconfig.json` | Configuración TypeScript del paquete |

## Comandos

Desde la raíz del repo:

- Build: `pnpm --filter @erp/shared build`
- Type-check: `pnpm --filter @erp/shared type-check`
- Tests: `pnpm --filter @erp/shared test`
- Tests watch: `pnpm --filter @erp/shared test:watch`

## Estado verificado

- `type-check`: OK
- `test`: 10 archivos, 49 tests, todo en verde

## Configuración del paquete

### `package.json`

- `main`: `./dist/index.js`
- `types`: `./src/index.ts`
- `exports["."]`:
  - `types`: `./src/index.ts`
  - `default`: `./dist/index.js`

Scripts actuales:

- `build`: `tsc -p tsconfig.json`
- `type-check`: `tsc --noEmit`
- `test`: `vitest run`
- `test:watch`: `vitest`

### `tsconfig.json`

- `target`: `ES2022`
- `module`: `CommonJS`
- `rootDir`: `./src`
- `outDir`: `./dist`
- `declaration: true`
- excluye tests `*.test.ts` y `*.spec.ts` del build

## Punto de entrada público

`src/index.ts` reexporta la API pública del paquete:

- enums
- schemas
- tipos

No hay sub-entrypoints públicos definidos; el consumo esperado es desde `@erp/shared`.

## `src/`

| Ruta | Función actual |
| --- | --- |
| `src/enums/` | Enums compartidos del dominio |
| `src/schemas/` | Schemas Zod y tests de validación |
| `src/types/` | Interfaces y tipos TypeScript compartidos |
| `src/index.ts` | Barrel principal del paquete |
| `src/index.test.ts` | Test del barrel principal |

## Enums compartidos

`src/enums/` contiene 18 archivos.

Enums detectados:

- `RolUsuario`
- `EstadoTicket`
- `TipoDocumento`
- `TipoMovimiento`
- `MovimientoComportamiento`
- `TipoCliente`
- `EstadoGarantia`
- `EstadoEquipo`
- `EstadoComercialEquipo`
- `EstadoOrdenCompra`
- `EstadoVenta`
- `EstadoComprobante`
- `PrioridadTicket`
- `TipoServicio`
- `TipoProducto`
- `CondicionProducto`
- `EstadoCaja`
- `TipoMovimientoCaja`

### Valores críticos verificados

#### Roles

`RolUsuario` expone exactamente:

- `ADMIN`
- `ENCARGADO`
- `TECNICO`

#### Movimiento de inventario

`TipoMovimiento` expone:

- `COMPRA_RECIBIDA`
- `VENTA`
- `CONSUMO_SOPORTE`
- `DEVOLUCION_CLIENTE`
- `DEVOLUCION_PROVEEDOR`
- `AJUSTE_POSITIVO`
- `AJUSTE_NEGATIVO`
- `TRANSFERENCIA`
- `BAJA_DANO`

Además, `movimiento-tipo.enum.ts` también define:

- `BASE_TIPOS_MOVIMIENTO`
- `BASE_TIPOS_MOVIMIENTO_BY_CODE`
- `TIPO_MOVIMIENTO_ORDER`
- `TIPO_MOVIMIENTO_LABELS`
- `TIPO_MOVIMIENTO_SHORT_LABELS`

Ese archivo no solo declara el enum; también concentra el catálogo base operativo de movimientos de inventario.

## Schemas Zod

`src/schemas/` contiene:

- 11 archivos de schema de dominio
- 1 `index.ts` de reexportación
- 9 archivos `*.test.ts` para validación de schemas

Schemas de dominio detectados:

- `auth.schema.ts`
- `master-data.schema.ts`
- `inventario.schema.ts`
- `equipos-garantias.schema.ts`
- `compras.schema.ts`
- `ventas.schema.ts`
- `facturacion.schema.ts`
- `config-reportes.schema.ts`
- `soporte.schema.ts`
- `location.schema.ts`

### Cobertura funcional observada

#### `auth.schema.ts`

Define, entre otros:

- `apiMetaSchema`
- `loginRequestSchema`
- `registerRequestSchema`
- `refreshRequestSchema`
- `forgotPasswordRequestSchema`
- `resetPasswordRequestSchema`
- `changePasswordRequestSchema`
- `authUserSchema`
- `authResponseSchema`
- envelopes para respuestas auth

También exporta tipos inferidos con `z.infer`.

#### `master-data.schema.ts`

Agrupa schemas para:

- clientes
- proveedores
- productos
- categorías
- marcas
- unidades de medida
- modelos de catálogo
- catálogo público
- filtros paginados

Incluye validaciones de negocio como:

- DNI de 8 dígitos
- RUC de 11 dígitos iniciando con `10` o `20`
- consistencia de precios
- restricciones por `TipoProducto`

#### `inventario.schema.ts`

Incluye schemas para:

- almacenes
- movimientos
- filtros de stock
- filtros de movimientos
- items de stock
- alertas de stock
- respuestas paginadas

#### `soporte.schema.ts`

Incluye schemas para:

- creación y actualización de tickets
- repuestos de ticket
- cierre de ticket
- filtros de tickets
- respuesta pública de tracking de ticket

#### `location.schema.ts`

Incluye schemas para:

- payload de ubicación
- resultado de búsqueda geográfica

## Tipos TypeScript

`src/types/` contiene 13 archivos.

Tipos detectados por dominio:

- `auth.type.ts`
- `master-data.type.ts`
- `inventario.type.ts`
- `equipos-garantias.type.ts`
- `compras.type.ts`
- `ventas.type.ts`
- `facturacion.type.ts`
- `config-reportes.type.ts`
- `soporte.type.ts`
- `location.type.ts`
- `pagination.type.ts`
- `socket-events.type.ts`

### Patrones observados

- `schemas/` cubre validación runtime con Zod
- `types/` mantiene interfaces TypeScript manuales para consumo compartido
- ambos conviven en paralelo dentro del paquete

### Tipos base importantes

#### `pagination.type.ts`

Define:

- `PaginatedResponse<T>`
- `QueryParams`

#### `socket-events.type.ts`

Define:

- `SocketEvents`
- `SocketEventName`
- `TicketEventPayload`
- `StockAlertaPayload`
- `ComprobanteEventPayload`
- `SocketEventMap`

Eventos socket verificados:

- `ticket.created`
- `ticket.updated`
- `ticket.closed`
- `stock.alerta`
- `comprobante.aceptado`
- `comprobante.rechazado`

#### `auth.type.ts`

Define tipos compartidos para:

- JWT payload
- requests de auth
- usuario autenticado
- profile actual
- refresh y mensajes de auth

#### `facturacion.type.ts`

Además de contratos actuales de comprobantes, define contratos fiscales futuros para:

- `ConfigEmpresaFiscalPayload`
- `SerieDocumentoPayload`
- `ComprobanteDetalle`
- `ProductoFiscalConfigPayload`
- `ClienteValidacionSunatPayload`

Los tipos de certificado/proveedor SUNAT no se definieron todavía porque dependen de una decisión futura de proveedor y almacenamiento seguro.

## Tests

### Archivos detectados

Tests detectados en `src/`:

- `src/index.test.ts`
- `src/schemas/auth.schema.test.ts`
- `src/schemas/master-data.schema.test.ts`
- `src/schemas/inventario.schema.test.ts`
- `src/schemas/equipos-garantias.schema.test.ts`
- `src/schemas/compras.schema.test.ts`
- `src/schemas/ventas.schema.test.ts`
- `src/schemas/facturacion.schema.test.ts`
- `src/schemas/config-reportes.schema.test.ts`
- `src/schemas/soporte.schema.test.ts`

### Qué cubren

- valores críticos de enums exportados
- integridad del barrel `src/index.ts`
- validación de schemas por dominio principal

## Contratos fiscales Bloque 2

Para la fiscalidad mínima seria ya existen contratos compartidos iniciales:

- `TipoFiscalProducto`: `BIEN`, `SERVICIO`
- `TipoAfectacionIgv`: afectaciones IGV semánticas alineadas con Prisma; el mapeo a códigos SUNAT queda para el builder/provider futuro
- `configEmpresaFiscalSchema`: datos tributarios no sensibles de empresa
- `serieDocumentoSchema`: series/correlativos futuros por tipo de documento
- `comprobanteDetalleSchema`: línea fiscal congelable separada de `DetalleVenta`
- `productoFiscalConfigSchema`: configuración fiscal futura de producto, todavía sin persistencia Prisma en este bloque
- `clienteValidacionSunatSchema`: validación documental futura de clientes

Referencia: `docs/facturacion-sunat-roadmap.md`, `docs/seguimiento-arquitectura-escalable.md` y `docs/handoff-arquitectura-escalable.md`.

## Contrato de branding público

Para el Bloque 1 de arquitectura escalable ya existen contratos compartidos de configuración de empresa:

- `ConfigEmpresaPayload` incluye datos legales visibles, branding, contacto público y contenido público
- `EmpresaPublica` representa la respuesta pública consumida por web desde `GET /api/v1/config/empresa/publica`
- `configEmpresaSchema` valida payloads de configuración de empresa
- `empresaPublicaSchema` y `empresaPublicaResponseSchema` validan la respuesta pública de branding
- `config-reportes.schema.test.ts` cubre payload privado y respuesta pública con branding

Referencia: `docs/configuracion-empresa-branding.md`.

## Estado actual del árbol

- `dist/` se genera con `pnpm --filter @erp/shared build`
- `src/index.ts` funciona como barrel único de exportación pública
