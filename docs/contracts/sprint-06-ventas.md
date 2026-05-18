# Sprint 06 - Contratos de ventas y cotizaciones

## Alcance

Contratos compartidos para cotizaciones, confirmación, entrega y filtros de ventas.

## Contratos shared

- Tipos TypeScript: `packages/shared/src/types/ventas.type.ts`
- Schemas Zod: `packages/shared/src/schemas/ventas.schema.ts`
- Enum compartido: `EstadoVenta`

## Payloads clave

### Venta / cotización

- `clienteId`
- opcionales: `notas`, `validoHasta`
- `detalles[]`: `productoId`, `cantidad`, `precioUnitario`, `descuento`, `equipoSerie`

### Confirmación

- `metodoPagoId`
- `almacenId`
- opcional: `referenciaPago`

## Filtros

- `page`, `limit`, `estado`, `clienteId`, `search`

## Endpoints backend cubiertos

- `POST /api/v1/ventas`
- `GET /api/v1/ventas`
- `GET /api/v1/ventas/:id`
- `PATCH /api/v1/ventas/:id`
- `PATCH /api/v1/ventas/:id/confirmar`
- `PATCH /api/v1/ventas/:id/entregar`
- `PATCH /api/v1/ventas/:id/cancelar`
- `POST /api/v1/ventas/:id/enviar`
