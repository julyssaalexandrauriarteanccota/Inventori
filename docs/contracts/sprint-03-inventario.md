# Sprint 03 - Contratos de inventario

## Alcance

Contratos compartidos para stock, movimientos, alertas y formularios de almacén.

## Contratos compartidos

- Tipos TypeScript: `packages/shared/src/types/inventario.type.ts`
- Schemas Zod: `packages/shared/src/schemas/inventario.schema.ts`
- Enum compartido: `packages/shared/src/enums/movimiento-tipo.enum.ts`

## Payloads clave

### Almacén

- `nombre`
- opcionales: `descripcion`, `direccion`, `esPrincipal`, `activo`

### Movimiento

- `tipo`, `productoId`, `cantidad`
- según el tipo: `almacenOrigenId` y/o `almacenDestinoId`
- ajustes y bajas: `justificacion`
- `BAJA_DANO`: `evidenciaFilename` obligatorio (archivo previamente subido en `/uploads`)

## Filtros

### Stock

- `page`, `limit`, `search`, `almacenId`, `productoId`, `stockBajo`

### Movimientos

- `page`, `limit`, `tipo`, `productoId`, `almacenId`

## Endpoints backend cubiertos

- `GET/POST/PATCH/DELETE /api/v1/inventario/almacenes`
- `GET /api/v1/inventario/stock`
- `GET /api/v1/inventario/stock/:productoId`
- `POST /api/v1/inventario/movimientos`
- `GET /api/v1/inventario/movimientos`
- `GET /api/v1/inventario/alertas`
- `PATCH /api/v1/inventario/alertas/:id/resolver`
