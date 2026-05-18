# Sprint 05 - Compras y recepciones

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 02, 03
- Desbloquea: 15

## Objetivo

Cerrar el flujo de compras a proveedor: orden, aprobacion, recepcion total o
parcial y actualizacion automatica de stock.

## Tablas duenas de este sprint

- `OrdenCompra`
- `DetalleOrdenCompra`
- `RecepcionCompra`
- `DetalleRecepcion`

## Reglas AGENTS criticas para este sprint

- [x] Solo `ADMIN` y `ENCARGADO` aprueban compras
- [x] Toda recepcion debe crear `MovimientoStock` tipo `COMPRA_RECIBIDA`
- [x] Estados de compra deben reflejar recepcion parcial o total
- [x] No recibir mercaderia sin trazabilidad por detalle
- [x] Preparar punto de integracion para OCR de factura de proveedor (Sprint 15): la OC debe poder recibir datos sugeridos desde AI sin acoplar la logica

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/compras/`
- [x] CRUD de ordenes de compra con detalles
- [x] `PATCH /compras/:id/aprobar`
- [x] `POST /compras/:id/recepciones`
- [x] Crear `MovimientoStock` tipo `COMPRA_RECIBIDA` al recibir
- [x] Actualizar `cantidadRecibida` en cada detalle
- [x] Cambiar estado a `RECIBIDA_PARCIAL` o `RECIBIDA_TOTAL`
- [x] `GET /compras` con filtros por estado y proveedor
- [x] `GET /compras/:id` con detalle y recepciones

### Shared - `packages/shared`

- [x] Confirmar estados de orden de compra y recepcion
- [x] Confirmar contratos de detalle de compra y recepcion

### Frontend - preparacion de consumo

- [x] Definir formulario de orden de compra y recepcion *(contrato backend/shared listo para sprint frontend)*
- [x] Definir tabla de seguimiento por estado y proveedor *(contrato backend/shared listo para sprint frontend)*

### Testing

- [x] Tests de recepcion total y parcial
- [x] Tests de movimientos de stock por recepcion
- [x] E2E de crear OC, aprobar y recibir
- [x] E2E de incremento real de stock

## Checklist de cierre

- [x] Una OC puede aprobarse
- [x] Una recepcion mueve stock correctamente
- [x] Se soporta recepcion parcial
- [x] El historial de compra queda visible
- [x] Las 4 tablas duenas del sprint quedaron cubiertas

## Notas de cierre

- 179 tests totales (23 nuevos en este sprint), todos pasando
- Compilacion TypeScript limpia
- Enum `EstadoOrdenCompra` creado en `packages/shared`
- Recepcion crea MovimientoStock COMPRA_RECIBIDA por cada producto en transaccion
- Numeracion automatica OC-0001, OC-0002, etc.
- PATCH /compras/:id/cancelar tambien implementado
- Items pendientes: formulario frontend (sprints frontend), integracion OCR (Sprint 15)

## Artefactos de soporte

- Contrato de compras: `docs/contracts/sprint-05-compras.md`
- Tipos shared: `packages/shared/src/types/compras.type.ts`
- Schemas shared: `packages/shared/src/schemas/compras.schema.ts`
- E2E del sprint: `apps/api/test/compras.e2e-spec.ts`
