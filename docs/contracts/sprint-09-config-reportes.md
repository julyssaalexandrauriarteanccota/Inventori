# Sprint 09 - Contratos de configuración y reportes

## Alcance

Contratos compartidos para dashboard, configuración de empresa, series,
métodos de pago y auditoría.

## Contratos shared

- Tipos TypeScript: `packages/shared/src/types/config-reportes.type.ts`
- Schemas Zod: `packages/shared/src/schemas/config-reportes.schema.ts`

## Endpoints backend cubiertos

- `GET /api/v1/reportes/dashboard`
- `GET /api/v1/reportes/ventas`
- `GET /api/v1/reportes/stock`
- `GET /api/v1/reportes/tickets`
- `GET /api/v1/reportes/clientes`
- `GET /api/v1/reportes/telemetria/:equipoSerie`
- `GET /api/v1/config/empresa`
- `PATCH /api/v1/config/empresa`
- `GET /api/v1/config/series`
- `PATCH /api/v1/config/series`
- `GET /api/v1/config/metodos-pago`
- `POST /api/v1/config/metodos-pago`
- `PATCH /api/v1/config/metodos-pago/:id`
- `GET /api/v1/config/auditoria`
- `GET /api/v1/config/auditoria/:id`
