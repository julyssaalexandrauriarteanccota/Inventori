# Sprint 04 - Equipos serializados y garantias

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 02, 03
- Desbloquea: 06, 08, 13, 17

## Objetivo

Construir el gemelo digital de cada equipo serializado y dejar la garantia
consultable tanto internamente como desde el sitio publico.

## Tablas duenas de este sprint

- `Equipo`
- `EquipoCliente`
- `LecturaSNMP`
- `Garantia`
- `CasoGarantia`

## Reglas AGENTS criticas para este sprint

- [x] Todo equipo serializado debe tener serie unica y obligatoria
- [x] La garantia va ligada al equipo, no al cliente
- [x] La garantia no se transfiere si cambia el cliente
- [x] La verificacion publica de garantia debe usar `@Public()`
- [x] Mantener historial del equipo por cliente

## Checklist de implementacion

### Backend - `apps/api`

- [x] Crear o completar `modules/equipos/`
- [x] `POST /equipos`
- [x] `GET /equipos/:serie`
- [x] `POST /equipos/:serie/asignar-cliente`
- [x] `GET /equipos/:serie/historial`
- [x] `POST /equipos/:serie/lecturas-snmp` para registrar lectura de telemetria
- [x] `GET /equipos/:serie/lecturas-snmp` con filtros de fecha y paginacion
- [x] Completar `modules/garantias/`
- [x] `POST /garantias`
- [x] `GET /garantias/:id`
- [x] `GET /garantias/verificar/:codigoQR` con `@Public()`
- [x] `POST /garantias/:id/casos`
- [x] `PATCH /garantias/:id/casos/:casoId`
- [ ] Auto-crear garantia al confirmar venta de equipo serializado *(Sprint 06 — Ventas)*
- [x] Generar `codigoQR` unico (UUID o hash) al crear garantia — sin PDF aun, solo el codigo

### Shared - `packages/shared`

- [x] Confirmar estados de garantia y formas de consulta
- [x] Confirmar payload publico para consulta por QR o serie

### Frontend - preparacion de consumo

- [ ] Definir ficha ERP del equipo con cliente actual, garantia y tickets *(Sprint frontend)*
- [ ] Definir pantalla publica de consulta de garantia *(Sprint frontend)*

### Testing

- [x] Tests de unicidad de serie
- [x] Tests de no transferencia de garantia
- [x] E2E de registro de equipo
- [x] E2E de consulta publica de garantia
- [x] E2E de caso de garantia aceptar/rechazar

## Checklist de cierre

- [x] Cada equipo serializado tiene ficha propia
- [x] La consulta publica de garantia funciona sin login
- [x] El historial de cliente por equipo queda trazado
- [x] La garantia puede abrir y resolver casos
- [x] Las lecturas SNMP se registran y consultan correctamente
- [x] El codigoQR se genera automaticamente al crear garantia
- [x] Las 5 tablas duenas del sprint quedaron cubiertas

## Notas de cierre

- 156 tests totales (35 nuevos en este sprint), todos pasando
- Compilacion TypeScript limpia (`tsc --noEmit` sin errores)
- Enums `EstadoEquipo` y `EstadoGarantia` creados en `packages/shared`
- Items pendientes: auto-crear garantia al confirmar venta (Sprint 06), pantallas frontend (sprints frontend)

## Artefactos de soporte

- Contrato de equipos y garantias: `docs/contracts/sprint-04-equipos-garantias.md`
- Tipos shared: `packages/shared/src/types/equipos-garantias.type.ts`
- Schemas shared: `packages/shared/src/schemas/equipos-garantias.schema.ts`
- E2E del sprint: `apps/api/test/equipos-garantias.e2e-spec.ts`
