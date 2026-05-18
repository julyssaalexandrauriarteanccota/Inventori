# Mapa de tablas del schema activo

Fuente: `apps/api/prisma/schema.prisma`

Conteo actual del schema: **52 modelos/tablas**

La idea de este archivo es evitar que algun sprint deje fuera parte de la base.
Cada tabla tiene un sprint primario responsable y, cuando aplica, sprints
secundarios que la consumen o la extienden.

| Modelo | Tabla | Sprint primario | Sprints relacionados | Area |
|--------|-------|-----------------|----------------------|------|
| `Usuario` | `usuarios` | 01 | 09, 10 | Auth / admin |
| `RefreshToken` | `refresh_tokens` | 01 | 10 | Auth |
| `Auditoria` | `auditoria` | 01 | 09, 18 | Seguridad / trazabilidad |
| `Cliente` | `clientes` | 02 | 06, 08, 11, 13 | Maestro |
| `ContactoCliente` | `contactos_cliente` | 02 | 11 | CRM cliente |
| `Proveedor` | `proveedores` | 02 | 05, 12 | Maestro |
| `Categoria` | `categorias` | 02 | 11, 13 | Catalogo |
| `Marca` | `marcas` | 02 | 11, 13 | Catalogo |
| `ModeloCatalogo` | `modelos_catalogo` | 02 | 04, 11, 13 | Catalogo |
| `UnidadMedida` | `unidades_medida` | 02 | 03, 05, 06, 07 | Catalogo |
| `Producto` | `productos` | 02 | 03, 05, 06, 08, 11, 13 | Catalogo |
| `ProductoImagen` | `producto_imagenes` | 02 | 11, 13 | Catalogo / assets |
| `ProductoProveedor` | `producto_proveedores` | 02 | 05, 12 | Catalogo / compras |
| `Compatibilidad` | `compatibilidades` | 02 | 08, 11 | Repuestos |
| `Almacen` | `almacenes` | 03 | 11 | Inventario |
| `AlmacenStock` | `almacen_stocks` | 03 | 05, 06, 08, 11 | Inventario |
| `MovimientoStock` | `movimientos_stock` | 03 | 05, 06, 08, 18 | Inventario |
| `AlertaStock` | `alertas_stock` | 03 | 11, 14 | Inventario |
| `Equipo` | `equipos` | 04 | 06, 08, 11, 13, 17 | Equipos |
| `EquipoCliente` | `equipo_clientes` | 04 | 06, 08, 11 | Historial equipo-cliente |
| `LecturaSNMP` | `lecturas_snmp` | 04 | 09 | Telemetria equipo |
| `Garantia` | `garantias` | 04 | 06, 12, 13, 17 | Garantias |
| `CasoGarantia` | `casos_garantia` | 04 | 12 | Garantias |
| `OrdenCompra` | `ordenes_compra` | 05 | 12, 15 | Compras |
| `DetalleOrdenCompra` | `detalles_orden_compra` | 05 | 12, 15 | Compras |
| `RecepcionCompra` | `recepciones_compra` | 05 | 12 | Compras |
| `DetalleRecepcion` | `detalles_recepcion` | 05 | 12 | Compras |
| `Venta` | `ventas` | 06 | 07, 12, 17 | Ventas |
| `DetalleVenta` | `detalles_venta` | 06 | 07, 12 | Ventas |
| `MetodoPago` | `metodos_pago` | 06 | 09, 12 | Ventas / admin |
| `Comprobante` | `comprobantes` | 07 | 12, 17 | Facturacion |
| `ComprobanteDetalle` | `comprobante_detalles` | 07 | 12, 17 | Facturacion / snapshot fiscal |
| `ComprobanteEnvioLog` | `comprobante_envio_logs` | 07 | 12, 17 | Facturacion / auditoria envio |
| `ConfigEmpresaFiscal` | `config_empresa_fiscal` | 07 | 09, 12, 17, 19 | Empresa / tributario no sensible |
| `EmpresaSedeFiscal` | `empresa_sedes_fiscales` | 07 | 09, 12, 17, 19 | Empresa / sede fiscal SUNAT directo |
| `SerieDocumento` | `series_documento` | 07 | 09, 12, 17 | Facturacion / correlativos por ambiente/sede |
| `CertificadoDigital` | `certificados_digitales` | 07 | 12, 17, 19 | Facturacion / certificado SUNAT directo seguro |
| `FiscalSecret` | `fiscal_secrets` | 07 | 12, 17, 19 | Facturacion / secretos cifrados |
| `ClienteValidacionSunat` | `cliente_validaciones_sunat` | 07 | 02, 12, 17 | Cliente / validacion fiscal |
| `NotaCredito` | `notas_credito` | 07 | 12 | Facturacion |
| `NotaDebito` | `notas_debito` | 07 | 12 | Facturacion |
| `ConfigEmpresa` | `config_empresa` | 07 | 09, 12, 17, 19 | Empresa / branding y config heredada |
| `Ticket` | `tickets` | 08 | 11, 13, 14, 15, 16, 17 | Soporte |
| `DetalleTicket` | `detalles_ticket` | 08 | 11, 16 | Soporte |
| `AdjuntoTicket` | `adjuntos_ticket` | 08 | 11, 16 | Soporte |
| `HistorialTicket` | `historial_tickets` | 08 | 11, 14 | Soporte |
| `TipoMovimientoConfig` | `tipos_movimiento_config` | 09 | 03, 18 | Configuracion / inventario |
| `Caja` | `cajas` | 12 | 06, 17 | Caja |
| `AperturaCaja` | `aperturas_caja` | 12 | 06, 17 | Caja |
| `MovimientoCaja` | `movimientos_caja` | 12 | 06, 17 | Caja |
| `ArqueoCaja` | `arqueos_caja` | 12 | 06, 17 | Caja |
| `Adjunto` | `adjuntos` | 17 | 03, 08, 09, 19 | Archivos generales |

