# Sprint 08 - Soporte tecnico y taller

- Estado: COMPLETADO ✅ (269 tests, 21 suites, 0 fallos)
- Fase: Backend nucleo
- Depende de: 02, 03, 04
- Desbloquea: 11, 13, 14, 15, 16, 17

## Objetivo

Cubrir el flujo completo de tickets de soporte: apertura, diagnostico, consumo
de repuestos, adjuntos, historial y cierre con firma.

## Tablas duenas de este sprint

- `Ticket`
- `DetalleTicket`
- `AdjuntoTicket`
- `HistorialTicket`

## Tablas relacionadas que este sprint debe consumir correctamente

- `Cliente`
- `Equipo`
- `MovimientoStock`
- `Compatibilidad`

## Reglas AGENTS criticas para este sprint

- [x] `TECNICO` crea y opera tickets dentro de sus limites
- [x] Consumo de repuestos genera `MovimientoStock` tipo `CONSUMO_SOPORTE`
- [x] La compatibilidad del repuesto debe validarse antes de asignarlo
- [x] El seguimiento publico del ticket usa `@Public()`
- [x] Cierre del ticket debe preservar historial y evidencia

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/soporte/`
- [x] `POST /soporte/tickets`
- [x] Generar codigo `TKT-YYYY-XXXX`
- [x] Crear historial inicial
- [x] `GET /soporte/tickets` con filtros
- [x] `GET /soporte/tickets/:id`
- [x] `PATCH /soporte/tickets/:id`
- [x] Crear historial ante cambio de estado, tecnico o prioridad
- [x] `POST /soporte/tickets/:id/repuestos`
- [x] Validar compatibilidad repuesto con modelo del equipo (tabla `Compatibilidad`) antes de registrar consumo
- [x] Crear `MovimientoStock` tipo `CONSUMO_SOPORTE`
- [x] `POST /soporte/tickets/:id/adjuntos`
- [x] `PATCH /soporte/tickets/:id/cerrar`
- [x] `GET /soporte/tickets/:codigo/publico` con `@Public()`
- [x] Calcular `montoTotal` al cierre

### Shared - `packages/shared`

- [x] Confirmar `EstadoTicket`, prioridades y tipo de servicio
- [x] Confirmar contratos de ficha, historial y seguimiento publico

### Frontend - preparacion de consumo

- [x] Definir vistas ERP para lista, detalle, cierre y adjuntos *(contrato backend/shared listo para sprint frontend)*
- [x] Definir formulario publico de consulta por codigo *(contrato backend/shared listo para sprint frontend)*

### Testing

- [x] Tests de generacion de codigo
- [x] Tests de historial por cambios
- [x] Tests de consumo de repuestos con movimiento de stock
- [x] E2E de creacion de ticket
- [x] E2E de cierre con monto total
- [x] E2E de endpoint publico sin JWT

## Checklist de cierre

- [x] Los tickets se crean y listan correctamente
- [x] Cada cambio importante genera historial
- [x] El consumo de repuestos afecta inventario
- [x] El seguimiento publico funciona
- [x] Las 4 tablas duenas del sprint quedaron cubiertas

## Artefactos de soporte

- Contrato de soporte: `docs/contracts/sprint-08-soporte.md`
- Tipos shared: `packages/shared/src/types/soporte.type.ts`
- Schemas shared: `packages/shared/src/schemas/soporte.schema.ts`
- E2E del sprint: `apps/api/test/soporte.e2e-spec.ts`
