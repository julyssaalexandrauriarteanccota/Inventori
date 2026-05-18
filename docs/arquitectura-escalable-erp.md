# Arquitectura escalable ERP

Plan final de implementación para mantener el sistema reutilizable entre rubros.

## Objetivo

Separar el ERP en capas para que el sistema pueda usarse hoy en una empresa de impresoras/fotocopiadoras y mañana adaptarse a computadoras, celulares, informática u otro rubro sin rehacer el núcleo.

## Principio central

No convertir el core del ERP en un sistema específico de impresoras.

El núcleo debe hablar de:

- productos
- servicios
- clientes
- proveedores
- stock
- compras
- ventas
- comprobantes
- soporte
- configuración

El rubro actual debe vivir como configuración o extensión:

- equipos serializados
- contadores
- firmware
- SNMP
- garantías técnicas
- compatibilidades
- textos comerciales de impresoras/fotocopiadoras

## Lectura del modelo actual

El modelo actual está bien encaminado.

Ya existen separaciones correctas:

- `Producto`: ficha base vendible
- `Equipo`: unidad física serializada asociada a un producto
- `DetalleVenta`: línea comercial de venta
- `DetalleTicket`: repuestos o productos usados en soporte
- `Compatibilidad`: relación entre repuestos y modelos/productos
- `MovimientoStock`: trazabilidad de inventario
- `AlmacenStock`: stock por almacén
- `Comprobante`: cabecera fiscal actual

La mejora necesaria no es rehacer el modelo, sino separar mejor responsabilidades antes de seguir creciendo.

## Capas de arquitectura

### Capa 1: ERP base

Debe ser genérica y reutilizable.

Tablas actuales que pertenecen al core:

- `Producto`
- `Categoria`
- `Marca`
- `ModeloCatalogo`
- `UnidadMedida`
- `Cliente`
- `Proveedor`
- `Venta`
- `DetalleVenta`
- `OrdenCompra`
- `DetalleOrdenCompra`
- `RecepcionCompra`
- `DetalleRecepcion`
- `Almacen`
- `AlmacenStock`
- `MovimientoStock`
- `MetodoPago`
- `Caja`
- `Auditoria`

Regla:

- esta capa no debe mencionar impresoras, fotocopiadoras, tóner, SNMP ni marcas específicas como Konica/Canon en nombres de tablas, campos o lógica base.

### Capa 2: operación por rubro

Aquí viven funciones útiles para empresas con productos serializados o soporte técnico.

Tablas actuales:

- `Equipo`
- `EquipoCliente`
- `LecturaSNMP`
- `Garantia`
- `CasoGarantia`
- `Ticket`
- `DetalleTicket`
- `AdjuntoTicket`
- `HistorialTicket`
- `Compatibilidad`

Regla:

- esta capa puede existir en el producto, pero debe ser activable/configurable por cliente o rubro.
- para otro rubro, `Equipo` puede representar laptop, celular, impresora, servidor, POS, router o cualquier activo serializado.

### Capa 3: especificaciones de catálogo por tipo

No crear una tabla ambigua `producto_detalle`.

Crear specs por tipo cuando el catálogo lo necesite.

Orden recomendado:

1. `ProductoEquipoSpec`
2. `ProductoServicioSpec`
3. `ProductoFiscalConfig`
4. evaluar después `ProductoRepuestoSpec`
5. evaluar después `ProductoInsumoSpec`
6. evaluar después `ProductoAccesorioSpec`
7. opcional: `ProductoAtributo` para extras flexibles

Regla:

- `Producto` conserva campos comunes.
- las specs guardan campos propios de un tipo.
- las specs son 1:1 con `Producto`.
- no duplicar datos de `Equipo` dentro de `ProductoEquipoSpec`.

### Capa 4: fiscalidad y facturación electrónica

Separada del catálogo y de la venta comercial.

Modelos futuros recomendados:

- `ConfigEmpresaFiscal`
- `SerieDocumento`
- `ComprobanteDetalle`
- `ComprobanteEnvioLog`
- `CertificadoDigital`
- `ClienteValidacionSunat`

Regla:

- `ComprobanteDetalle` congela lo emitido.
- `DetalleVenta` puede cambiar antes de confirmar o antes de emitir.
- `ComprobanteDetalle` no debe cambiar después de emitirse.

