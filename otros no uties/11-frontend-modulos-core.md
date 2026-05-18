# Sprint 11 - Modulos core del ERP

- Estado: COMPLETADO
- Fase: Frontend ERP
- Depende de: 10, 02-08
- Desbloquea: 12, 16

## Objetivo

Construir las pantallas mas usadas del ERP con UX consistente, formularios
claros y consumo estable de la API.

## Tablas y contratos consumidos por este sprint

- `Cliente`
- `ContactoCliente`
- `Categoria`
- `Marca`
- `Producto`
- `ProductoProveedor`
- `Compatibilidad`
- `Almacen`
- `AlmacenStock`
- `MovimientoStock`
- `AlertaStock`
- `Equipo`
- `EquipoCliente`
- `LecturaSNMP`
- `Ticket`
- `DetalleTicket`
- `AdjuntoTicket`
- `HistorialTicket`

## Reglas AGENTS criticas para este sprint

- [ ] El frontend ERP consume solo `api`; nunca `ai` directo
- [ ] Acciones visibles deben respetar rol del usuario
- [ ] Estados loading, error y vacio son obligatorios
- [ ] No modificar `components/ui/`

## Checklist de implementacion

### Frontend - `apps/web`

- [ ] Completar modulo `(erp)/clientes/`
- [ ] Completar modulo `(erp)/productos/`
- [ ] Completar modulo `(erp)/inventario/`
- [ ] Completar modulo `(erp)/soporte/`
- [ ] Completar modulo `(erp)/equipos/` con ficha de equipo, historial de clientes, lecturas SNMP y estado de garantia
- [ ] Crear lista, detalle y formulario para cada modulo
- [ ] Reutilizar `DataTable` y componentes de formulario
- [ ] Manejar paginacion, filtros, skeletons, errores y vacios
- [ ] Mostrar acciones segun rol
- [ ] Incluir firma digital en cierre de ticket

### Backend - soporte al frontend

- [ ] Confirmar endpoints finales y filtros por modulo
- [ ] Confirmar validaciones que el frontend debe reflejar

### Shared - `packages/shared`

- [ ] Exportar esquemas o tipos de formularios clave
- [ ] Confirmar tipos para tablas y detalles

### Testing

- [ ] Tests de tablas y filtros
- [ ] Tests de formularios de clientes, productos e inventario
- [ ] Tests de UI de tickets y cierre tecnico

## Checklist de cierre

- [ ] Clientes, productos, inventario, soporte y equipos tienen UI funcional
- [ ] El usuario puede crear, editar y consultar segun permisos
- [ ] Los estados de carga y error estan cubiertos
- [ ] La ficha de equipo muestra cliente actual, garantia y lecturas SNMP
- [ ] La experiencia base del ERP ya es usable
- [ ] Los contratos core del sprint quedaron cubiertos
