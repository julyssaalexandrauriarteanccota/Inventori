# Sprint 12 - Modulos secundarios del ERP

- Estado: COMPLETADO
- Fase: Frontend ERP
- Depende de: 10, 11
- Desbloquea: 17

## Objetivo

Completar las interfaces de ventas, compras, garantias, proveedores, reportes y
dashboard para tener el ERP operativo de punta a punta.

## Tablas y contratos consumidos por este sprint

- `Proveedor`
- `OrdenCompra`
- `DetalleOrdenCompra`
- `RecepcionCompra`
- `DetalleRecepcion`
- `Venta`
- `DetalleVenta`
- `MetodoPago`
- `Garantia`
- `CasoGarantia`
- `Comprobante`
- `NotaCredito`
- `NotaDebito`
- `ConfigEmpresa`
- `Auditoria`

## Reglas AGENTS criticas para este sprint

- [ ] Las pantallas deben reflejar permisos reales por rol
- [ ] Los estados de comprobante deben mostrarse sin ambiguedad
- [ ] Reportes y dashboard no deben duplicar calculos del backend

## Checklist de implementacion

### Frontend - `apps/web`

- [ ] Completar `(erp)/ventas/`
- [ ] Completar `(erp)/compras/`
- [ ] Completar `(erp)/garantias/`
- [ ] Completar `(erp)/proveedores/`
- [ ] Completar `(erp)/reportes/`
- [ ] Completar `(erp)/dashboard/`
- [ ] Completar `(erp)/configuracion/` para `ADMIN`: datos de empresa, series SUNAT, metodos de pago, log de auditoria
- [ ] Modelar estados visuales de venta y facturacion
- [ ] UI de facturacion dentro de ventas: boton emitir comprobante, estados visuales `PENDIENTE`, `ACEPTADO`, `RECHAZADO`, `ANULADO`
- [ ] Mostrar indicadores y alertas relevantes en dashboard
- [ ] Preparar graficos y tablas para reportes

### Backend - soporte al frontend

- [ ] Confirmar endpoints finales de ventas, compras, garantias y reportes
- [ ] Confirmar payloads de dashboard y KPIs

### Shared - `packages/shared`

- [ ] Confirmar tipos de reportes, KPIs y pantallas de detalle

### Testing

- [ ] Tests de formularios de ventas y compras
- [ ] Tests de vistas de garantias y proveedores
- [ ] Tests de dashboard y reportes con mocks

## Checklist de cierre

- [ ] El ERP ya cubre modulos principales y secundarios
- [ ] Ventas, compras, garantias y reportes son navegables y utilizables
- [ ] La configuracion de empresa, series y metodos de pago funciona para `ADMIN`
- [ ] La UI de facturacion muestra estados SUNAT sin ambiguedad
- [ ] El log de auditoria es visible para `ADMIN`
- [ ] Dashboard resume la operacion diaria
- [ ] Los contratos secundarios del sprint quedaron cubiertos