## Diferencias obligatorias

### Producto vs Equipo

`Producto` representa la ficha comercial.

Ejemplo:

- modelo: Bizhub C224e
- categoría: equipo
- marca: Konica Minolta
- precio
- imágenes
- ficha técnica

`Equipo` representa la unidad física.

Ejemplo:

- serie: ABC123
- contador actual
- firmware
- estado comercial
- almacén
- cliente actual
- ubicación

### DetalleVenta vs ComprobanteDetalle

`DetalleVenta` representa la operación comercial.

- producto vendido
- cantidad
- precio negociado
- descuento
- serie si aplica

`ComprobanteDetalle` representa la línea fiscal congelada.

- descripción emitida
- unidad SUNAT
- afectación IGV
- base imponible
- IGV
- total
- snapshot fiscal

### ProductoSpec vs ProductoAtributo

`ProductoSpec` es para campos importantes, tipados y consultables.

`ProductoAtributo` es solo para datos secundarios variables.

Regla:

- no usar atributos flexibles para todo.
- usar atributos flexibles solo cuando el dato no sea crítico para reportes, validación, filtros o facturación.

## Plan de implementación final

### Fase 0: neutralizar el producto para reventa

Objetivo: eliminar textos hardcodeados del rubro actual en la interfaz y metadata.

Alcance:

- esta fase prepara reventa y branding configurable
- no implementa facturación electrónica
- no implementa specs de catálogo
- si se toca Prisma, debe ser solo para campos públicos/no sensibles de `ConfigEmpresa`
- no crear todavía `ComprobanteDetalle`, `ConfigEmpresaFiscal`, `SerieDocumento`, `ProductoEquipoSpec` ni `ProductoServicioSpec`

Acciones:

- usar `ConfigEmpresa` como primera fuente para datos públicos, logo y branding no sensible
- mover textos de marca/sector a configuración de empresa o configuración pública
- evitar frases fijas como `fotocopiadoras`, `impresoras`, `Konica Minolta`, `Canon` en componentes base
- permitir que landing, metadata, sidebar, auth panel y catálogo usen configuración
- mantener defaults actuales para la empresa de impresoras, pero fuera de componentes base

Resultado esperado:

- el mismo código puede presentarse como ERP de impresoras, informática, celulares u otro rubro cambiando configuración.

Referencia de implementación: `docs/configuracion-empresa-branding.md`.

Las fases siguientes siguen siendo necesarias para emisión electrónica seria y catálogo escalable, pero no forman parte del primer cambio.

### Fase 1: documentar contratos de dominio

Objetivo: congelar significado de entidades antes de migrar.

Acciones:

- documentar `Producto` como catálogo base
- documentar `Equipo` como activo/unidad serializada
- documentar `DetalleVenta` como línea comercial
- documentar `ComprobanteDetalle` como línea fiscal futura
- documentar specs por tipo como extensión del catálogo

Resultado esperado:

- ningún agente confunde `producto_detalle`, `detalle_venta` y `comprobante_detalle`.

### Fase 2: shared primero

Objetivo: preparar tipos y validaciones sin tocar base de datos aún.

Acciones:

- agregar enums fiscales genéricos
- agregar schemas para `ProductoEquipoSpec`
- agregar schemas para `ProductoServicioSpec`
- agregar schemas para `ProductoFiscalConfig`
- agregar tipos para `ComprobanteDetalle`
- agregar tests en `packages/shared`

Resultado esperado:

- API y web comparten contrato antes de implementar persistencia.

### Fase 3: Prisma incremental

Objetivo: migrar sin romper lo existente.

Orden recomendado:

1. `ComprobanteDetalle`
2. `ConfigEmpresaFiscal`
3. `SerieDocumento`
4. `ProductoEquipoSpec`
5. `ProductoServicioSpec`
6. `ProductoFiscalConfig`

No crear todavía:

- `ProductoRepuestoSpec`
- `ProductoInsumoSpec`
- `ProductoAccesorioSpec`
- `ProductoAtributo`

Motivo:

- repuestos, insumos y accesorios aún pueden vivir con `Producto`, `Compatibilidad`, unidades e inventario actual.

### Fase 4: backend por servicios pequeños

