# Sprint 05 - Contratos de compras y recepciones

## Alcance

Contratos compartidos para órdenes de compra, recepciones y filtros de seguimiento.

## Contratos shared

- Tipos TypeScript: `packages/shared/src/types/compras.type.ts`
- Schemas Zod: `packages/shared/src/schemas/compras.schema.ts`
- Enum compartido: `EstadoOrdenCompra`

## Payloads clave

### Orden de compra

- `proveedorId`
- opcionales: `notas`, `fechaEsperada`
- `detalles[]`: `productoId`, `cantidad`, `precioUnitario`

### Recepción de compra

- `almacenDestinoId`
- opcional: `notas`
- `detalles[]`: `productoId`, `cantidadRecibida`

## Filtros

- `page`, `limit`, `estado`, `proveedorId`

## Endpoints backend cubiertos

- `POST /api/v1/compras`
- `GET /api/v1/compras`
- `GET /api/v1/compras/:id`
- `PATCH /api/v1/compras/:id`
- `PATCH /api/v1/compras/:id/aprobar`
- `PATCH /api/v1/compras/:id/cancelar`
- `POST /api/v1/compras/:id/recepciones`
