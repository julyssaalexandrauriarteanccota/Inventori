# Sprint 14 - Tiempo real y notificaciones

- Estado: COMPLETADO
- Fase: Tiempo real
- Depende de: 07, 08, 10
- Desbloquea: Ninguno

## Objetivo

Agregar eventos en tiempo real para stock, tickets y comprobantes, mejorando la
operacion diaria del ERP.

## Tablas y contratos consumidos por este sprint

- `AlertaStock`
- `Ticket`
- `HistorialTicket`
- `Comprobante`

## Reglas AGENTS criticas para este sprint

- [ ] `web` escucha sockets desde `api`
- [ ] Los eventos deben corresponder a cambios reales de negocio
- [ ] Notificaciones en tiempo real no reemplazan validacion backend

## Checklist de implementacion

### Backend - `apps/api`

- [ ] Completar `websockets/events.gateway.ts`
- [ ] Definir rooms por usuario y por rol
- [ ] Emitir `ticket.created`
- [ ] Emitir `ticket.updated` (cambio de estado, tecnico o prioridad)
- [ ] Emitir `ticket.closed`
- [ ] Emitir `stock.alerta`
- [ ] Emitir `comprobante.aceptado`
- [ ] Emitir `comprobante.rechazado`
- [ ] Decidir estrategia de persistencia de notificaciones: in-memory para sesion actual vs tabla de notificaciones en DB para historial

### Frontend - `apps/web`

- [ ] Completar `hooks/use-socket.ts`
- [ ] Mostrar toast y badge de notificaciones
- [ ] Actualizar contadores del sidebar en tiempo real
- [ ] Refrescar dashboard o vistas afectadas cuando llegue un evento

### Shared - `packages/shared`

- [ ] Definir tipos de eventos de socket y payloads

### Testing

- [ ] Tests de gateway o handlers principales
- [ ] Tests de hook de socket y reaccion de UI
- [ ] Validacion manual de eventos criticos en tiempo real

## Checklist de cierre

- [ ] Los eventos se emiten desde backend
- [ ] El frontend recibe y refleja notificaciones relevantes
- [ ] Stock, tickets y comprobantes muestran cambios sin recargar
- [ ] La estrategia de persistencia de notificaciones esta definida e implementada
- [ ] Los contratos de eventos del sprint quedaron cubiertos