## Nota de doble ownership

- `ConfigEmpresa` tiene dueño primario en Sprint 07 (SUNAT, series, correlativos)
  pero Sprint 09 consume y edita datos generales de la empresa (razón social, logo, dirección).
  Ambos sprints deben coordinarse para no pisar campos del otro.

---

## Cobertura de enums

Fuente: `apps/api/prisma/schema.prisma` y `packages/shared/src/enums/`

Conteo actual del schema: **22 enums**

| Enum | Valores | Sprint primario | Sprints relacionados |
|------|---------|-----------------|----------------------|
| `RolUsuario` | ADMIN, ENCARGADO, TECNICO | 01 | Todos |
| `TipoCliente` | NATURAL, EMPRESA | 02 | 11, 13 |
| `EstadoTicket` | ABIERTO, EN_PROCESO, EN_ESPERA, CERRADO, CANCELADO | 08 | 11, 14, 16 |
| `PrioridadTicket` | BAJA, MEDIA, ALTA, CRITICA | 08 | 11, 15 |
| `TipoServicio` | TALLER, VISITA, REMOTO | 08 | 11, 16 |
| `TipoMovimiento` | COMPRA_RECIBIDA, VENTA, CONSUMO_SOPORTE, DEVOLUCION_CLIENTE, DEVOLUCION_PROVEEDOR, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, TRANSFERENCIA, BAJA_DANO | 03 | 05, 06, 08 |
| `MovimientoComportamiento` | ENTRADA, SALIDA, TRANSFERENCIA | 03 | 09, 18 |
| `EstadoOrdenCompra` | BORRADOR, APROBADA, ENVIADA_PROVEEDOR, RECIBIDA_PARCIAL, RECIBIDA_TOTAL, CANCELADA | 05 | 12 |
| `EstadoVenta` | COTIZACION, ORDEN_CONFIRMADA, FACTURADA, ENTREGADA, CANCELADA | 06 | 07, 12 |
| `TipoDocumento` | FACTURA, BOLETA, NOTA_CREDITO, NOTA_DEBITO | 07 | 12 |
| `EstadoComprobante` | PENDIENTE, ENVIADO, ACEPTADO, RECHAZADO, ANULADO | 07 | 12, 14 |
| `TipoFiscalProducto` | BIEN, SERVICIO | 07 | 12, 17 |
| `TipoAfectacionIgv` | GRAVADO_OPERACION_ONEROSA, EXONERADO_OPERACION_ONEROSA, INAFECTO_OPERACION_ONEROSA, EXPORTACION | 07 | 12, 17 |
| `AmbienteSunat` | BETA, PRODUCCION | 07 | 12, 17, 19 |
| `CertificadoStorageProvider` | LOCAL_PRIVATE, MINIO_PRIVATE, SECRET_MANAGER | 07 | 12, 17, 19 |
| `EstadoGarantia` | ACTIVA, VENCIDA, ANULADA | 04 | 12, 13 |
| `EstadoEquipo` | ACTIVO, EN_REPARACION, BAJA | 04 | 08, 11 |
| `TipoProducto` | EQUIPO, REPUESTO, INSUMO, SERVICIO, ACCESORIO | 02 | 03, 04, 05, 06, 08, 11, 13 |
| `CondicionProducto` | NUEVO, SEMINUEVO, USADO, REACONDICIONADO, RECUPERADO | 02 | 04, 11, 13 |
| `EstadoComercialEquipo` | DISPONIBLE, VENDIDO, ALQUILADO, RESERVADO, EN_REPARACION, USO_INTERNO, BAJA | 04 | 06, 08, 11, 13 |
| `EstadoCaja` | ABIERTA, CERRADA | 12 | 06, 17 |
| `TipoMovimientoCaja` | INGRESO, EGRESO, VENTA, DEVOLUCION, RETIRO, DEPOSITO, AJUSTE | 12 | 06, 17 |

---

## Regla de cobertura

- [ ] Ningun sprint backend puede declararse completo si deja sin dueno una tabla del schema
- [ ] Ningun sprint backend puede declararse completo si deja sin dueno un enum usado por sus tablas
- [ ] Si se agrega una tabla o enum al `schema.prisma`, se debe actualizar este mapa
- [ ] Si una tabla cambia de responsable principal, se debe actualizar este mapa y el sprint afectado
