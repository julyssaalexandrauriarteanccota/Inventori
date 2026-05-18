# Sprint 09 - Configuracion y reportes basicos

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 01-08
- Desbloquea: 12, 17
- Tests: 305 passed, 24 suites (32 nuevos en este sprint)

## Objetivo

Permitir que la empresa configure sus datos base y vea sus indicadores
principales desde el ERP.

## Tablas principales consumidas por este sprint

- `ConfigEmpresa`
- `Auditoria`
- `AlertaStock`
- `LecturaSNMP`
- `Venta`
- `Ticket`
- `Cliente`
- `MetodoPago`
- `Usuario`

## Reglas AGENTS criticas para este sprint

- [x] Configuracion del sistema es solo para `ADMIN`
- [x] Reportes deben respetar permisos por rol
- [x] Dashboard debe apoyarse en endpoints agregados y no duplicar logica de negocio
- [x] Mantener formato estandar de respuesta y filtros claros
- [x] Ownership de `MetodoPago`: este sprint administra CRUD/catalogo; la validacion de uso en confirmacion de venta sigue en Sprint 06

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/reportes/`
- [x] `GET /reportes/ventas`
- [x] `GET /reportes/stock`
- [x] `GET /reportes/tickets`
- [x] `GET /reportes/clientes`
- [x] `GET /reportes/dashboard`
- [x] Completar `modules/config/` o equivalente administrativo
- [x] `GET /config/empresa`
- [x] `PATCH /config/empresa`
- [x] `GET /config/series`
- [x] `PATCH /config/series`
- [x] Restringir configuracion a `ADMIN`
- [x] `GET /auditoria` con filtros por usuario, modelo, rango de fecha y paginacion — solo `ADMIN`
- [x] `GET /auditoria/:id` detalle de registro de auditoria
- [x] `GET /reportes/telemetria/:equipoSerie` con datos agregados de lecturas SNMP
- [x] CRUD de metodos de pago: `GET/POST/PATCH /config/metodos-pago` — solo `ADMIN` (sin mover reglas de validacion transaccional del Sprint 06)

### Shared - `packages/shared`

- [x] Confirmar contratos de KPI, dashboard y configuracion
- [x] Confirmar payloads de empresa, logo y series

### Frontend - preparacion de consumo

- [x] Definir tarjetas KPI y layout de dashboard *(contrato backend/shared listo para sprint frontend)*
- [x] Definir formularios de configuracion de empresa y series *(contrato backend/shared listo para sprint frontend)*

### Testing

- [x] Tests de agregacion de reportes
- [x] Tests de permisos de configuracion
- [x] E2E de dashboard y actualizacion de empresa

## Checklist de cierre

- [x] Dashboard resume ventas, stock, tickets y clientes
- [x] Empresa y series se editan solo por `ADMIN`
- [x] Los endpoints de reportes responden con datos consolidados
- [x] Auditoria es consultable con filtros por `ADMIN`
- [x] Telemetria SNMP esta disponible en reportes
- [x] Metodos de pago son gestionables por `ADMIN` y quedan consumibles para validaciones del flujo de ventas
- [x] Las tablas de configuracion y consulta del sprint quedaron cubiertas

## Artefactos de soporte

- Contrato de configuración/reportes: `docs/contracts/sprint-09-config-reportes.md`
- Tipos shared: `packages/shared/src/types/config-reportes.type.ts`
- Schemas shared: `packages/shared/src/schemas/config-reportes.schema.ts`
- E2E del sprint: `apps/api/test/config-reportes.e2e-spec.ts`
