# Sprint 06 - Ventas y cotizaciones

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 02, 03, 04
- Desbloquea: 07, 12

## Objetivo

Completar el flujo cotizacion -> orden confirmada -> entrega, incluyendo
descuento de stock, asignacion de equipos y generacion de garantias.

## Tablas duenas de este sprint

- `Venta`
- `DetalleVenta`
- `MetodoPago`

## Tablas relacionadas que este sprint debe consumir correctamente

- `EquipoCliente`
- `Garantia`
- `AlmacenStock`
- `MovimientoStock`

## Reglas AGENTS criticas para este sprint

- [x] `TECNICO` puede cotizar simple, pero no emitir facturas o boletas
- [x] Confirmar venta debe descontar stock
- [x] `precioUnitario` no puede quedar por debajo de `precioMinimo`
- [x] Entrega de equipo serializado debe actualizar relacion con cliente
- [x] Las garantias se crean automaticamente cuando corresponde
- [x] Ownership con Sprint 17: este sprint define reglas de negocio y trigger base de envio; Sprint 17 implementa PDF final y adjuntos de email
- [x] Ownership de `MetodoPago`: este sprint valida uso en venta; Sprint 09 administra CRUD y configuracion del catalogo

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/ventas/`
- [x] `POST /ventas` para crear cotizacion
- [x] `PATCH /ventas/:id` mientras este en `COTIZACION`
- [x] `PATCH /ventas/:id/confirmar`
- [x] `PATCH /ventas/:id/entregar`
- [x] Descontar stock al confirmar
- [x] Asignar equipo serializado al cliente cuando corresponda
- [x] Crear garantia automatica si aplica
- [x] `GET /ventas` con filtros
- [x] `GET /ventas/:id`
- [x] Validar `precioUnitario >= precioMinimo`
- [x] `POST /ventas/:id/enviar` para disparar envio de cotizacion (trigger + estado de envio, sin render PDF final en este sprint)
- [x] Preparar payload con datos necesarios para generacion de PDF de cotizacion (se implementa en Sprint 17)
- [x] Validar metodo de pago activo y valido al confirmar venta (catalogo administrado en Sprint 09)

### Shared - `packages/shared`

- [x] Confirmar estados de venta
- [x] Confirmar contratos de detalle, descuentos y metodos de pago

### Frontend - preparacion de consumo

- [x] Definir flujo visual de cotizacion, confirmacion y entrega *(contrato backend/shared listo para sprint frontend)*
- [x] Definir estados y acciones disponibles por rol *(contrato backend/shared listo para sprint frontend)*

### Testing

- [x] Tests de precio minimo
- [x] Tests de descuento de stock
- [x] Tests de asignacion de equipo y garantia
- [x] E2E de crear, confirmar y entregar venta

## Checklist de cierre

- [x] La cotizacion se confirma correctamente
- [x] El stock baja al confirmar
- [x] El equipo serializado queda asignado
- [x] La garantia se crea cuando corresponde
- [x] El trigger de envio de cotizacion deja estado y payload listos para integracion PDF/email del Sprint 17
- [x] El metodo de pago se valida al confirmar
- [x] Las 3 tablas duenas del sprint quedaron cubiertas

## Artefactos de soporte

- Contrato de ventas: `docs/contracts/sprint-06-ventas.md`
- Tipos shared: `packages/shared/src/types/ventas.type.ts`
- Schemas shared: `packages/shared/src/schemas/ventas.schema.ts`
- E2E del sprint: `apps/api/test/ventas.e2e-spec.ts`
