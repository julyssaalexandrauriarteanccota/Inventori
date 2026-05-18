# Sprint 08 - Contratos de soporte técnico

## Alcance

Contratos compartidos para tickets, historial, consumo de repuestos y seguimiento público.

## Contratos shared

- Tipos TypeScript: `packages/shared/src/types/soporte.type.ts`
- Schemas Zod: `packages/shared/src/schemas/soporte.schema.ts`
- Enums compartidos: `EstadoTicket`, `PrioridadTicket`, `TipoServicio`

## Payloads clave

### Ticket

- `clienteId`
- opcionales: `equipoId`, `tecnicoId`, `fallaReportada`, `prioridad`, `tipoServicio`, `fechaPromesa`, `notas`, `montoManoObra`
- requeridos: `titulo`, `descripcion`

### Repuesto consumido

- `productoId`, `cantidad`
- opcionales: `precioUnitario`, `almacenId`, `notas`

### Cierre

- opcionales: `solucion`, `montoManoObra`, `firmaCliente`, `firmaGeoLat`, `firmaGeoLng`, `notas`

## Filtros

- `page`, `limit`, `estado`, `prioridad`, `tipoServicio`, `tecnicoId`, `clienteId`, `search`

## Endpoints backend cubiertos

- `POST /api/v1/soporte/tickets`
- `GET /api/v1/soporte/tickets`
- `GET /api/v1/soporte/tickets/:id`
- `PATCH /api/v1/soporte/tickets/:id`
- `POST /api/v1/soporte/tickets/:id/repuestos`
- `POST /api/v1/soporte/tickets/:id/adjuntos`
- `PATCH /api/v1/soporte/tickets/:id/cerrar`
- `GET /api/v1/soporte/tickets/:codigo/publico`
