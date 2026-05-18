# Sprint 07 - Facturacion SUNAT

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 06
- Desbloquea: 17

## Objetivo

Emitir comprobantes via Nubefact de manera asincrona, segura y trazable,
respetando correlativos, estados y respuestas SUNAT.

## Tablas duenas de este sprint

- `Comprobante`
- `NotaCredito`
- `NotaDebito`
- `ConfigEmpresa`

## Tablas relacionadas que este sprint debe consumir correctamente

- `Venta`

## Reglas AGENTS criticas para este sprint

- [x] El flujo es siempre async: DB -> cola -> worker -> respuesta SUNAT
- [x] No antedatar comprobantes
- [x] No modificar comprobante `ACEPTADO`; usar nota de credito/debito
- [x] Solo `ADMIN` anula comprobantes
- [x] IGV se calcula al facturar; no sale desde `Producto`
- [x] Correlativos y series deben salir de `ConfigEmpresa`

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/facturacion/`
- [x] `POST /facturacion/emitir/:ventaId`
- [x] Validar venta en estado permitido
- [x] Generar serie y correlativo desde configuracion
- [x] Crear comprobante `PENDIENTE`
- [x] Encolar job en BullMQ
- [x] Crear `sunat.processor.ts`
- [x] Guardar CDR, hash y respuesta de Nubefact
- [x] Reintentar errores con backoff
- [x] `GET /facturacion/comprobantes`
- [x] `GET /facturacion/comprobantes/:id`
- [x] `GET /facturacion/comprobantes/:id/pdf`
- [x] `POST /facturacion/notas-credito` solo `ADMIN`
- [x] `GET/PATCH /facturacion/config`

### Shared - `packages/shared`

- [x] Confirmar `TipoDocumento` y estados de comprobante
- [x] Confirmar contratos de emision, consulta y respuesta SUNAT

### Frontend - preparacion de consumo

- [x] Definir pantalla de lista de comprobantes *(contrato backend/shared listo para sprint frontend)*
- [x] Definir estados visuales `PENDIENTE`, `ACEPTADO`, `RECHAZADO`, `ANULADO` *(contrato backend/shared listo para sprint frontend)*

### Testing

- [x] Tests de correlativos atomicos
- [x] Tests de worker con mock de Nubefact
- [x] E2E de emision que cree `PENDIENTE`
- [x] Test de actualizacion a `ACEPTADO` o `RECHAZADO`

## Checklist de cierre

- [x] Emitir comprobante crea cola y registro `PENDIENTE`
- [x] El worker actualiza el estado correctamente
- [x] El detalle muestra CDR y hash
- [x] Solo `ADMIN` puede anular o emitir nota de credito
- [x] Las 4 tablas duenas del sprint quedaron cubiertas

## Artefactos de soporte

- Contrato de facturación: `docs/contracts/sprint-07-facturacion.md`
- Tipos shared: `packages/shared/src/types/facturacion.type.ts`
- Schemas shared: `packages/shared/src/schemas/facturacion.schema.ts`
- Tests de worker: `apps/api/src/modules/facturacion/sunat.processor.spec.ts`
- E2E del sprint: `apps/api/test/facturacion.e2e-spec.ts`