Objetivo: no hacer crecer más `FacturacionService` ni `ProductosService` como clases enormes.

Servicios recomendados:

- `ProductoSpecsService`
- `ProductoFiscalService`
- `ComprobanteDetalleService`
- `SerieDocumentoService`
- `ComprobanteSnapshotService`
- `SunatPayloadBuilder`
- `SunatXmlSigner`
- `SunatDirectGateway` o `SunatDirectProvider` como abstracción interna hacia SUNAT directo, no como proveedor fiscal externo
- `FiscalSecretsService`
- `CertificateService`

Regla:

- `ProductosService` conserva CRUD base.
- specs por tipo se validan en servicios específicos.
- facturación fiscal no lee directamente desde `Producto` para reconstruir comprobantes viejos.
- la integración fiscal será SUNAT directo, sin Nubefact ni proveedor externo.
- certificados, claves y `.p12` se manejan solo en backend con cifrado, auditoría y rotación; frontend solo configura/carga de forma transitoria para ADMIN.

### Fase 5: frontend por módulos configurables

Objetivo: que la UI sea adaptable por rubro.

Acciones:

- el formulario de producto mantiene sección base común
- si `tipo = EQUIPO`, mostrar sección técnica de equipo/modelo
- si `tipo = SERVICIO`, mostrar sección operativa de servicio
- si el cliente activa facturación, mostrar sección fiscal
- no mostrar campos de impresoras si el rubro no los usa

Regla:

- la UI debe usar nombres genéricos por defecto.
- textos específicos del rubro deben venir de configuración o perfiles de industria.

### Fase 6: perfil de industria

Objetivo: poder vender el sistema a otro rubro.

Crear configuración tipo `IndustryProfile` o equivalente.

Campos posibles:

- nombre del rubro
- vocabulario para `Equipo`
- vocabulario para `Servicio`
- textos públicos de landing
- defaults de categorías
- defaults de unidades de medida
- módulos activos
- features activas: SNMP, garantías, soporte, POS, facturación

Ejemplos:

- impresoras: equipo, contador, firmware, SNMP, toner
- informática: equipo, serie, garantía, componentes, reparación
- celulares: equipo, IMEI, diagnóstico, repuestos, garantía

## Orden real recomendado

### Ahora

1. Neutralizar textos hardcodeados del frontend.
2. Crear documentación de dominio y vocabulario configurable.

### Después de Fase 0 / Bloque 1

3. Implementar `ComprobanteDetalle`.
4. Implementar `ConfigEmpresaFiscal` y `SerieDocumento`.
5. Agregar logs de envío fiscal y validación SUNAT de cliente.
6. Implementar `ProductoEquipoSpec`.
7. Implementar `ProductoServicioSpec`.
8. Implementar `ProductoFiscalConfig`.
9. Refactorizar facturación en servicios pequeños para SUNAT directo.
10. Agregar sedes fiscales, ambiente SUNAT y certificado digital seguro.
11. Refactorizar producto form para specs por tipo.
12. Evaluar `IndustryProfile` si la configuración pública ya no es suficiente.
13. Evaluar specs de repuesto, insumo y accesorio según necesidad real.

## Decisiones finales

- No crear `producto_detalle`.
- Sí crear specs por tipo de producto.
- Sí crear `ComprobanteDetalle`.
- Mantener `Producto` como núcleo común.
- Mantener `Equipo` como unidad física serializada.
- Mantener `DetalleVenta` como línea comercial.
- Mantener fiscalidad separada del catálogo.
- Separar textos de rubro para hacer el ERP revendible.

## Riesgos a evitar

- llenar `Producto` con campos específicos de impresoras
- llamar `producto_detalle` a cosas que no son del mismo dominio
- reconstruir facturas antiguas leyendo datos vivos de `Producto`
- guardar certificados o claves sin seguridad
- hardcodear rubros, marcas o textos comerciales en layouts base
- crear demasiadas tablas spec antes de tener uso real

## Criterio de éxito

El sistema será escalable si puede responder estas preguntas sin ambigüedad:

- qué es vendible
- qué es una unidad física
- qué se vendió comercialmente
- qué se emitió fiscalmente
- qué datos son comunes
- qué datos dependen del tipo
- qué datos dependen del rubro
- qué textos dependen del cliente que compra el ERP
