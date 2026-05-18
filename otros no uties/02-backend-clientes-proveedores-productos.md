# Sprint 02 - Clientes, proveedores y productos

- Estado: COMPLETADO
- Fase: Backend nucleo
- Depende de: 01
- Desbloquea: 03, 04, 06, 08, 11, 13

## Objetivo

Cerrar los datos maestros del negocio para que inventario, ventas, soporte y
sitio publico tengan una base consistente.

## Tablas duenas de este sprint

- `Cliente`
- `ContactoCliente`
- `Proveedor`
- `Categoria`
- `Marca`
- `Producto`
- `ProductoProveedor`
- `Compatibilidad`

## Reglas AGENTS criticas para este sprint

- [x] Endpoints REST con paginacion, filtros y `PATCH` para updates
- [x] Validar `DNI` y `RUC` segun tipo de cliente
- [x] `Producto` no guarda IGV como columna de negocio
- [x] Validar productos serializados segun reglas del negocio
- [x] Enums y tipos alineados con `packages/shared`
- [x] No romper la estructura Nest `module/controller/service/dto`

## Checklist de implementacion

### Backend - `apps/api`

- [x] Completar `modules/clientes/` con CRUD, paginacion y filtros
- [x] Validar `DNI` para `NATURAL` y `RUC` para `EMPRESA`
- [x] Implementar `GET /clientes/:id/equipos`
- [x] Implementar `GET /clientes/:id/tickets`
- [x] Implementar registro de interacciones CRM del cliente
- [x] Completar `modules/proveedores/` con CRUD y listado de productos asociados
- [x] Completar `modules/productos/` con categorias, marcas y productos
- [x] Implementar compatibilidades repuesto-modelo
- [x] Implementar relacion producto-proveedor con precio
- [x] Validar productos serializados segun categoria

### Shared - `packages/shared`

- [x] Confirmar enums y tipos compartidos usados por clientes y productos
- [x] Definir contratos de filtros y respuestas paginadas para frontend

### Frontend - preparacion de consumo

- [x] Documentar payloads de formularios de cliente, proveedor y producto
- [x] Confirmar campos minimos para tablas del ERP y catalogo publico

### Testing

- [x] Tests de validacion por tipo de cliente
- [x] Tests de compatibilidad y producto-proveedor
- [x] E2E de crear cliente natural
- [x] E2E de crear producto con categoria y marca
- [x] E2E de busqueda por nombre, SKU, DNI o RUC

## Checklist de cierre

- [x] CRUD de clientes funcional
- [x] CRUD de proveedores funcional
- [x] CRUD de categorias, marcas y productos funcional
- [x] Filtros y paginacion funcionando
- [x] Compatibilidades y proveedores por producto funcionando
- [x] Las 8 tablas duenas del sprint quedaron cubiertas

## Artefactos de soporte

- Contrato de datos maestros: `docs/contracts/sprint-02-master-data.md`
- Contratos compartidos: `packages/shared/src/types/master-data.type.ts`
- Schemas compartidos: `packages/shared/src/schemas/master-data.schema.ts`
- E2E del sprint: `apps/api/test/master-data.e2e-spec.ts`
