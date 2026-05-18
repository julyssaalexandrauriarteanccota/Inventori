# Sprint 02 - Contratos de datos maestros

## Alcance

Este artefacto congela los contratos base que consumen los sprints dependientes
de datos maestros (`03`, `04`, `06`, `08`, `11`, `13`).

## Contratos compartidos

- Tipos TypeScript: `packages/shared/src/types/master-data.type.ts`
- Schemas Zod: `packages/shared/src/schemas/master-data.schema.ts`
- Enum compartido: `packages/shared/src/enums/tipo-cliente.enum.ts`

## Payloads de formularios

### Cliente

- Persona natural: `tipo`, `nombre`, `apellido`, `dni`
- Empresa: `tipo`, `razonSocial`, `ruc`
- Opcionales comunes: `email`, `telefono`, `celular`, `direccion`, `distrito`, `provincia`, `departamento`, `referencia`, `notas`, `activo`
- Para facturación: `dni` se usa en boletas identificadas; `ruc` se usa para facturas electrónicas y debe iniciar con `10` o `20`.
- Documentos soportados para clientes del ERP: RUC, DNI y sin documento/público general. No se habilitan documentos de clientes extranjeros.
- El DNI `00000000` queda reservado para el cliente genérico del sistema (`esGenerico=true`, Público en General). No debe editarse ni eliminarse desde gestión de clientes.

### Proveedor

- Requeridos: `razonSocial`, `ruc`
- Opcionales: `email`, `telefono`, `direccion`, `contactoNombre`, `contactoTelefono`, `notas`, `activo`

### Producto

- Requeridos: `nombre`, `categoriaId`, `unidadMedidaId`, `precioCompra`, `precioVenta`, `precioMinimo`. `sku` es opcional porque el sistema puede sugerir/generar uno por tipo y categoría.
- Opcionales comunes: `marcaId`, `modeloId`, `modelo`, `codigoBarras`, `codigoQr`, `condicion`, `stockMinimo`, `imagen`, `imagenes`, `activo`.
- `stockMinimo` no es stock inicial: es un umbral de alerta. El stock real entra por compras, recepciones o movimientos de inventario.
- Reglas por tipo:
  - `EQUIPO`: maneja inventario, se serializa por unidad física en el módulo Equipos, no es consumible.
  - `REPUESTO`: maneja inventario, no se serializa en catálogo, no es consumible; puede tener compatibilidades.
  - `INSUMO`: maneja inventario, no se serializa, siempre es consumible.
  - `SERVICIO`: no maneja stock, no tiene serie, no es consumible; usa `tiempoEstimadoMin` y puede requerir repuestos.
  - `ACCESORIO`: maneja inventario, no se serializa, no es consumible.

## Filtros de listados

### Clientes

- `page`, `limit`, `search`, `tipo`
- `search` cubre `nombre`, `apellido`, `razonSocial`, `dni`, `ruc`, `email`

### Proveedores

- `page`, `limit`, `search`
- `search` cubre `razonSocial`, `ruc`, `email`

### Productos

- `page`, `limit`, `search`, `categoriaId`, `marcaId`, `esConsumible`, `tieneNumeroSerie`
- `search` cubre `nombre`, `sku`, `modelo`

## Campos mínimos para frontend

### Tablas ERP

- Clientes: `tipo`, nombre visible (`nombre + apellido` o `razonSocial`), documento explícito (`dni/ruc`), `email`, `telefono/celular`, ubicación (`direccion`, `distrito`, `provincia`, `departamento`), validación documental fiscal más reciente, `activo` y acciones.
- Proveedores: `razonSocial`, `ruc`, `contactoNombre`, `telefono`, `email`, `activo`
- Productos: `sku`, `tipo`, `nombre`, `modelo`, `categoria.nombre`, `marca.nombre`, `unidadMedida.codigo`, `precioVenta`, `stockMinimo`, reglas de inventario/serialización/consumo y `activo`

### Catálogo público

- Productos: `sku`, `nombre`, `modelo`, `categoria.nombre`, `marca.nombre`, `imagen`, `precioVenta`, `tieneNumeroSerie`, `esConsumible`

## Endpoints backend cubiertos

- `GET/POST/PATCH/DELETE /api/v1/clientes`
- `GET /api/v1/clientes/:id/equipos`
- `GET /api/v1/clientes/:id/tickets`
- `POST /api/v1/clientes/:id/contactos`
- `GET /api/v1/clientes/:id/contactos`
- `GET/POST/PATCH/DELETE /api/v1/proveedores`
- `GET /api/v1/proveedores/:id/productos`
- `GET/POST/PATCH/DELETE /api/v1/categorias`
- `GET/POST/PATCH/DELETE /api/v1/marcas`
- `GET/POST/PATCH/DELETE /api/v1/productos`
- `POST/GET/DELETE /api/v1/productos/:id/proveedores`
- `POST/GET/DELETE /api/v1/productos/:id/compatibilidades`
