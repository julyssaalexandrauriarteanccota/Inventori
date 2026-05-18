# Sprint 03 - Inventario y movimientos de stock

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 02
- Desbloquea: 04, 05, 06, 08, 11

## Objetivo

Controlar stock correctamente. Ningun ajuste directo: todo debe pasar por
movimientos y quedar trazado.

## Tablas duenas de este sprint

- `Almacen`
- `AlmacenStock`
- `MovimientoStock`
- `AlertaStock`

## Reglas AGENTS criticas para este sprint

- [x] Nunca modificar stock directo; siempre via `MovimientoStock`
- [x] `TECNICO` solo puede registrar `CONSUMO_SOPORTE`
- [x] `AJUSTE_POSITIVO` y `AJUSTE_NEGATIVO` exigen justificacion
- [x] `BAJA_DANO` debe prever adjunto de evidencia cuando se implemente flujo de archivos
- [x] `BAJA_DANO` depende de la infraestructura de uploads del Sprint 01 para adjuntar foto obligatoria
- [x] Stock bajo minimo debe generar alerta
- [x] Todas las foreign keys deben mantener indices

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/inventario/`
- [x] CRUD de almacenes
- [x] `GET /inventario/stock` con filtros
- [x] `GET /inventario/stock/:productoId`
- [x] `POST /inventario/movimientos`
- [x] Validar que `TECNICO` solo registre `CONSUMO_SOPORTE`
- [x] Validar justificacion obligatoria para `AJUSTE_POSITIVO` y `AJUSTE_NEGATIVO`
- [x] Actualizar `AlmacenStock` automaticamente
- [x] Evitar stock negativo salvo regla futura explicita
- [x] `GET /inventario/movimientos` con historial paginado
- [x] `GET /inventario/alertas`
- [x] Transferencias internas con salida y entrada

### Shared - `packages/shared`

- [x] Confirmar `TipoMovimiento`
- [x] Confirmar contratos de filtros, alertas y respuestas de stock

### Frontend - preparacion de consumo

- [x] Definir columnas y filtros de vista de stock
- [x] Definir formulario de movimiento con reglas por rol

### Testing

- [x] Tests de actualizacion de stock
- [x] Tests de validacion de roles por tipo de movimiento
- [x] Tests de justificacion obligatoria para ajustes
- [x] E2E de alta de movimiento y efecto en stock
- [x] E2E de alerta por stock minimo

## Checklist de cierre

- [x] El stock se calcula via movimientos
- [x] Los ajustes piden justificacion
- [x] Las transferencias quedan trazadas
- [x] Las alertas de stock minimo se generan correctamente
- [x] Las 4 tablas duenas del sprint quedaron cubiertas

## Artefactos de soporte

- Contrato de inventario: `docs/contracts/sprint-03-inventario.md`
- Contratos shared: `packages/shared/src/types/inventario.type.ts`
- Schemas shared: `packages/shared/src/schemas/inventario.schema.ts`
- E2E del sprint: `apps/api/test/inventario.e2e-spec.ts`
