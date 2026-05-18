# Sprint 07 - Contratos de facturación SUNAT

## Alcance

Contratos compartidos para emisión, consulta de comprobantes y respuesta SUNAT.

## Contratos shared

- Tipos TypeScript: `packages/shared/src/types/facturacion.type.ts`
- Schemas Zod: `packages/shared/src/schemas/facturacion.schema.ts`
- Enums compartidos: `TipoDocumento`, `EstadoComprobante`
- Roadmap futuro SUNAT: `docs/facturacion-sunat-roadmap.md`

## Payloads clave

### Emisión

- `ventaId`
- `tipo`: `FACTURA` | `BOLETA`

### Filtros

- `page`, `limit`, `tipo`, `estado`, `search`

### Documento soporte

- `hashSunat`
- `xmlUrl`
- `cdrUrl`
- `pdfUrl`

## Endpoints backend cubiertos

- `POST /api/v1/facturacion/emitir`
- `GET /api/v1/facturacion/comprobantes`
- `GET /api/v1/facturacion/comprobantes/:id`
- `GET /api/v1/facturacion/comprobantes/:id/pdf`
- `POST /api/v1/facturacion/comprobantes/:id/anular`
- `POST /api/v1/facturacion/comprobantes/:id/reintentar`
- `POST /api/v1/facturacion/notas-credito`
- `POST /api/v1/facturacion/notas-debito`
- `GET /api/v1/facturacion/config`
- `PATCH /api/v1/facturacion/config`
