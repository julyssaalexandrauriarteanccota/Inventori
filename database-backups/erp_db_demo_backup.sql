--
-- PostgreSQL database dump
--

\restrict 26xKjI5tdeqenhQ8WVpShyJvJaQjhYpw8tzICFjKriIzV4kAw0WVFIySnTjn8Ra

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.ventas DROP CONSTRAINT IF EXISTS "ventas_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.ventas DROP CONSTRAINT IF EXISTS "ventas_metodoPagoId_fkey";
ALTER TABLE IF EXISTS ONLY public.ventas DROP CONSTRAINT IF EXISTS "ventas_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS "tickets_tecnicoId_fkey";
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS "tickets_equipoId_fkey";
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS "tickets_creadoPorId_fkey";
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS "tickets_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public.series_documento DROP CONSTRAINT IF EXISTS "series_documento_sedeFiscalId_fkey";
ALTER TABLE IF EXISTS ONLY public.series_documento DROP CONSTRAINT IF EXISTS "series_documento_configEmpresaFiscalId_fkey";
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS "refresh_tokens_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.recepciones_compra DROP CONSTRAINT IF EXISTS "recepciones_compra_ordenCompraId_fkey";
ALTER TABLE IF EXISTS ONLY public.productos DROP CONSTRAINT IF EXISTS "productos_unidadMedidaId_fkey";
ALTER TABLE IF EXISTS ONLY public.productos DROP CONSTRAINT IF EXISTS "productos_modeloCatalogoId_fkey";
ALTER TABLE IF EXISTS ONLY public.productos DROP CONSTRAINT IF EXISTS "productos_marcaId_fkey";
ALTER TABLE IF EXISTS ONLY public.productos DROP CONSTRAINT IF EXISTS "productos_categoriaId_fkey";
ALTER TABLE IF EXISTS ONLY public.producto_proveedores DROP CONSTRAINT IF EXISTS "producto_proveedores_proveedorId_fkey";
ALTER TABLE IF EXISTS ONLY public.producto_proveedores DROP CONSTRAINT IF EXISTS "producto_proveedores_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.producto_imagenes DROP CONSTRAINT IF EXISTS "producto_imagenes_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.ordenes_compra DROP CONSTRAINT IF EXISTS "ordenes_compra_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.ordenes_compra DROP CONSTRAINT IF EXISTS "ordenes_compra_proveedorId_fkey";
ALTER TABLE IF EXISTS ONLY public.notas_debito DROP CONSTRAINT IF EXISTS "notas_debito_comprobanteOrigenId_fkey";
ALTER TABLE IF EXISTS ONLY public.notas_credito DROP CONSTRAINT IF EXISTS "notas_credito_comprobanteOrigenId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_stock DROP CONSTRAINT IF EXISTS "movimientos_stock_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_stock DROP CONSTRAINT IF EXISTS "movimientos_stock_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_stock DROP CONSTRAINT IF EXISTS "movimientos_stock_almacenOrigenId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_stock DROP CONSTRAINT IF EXISTS "movimientos_stock_almacenDestinoId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS "movimientos_caja_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS "movimientos_caja_metodoPagoId_fkey";
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS "movimientos_caja_aperturaId_fkey";
ALTER TABLE IF EXISTS ONLY public.modelos_catalogo DROP CONSTRAINT IF EXISTS "modelos_catalogo_marcaId_fkey";
ALTER TABLE IF EXISTS ONLY public.lecturas_snmp DROP CONSTRAINT IF EXISTS "lecturas_snmp_equipoId_fkey";
ALTER TABLE IF EXISTS ONLY public.historial_tickets DROP CONSTRAINT IF EXISTS "historial_tickets_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.historial_tickets DROP CONSTRAINT IF EXISTS "historial_tickets_ticketId_fkey";
ALTER TABLE IF EXISTS ONLY public.garantias DROP CONSTRAINT IF EXISTS "garantias_ventaId_fkey";
ALTER TABLE IF EXISTS ONLY public.garantias DROP CONSTRAINT IF EXISTS "garantias_equipoId_fkey";
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS "equipos_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS "equipos_almacenId_fkey";
ALTER TABLE IF EXISTS ONLY public.equipo_clientes DROP CONSTRAINT IF EXISTS "equipo_clientes_ventaId_fkey";
ALTER TABLE IF EXISTS ONLY public.equipo_clientes DROP CONSTRAINT IF EXISTS "equipo_clientes_equipoId_fkey";
ALTER TABLE IF EXISTS ONLY public.equipo_clientes DROP CONSTRAINT IF EXISTS "equipo_clientes_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public.empresa_sedes_fiscales DROP CONSTRAINT IF EXISTS "empresa_sedes_fiscales_configEmpresaFiscalId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_venta DROP CONSTRAINT IF EXISTS "detalles_venta_ventaId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_venta DROP CONSTRAINT IF EXISTS "detalles_venta_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_ticket DROP CONSTRAINT IF EXISTS "detalles_ticket_ticketId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_ticket DROP CONSTRAINT IF EXISTS "detalles_ticket_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_recepcion DROP CONSTRAINT IF EXISTS "detalles_recepcion_recepcionId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_recepcion DROP CONSTRAINT IF EXISTS "detalles_recepcion_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_orden_compra DROP CONSTRAINT IF EXISTS "detalles_orden_compra_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.detalles_orden_compra DROP CONSTRAINT IF EXISTS "detalles_orden_compra_ordenCompraId_fkey";
ALTER TABLE IF EXISTS ONLY public.contactos_cliente DROP CONSTRAINT IF EXISTS "contactos_cliente_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.contactos_cliente DROP CONSTRAINT IF EXISTS "contactos_cliente_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public.comunicaciones_baja DROP CONSTRAINT IF EXISTS "comunicaciones_baja_comprobanteId_fkey";
ALTER TABLE IF EXISTS ONLY public.comprobantes DROP CONSTRAINT IF EXISTS "comprobantes_ventaId_fkey";
ALTER TABLE IF EXISTS ONLY public.comprobantes DROP CONSTRAINT IF EXISTS "comprobantes_comprobanteOrigenId_fkey";
ALTER TABLE IF EXISTS ONLY public.comprobante_envio_logs DROP CONSTRAINT IF EXISTS "comprobante_envio_logs_comprobanteId_fkey";
ALTER TABLE IF EXISTS ONLY public.comprobante_detalles DROP CONSTRAINT IF EXISTS "comprobante_detalles_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.comprobante_detalles DROP CONSTRAINT IF EXISTS "comprobante_detalles_comprobanteId_fkey";
ALTER TABLE IF EXISTS ONLY public.compatibilidades DROP CONSTRAINT IF EXISTS "compatibilidades_repuestoId_fkey";
ALTER TABLE IF EXISTS ONLY public.compatibilidades DROP CONSTRAINT IF EXISTS "compatibilidades_modeloId_fkey";
ALTER TABLE IF EXISTS ONLY public.cliente_validaciones_sunat DROP CONSTRAINT IF EXISTS "cliente_validaciones_sunat_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public.certificados_digitales DROP CONSTRAINT IF EXISTS "certificados_digitales_configEmpresaFiscalId_fkey";
ALTER TABLE IF EXISTS ONLY public.categorias DROP CONSTRAINT IF EXISTS "categorias_padreId_fkey";
ALTER TABLE IF EXISTS ONLY public.casos_garantia DROP CONSTRAINT IF EXISTS "casos_garantia_ticketId_fkey";
ALTER TABLE IF EXISTS ONLY public.casos_garantia DROP CONSTRAINT IF EXISTS "casos_garantia_garantiaId_fkey";
ALTER TABLE IF EXISTS ONLY public.auditoria DROP CONSTRAINT IF EXISTS "auditoria_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.arqueos_caja DROP CONSTRAINT IF EXISTS "arqueos_caja_usuarioId_fkey";
ALTER TABLE IF EXISTS ONLY public.arqueos_caja DROP CONSTRAINT IF EXISTS "arqueos_caja_aperturaId_fkey";
ALTER TABLE IF EXISTS ONLY public.aperturas_caja DROP CONSTRAINT IF EXISTS "aperturas_caja_usuarioCierreId_fkey";
ALTER TABLE IF EXISTS ONLY public.aperturas_caja DROP CONSTRAINT IF EXISTS "aperturas_caja_usuarioAperturaId_fkey";
ALTER TABLE IF EXISTS ONLY public.aperturas_caja DROP CONSTRAINT IF EXISTS "aperturas_caja_cajaId_fkey";
ALTER TABLE IF EXISTS ONLY public.almacen_stocks DROP CONSTRAINT IF EXISTS "almacen_stocks_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.almacen_stocks DROP CONSTRAINT IF EXISTS "almacen_stocks_almacenId_fkey";
ALTER TABLE IF EXISTS ONLY public.alertas_stock DROP CONSTRAINT IF EXISTS "alertas_stock_resueltaPorId_fkey";
ALTER TABLE IF EXISTS ONLY public.alertas_stock DROP CONSTRAINT IF EXISTS "alertas_stock_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public.alertas_stock DROP CONSTRAINT IF EXISTS "alertas_stock_almacenId_fkey";
ALTER TABLE IF EXISTS ONLY public.adjuntos_ticket DROP CONSTRAINT IF EXISTS "adjuntos_ticket_ticketId_fkey";
DROP INDEX IF EXISTS public."ventas_usuarioId_idx";
DROP INDEX IF EXISTS public.ventas_numero_key;
DROP INDEX IF EXISTS public."ventas_metodoPagoId_idx";
DROP INDEX IF EXISTS public."ventas_clienteId_idx";
DROP INDEX IF EXISTS public.usuarios_email_key;
DROP INDEX IF EXISTS public.unidades_medida_codigo_key;
DROP INDEX IF EXISTS public.tipos_movimiento_config_codigo_key;
DROP INDEX IF EXISTS public."tickets_tecnicoId_idx";
DROP INDEX IF EXISTS public.tickets_estado_idx;
DROP INDEX IF EXISTS public."tickets_equipoId_idx";
DROP INDEX IF EXISTS public."tickets_creadoPorId_idx";
DROP INDEX IF EXISTS public.tickets_codigo_key;
DROP INDEX IF EXISTS public."tickets_clienteId_idx";
DROP INDEX IF EXISTS public."series_documento_tipo_serie_codigoEstablecimiento_ambiente_key";
DROP INDEX IF EXISTS public.series_documento_tipo_idx;
DROP INDEX IF EXISTS public."series_documento_sedeFiscalId_idx";
DROP INDEX IF EXISTS public."series_documento_configEmpresaFiscalId_idx";
DROP INDEX IF EXISTS public.series_documento_ambiente_idx;
DROP INDEX IF EXISTS public.series_documento_activo_idx;
DROP INDEX IF EXISTS public."refresh_tokens_usuarioId_idx";
DROP INDEX IF EXISTS public.refresh_tokens_token_idx;
DROP INDEX IF EXISTS public."recepciones_compra_ordenCompraId_idx";
DROP INDEX IF EXISTS public.proveedores_ruc_key;
DROP INDEX IF EXISTS public."productos_unidadMedidaId_idx";
DROP INDEX IF EXISTS public.productos_tipo_idx;
DROP INDEX IF EXISTS public.productos_sku_key;
DROP INDEX IF EXISTS public."productos_modeloCatalogoId_idx";
DROP INDEX IF EXISTS public."productos_marcaId_idx";
DROP INDEX IF EXISTS public.productos_condicion_idx;
DROP INDEX IF EXISTS public."productos_codigoQr_key";
DROP INDEX IF EXISTS public."productos_codigoBarras_key";
DROP INDEX IF EXISTS public."productos_categoriaId_idx";
DROP INDEX IF EXISTS public."producto_proveedores_proveedorId_idx";
DROP INDEX IF EXISTS public."producto_proveedores_productoId_proveedorId_key";
DROP INDEX IF EXISTS public."producto_proveedores_productoId_idx";
DROP INDEX IF EXISTS public."producto_imagenes_productoId_idx";
DROP INDEX IF EXISTS public."ordenes_compra_usuarioId_idx";
DROP INDEX IF EXISTS public."ordenes_compra_proveedorId_idx";
DROP INDEX IF EXISTS public.ordenes_compra_numero_key;
DROP INDEX IF EXISTS public.notas_debito_numero_key;
DROP INDEX IF EXISTS public."notas_debito_comprobanteOrigenId_idx";
DROP INDEX IF EXISTS public.notas_credito_numero_key;
DROP INDEX IF EXISTS public."notas_credito_comprobanteOrigenId_idx";
DROP INDEX IF EXISTS public."movimientos_stock_usuarioId_idx";
DROP INDEX IF EXISTS public.movimientos_stock_tipo_idx;
DROP INDEX IF EXISTS public."movimientos_stock_productoId_idx";
DROP INDEX IF EXISTS public."movimientos_stock_almacenOrigenId_idx";
DROP INDEX IF EXISTS public."movimientos_stock_almacenDestinoId_idx";
DROP INDEX IF EXISTS public."movimientos_caja_usuarioId_idx";
DROP INDEX IF EXISTS public."movimientos_caja_referenciaTipo_referenciaId_idx";
DROP INDEX IF EXISTS public."movimientos_caja_metodoPagoId_idx";
DROP INDEX IF EXISTS public."movimientos_caja_aperturaId_idx";
DROP INDEX IF EXISTS public.modelos_catalogo_tipo_idx;
DROP INDEX IF EXISTS public."modelos_catalogo_marcaId_idx";
DROP INDEX IF EXISTS public.metodos_pago_codigo_key;
DROP INDEX IF EXISTS public.marcas_nombre_active_key;
DROP INDEX IF EXISTS public."lecturas_snmp_equipoId_idx";
DROP INDEX IF EXISTS public."historial_tickets_usuarioId_idx";
DROP INDEX IF EXISTS public."historial_tickets_ticketId_idx";
DROP INDEX IF EXISTS public."garantias_ventaId_idx";
DROP INDEX IF EXISTS public."garantias_equipoId_idx";
DROP INDEX IF EXISTS public."garantias_codigoQR_key";
DROP INDEX IF EXISTS public.fiscal_secrets_scope_name_key;
DROP INDEX IF EXISTS public.fiscal_secrets_scope_idx;
DROP INDEX IF EXISTS public."equipos_productoId_idx";
DROP INDEX IF EXISTS public."equipos_numeroSerie_key";
DROP INDEX IF EXISTS public."equipos_estadoComercial_idx";
DROP INDEX IF EXISTS public.equipos_condicion_idx;
DROP INDEX IF EXISTS public."equipos_codigoQr_key";
DROP INDEX IF EXISTS public."equipos_almacenId_idx";
DROP INDEX IF EXISTS public."equipo_clientes_ventaId_idx";
DROP INDEX IF EXISTS public."equipo_clientes_equipoId_idx";
DROP INDEX IF EXISTS public."equipo_clientes_clienteId_idx";
DROP INDEX IF EXISTS public."empresa_sedes_fiscales_configEmpresaFiscalId_idx";
DROP INDEX IF EXISTS public."empresa_sedes_fiscales_configEmpresaFiscalId_codigoEstablec_key";
DROP INDEX IF EXISTS public.empresa_sedes_fiscales_activo_idx;
DROP INDEX IF EXISTS public."detalles_venta_ventaId_idx";
DROP INDEX IF EXISTS public."detalles_venta_productoId_idx";
DROP INDEX IF EXISTS public."detalles_ticket_ticketId_idx";
DROP INDEX IF EXISTS public."detalles_ticket_productoId_idx";
DROP INDEX IF EXISTS public."detalles_recepcion_recepcionId_idx";
DROP INDEX IF EXISTS public."detalles_recepcion_productoId_idx";
DROP INDEX IF EXISTS public."detalles_orden_compra_productoId_idx";
DROP INDEX IF EXISTS public."detalles_orden_compra_ordenCompraId_idx";
DROP INDEX IF EXISTS public."contactos_cliente_usuarioId_idx";
DROP INDEX IF EXISTS public."contactos_cliente_clienteId_idx";
DROP INDEX IF EXISTS public.config_empresa_fiscal_ruc_key;
DROP INDEX IF EXISTS public."config_empresa_fiscal_codigoEstablecimiento_idx";
DROP INDEX IF EXISTS public."config_empresa_fiscal_ambienteDefault_idx";
DROP INDEX IF EXISTS public."comunicaciones_baja_ticketSunat_idx";
DROP INDEX IF EXISTS public."comunicaciones_baja_identificadorBaja_key";
DROP INDEX IF EXISTS public.comunicaciones_baja_estado_idx;
DROP INDEX IF EXISTS public."comunicaciones_baja_comprobanteId_idx";
DROP INDEX IF EXISTS public."comprobantes_ventaId_key";
DROP INDEX IF EXISTS public."comprobantes_ventaId_idx";
DROP INDEX IF EXISTS public.comprobantes_tipo_serie_idx;
DROP INDEX IF EXISTS public.comprobantes_numero_key;
DROP INDEX IF EXISTS public."comprobantes_fechaEmision_idx";
DROP INDEX IF EXISTS public.comprobantes_estado_idx;
DROP INDEX IF EXISTS public."comprobantes_comprobanteOrigenId_idx";
DROP INDEX IF EXISTS public.comprobante_envio_logs_tipo_idx;
DROP INDEX IF EXISTS public."comprobante_envio_logs_comprobanteId_intento_idx";
DROP INDEX IF EXISTS public."comprobante_envio_logs_comprobanteId_idx";
DROP INDEX IF EXISTS public."comprobante_detalles_tipoFiscalProducto_idx";
DROP INDEX IF EXISTS public."comprobante_detalles_tipoAfectacionIgv_idx";
DROP INDEX IF EXISTS public."comprobante_detalles_productoId_idx";
DROP INDEX IF EXISTS public."comprobante_detalles_comprobanteId_item_key";
DROP INDEX IF EXISTS public."comprobante_detalles_comprobanteId_idx";
DROP INDEX IF EXISTS public."compatibilidades_repuestoId_modeloId_key";
DROP INDEX IF EXISTS public."compatibilidades_repuestoId_idx";
DROP INDEX IF EXISTS public."compatibilidades_modeloId_idx";
DROP INDEX IF EXISTS public.clientes_ruc_key;
DROP INDEX IF EXISTS public.clientes_dni_key;
DROP INDEX IF EXISTS public."cliente_validaciones_sunat_tipoDocumentoSunat_numeroDocumen_key";
DROP INDEX IF EXISTS public.cliente_validaciones_sunat_estado_idx;
DROP INDEX IF EXISTS public."cliente_validaciones_sunat_clienteId_idx";
DROP INDEX IF EXISTS public."certificados_digitales_revokedAt_idx";
DROP INDEX IF EXISTS public."certificados_digitales_configEmpresaFiscalId_idx";
DROP INDEX IF EXISTS public.certificados_digitales_activo_idx;
DROP INDEX IF EXISTS public.categorias_tipo_idx;
DROP INDEX IF EXISTS public."categorias_padreId_idx";
DROP INDEX IF EXISTS public.categorias_nombre_active_key;
DROP INDEX IF EXISTS public."casos_garantia_ticketId_idx";
DROP INDEX IF EXISTS public."casos_garantia_garantiaId_idx";
DROP INDEX IF EXISTS public.cajas_nombre_key;
DROP INDEX IF EXISTS public."auditoria_usuarioId_idx";
DROP INDEX IF EXISTS public.auditoria_modelo_idx;
DROP INDEX IF EXISTS public."arqueos_caja_usuarioId_idx";
DROP INDEX IF EXISTS public."arqueos_caja_aperturaId_idx";
DROP INDEX IF EXISTS public."aperturas_caja_usuarioCierreId_idx";
DROP INDEX IF EXISTS public."aperturas_caja_usuarioAperturaId_idx";
DROP INDEX IF EXISTS public.aperturas_caja_estado_idx;
DROP INDEX IF EXISTS public."aperturas_caja_cajaId_idx";
DROP INDEX IF EXISTS public.almacenes_nombre_active_key;
DROP INDEX IF EXISTS public."almacen_stocks_productoId_idx";
DROP INDEX IF EXISTS public."almacen_stocks_almacenId_productoId_key";
DROP INDEX IF EXISTS public."almacen_stocks_almacenId_idx";
DROP INDEX IF EXISTS public."alertas_stock_resueltaPorId_idx";
DROP INDEX IF EXISTS public."alertas_stock_productoId_idx";
DROP INDEX IF EXISTS public."alertas_stock_almacenId_idx";
DROP INDEX IF EXISTS public."adjuntos_ticket_ticketId_idx";
DROP INDEX IF EXISTS public."adjuntos_entidad_entidadId_idx";
ALTER TABLE IF EXISTS ONLY public.ventas DROP CONSTRAINT IF EXISTS ventas_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.unidades_medida DROP CONSTRAINT IF EXISTS unidades_medida_pkey;
ALTER TABLE IF EXISTS ONLY public.tipos_movimiento_config DROP CONSTRAINT IF EXISTS tipos_movimiento_config_pkey;
ALTER TABLE IF EXISTS ONLY public.tickets DROP CONSTRAINT IF EXISTS tickets_pkey;
ALTER TABLE IF EXISTS ONLY public.series_documento DROP CONSTRAINT IF EXISTS series_documento_pkey;
ALTER TABLE IF EXISTS ONLY public.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.recepciones_compra DROP CONSTRAINT IF EXISTS recepciones_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.proveedores DROP CONSTRAINT IF EXISTS proveedores_pkey;
ALTER TABLE IF EXISTS ONLY public.productos DROP CONSTRAINT IF EXISTS productos_pkey;
ALTER TABLE IF EXISTS ONLY public.producto_proveedores DROP CONSTRAINT IF EXISTS producto_proveedores_pkey;
ALTER TABLE IF EXISTS ONLY public.producto_imagenes DROP CONSTRAINT IF EXISTS producto_imagenes_pkey;
ALTER TABLE IF EXISTS ONLY public.ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.notas_debito DROP CONSTRAINT IF EXISTS notas_debito_pkey;
ALTER TABLE IF EXISTS ONLY public.notas_credito DROP CONSTRAINT IF EXISTS notas_credito_pkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_stock DROP CONSTRAINT IF EXISTS movimientos_stock_pkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_pkey;
ALTER TABLE IF EXISTS ONLY public.modelos_catalogo DROP CONSTRAINT IF EXISTS modelos_catalogo_pkey;
ALTER TABLE IF EXISTS ONLY public.metodos_pago DROP CONSTRAINT IF EXISTS metodos_pago_pkey;
ALTER TABLE IF EXISTS ONLY public.marcas DROP CONSTRAINT IF EXISTS marcas_pkey;
ALTER TABLE IF EXISTS ONLY public.lecturas_snmp DROP CONSTRAINT IF EXISTS lecturas_snmp_pkey;
ALTER TABLE IF EXISTS ONLY public.historial_tickets DROP CONSTRAINT IF EXISTS historial_tickets_pkey;
ALTER TABLE IF EXISTS ONLY public.garantias DROP CONSTRAINT IF EXISTS garantias_pkey;
ALTER TABLE IF EXISTS ONLY public.fiscal_secrets DROP CONSTRAINT IF EXISTS fiscal_secrets_pkey;
ALTER TABLE IF EXISTS ONLY public.equipos DROP CONSTRAINT IF EXISTS equipos_pkey;
ALTER TABLE IF EXISTS ONLY public.equipo_clientes DROP CONSTRAINT IF EXISTS equipo_clientes_pkey;
ALTER TABLE IF EXISTS ONLY public.empresa_sedes_fiscales DROP CONSTRAINT IF EXISTS empresa_sedes_fiscales_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_venta DROP CONSTRAINT IF EXISTS detalles_venta_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_ticket DROP CONSTRAINT IF EXISTS detalles_ticket_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_recepcion DROP CONSTRAINT IF EXISTS detalles_recepcion_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_orden_compra DROP CONSTRAINT IF EXISTS detalles_orden_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.contactos_cliente DROP CONSTRAINT IF EXISTS contactos_cliente_pkey;
ALTER TABLE IF EXISTS ONLY public.config_empresa DROP CONSTRAINT IF EXISTS config_empresa_pkey;
ALTER TABLE IF EXISTS ONLY public.config_empresa_fiscal DROP CONSTRAINT IF EXISTS config_empresa_fiscal_pkey;
ALTER TABLE IF EXISTS ONLY public.comunicaciones_baja DROP CONSTRAINT IF EXISTS comunicaciones_baja_pkey;
ALTER TABLE IF EXISTS ONLY public.comprobantes DROP CONSTRAINT IF EXISTS comprobantes_pkey;
ALTER TABLE IF EXISTS ONLY public.comprobantes DROP CONSTRAINT IF EXISTS "comprobantes_operationId_key";
ALTER TABLE IF EXISTS ONLY public.comprobante_envio_logs DROP CONSTRAINT IF EXISTS comprobante_envio_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.comprobante_detalles DROP CONSTRAINT IF EXISTS comprobante_detalles_pkey;
ALTER TABLE IF EXISTS ONLY public.compatibilidades DROP CONSTRAINT IF EXISTS compatibilidades_pkey;
ALTER TABLE IF EXISTS ONLY public.clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE IF EXISTS ONLY public.cliente_validaciones_sunat DROP CONSTRAINT IF EXISTS cliente_validaciones_sunat_pkey;
ALTER TABLE IF EXISTS ONLY public.certificados_digitales DROP CONSTRAINT IF EXISTS certificados_digitales_pkey;
ALTER TABLE IF EXISTS ONLY public.categorias DROP CONSTRAINT IF EXISTS categorias_pkey;
ALTER TABLE IF EXISTS ONLY public.casos_garantia DROP CONSTRAINT IF EXISTS casos_garantia_pkey;
ALTER TABLE IF EXISTS ONLY public.cajas DROP CONSTRAINT IF EXISTS cajas_pkey;
ALTER TABLE IF EXISTS ONLY public.auditoria DROP CONSTRAINT IF EXISTS auditoria_pkey;
ALTER TABLE IF EXISTS ONLY public.arqueos_caja DROP CONSTRAINT IF EXISTS arqueos_caja_pkey;
ALTER TABLE IF EXISTS ONLY public.aperturas_caja DROP CONSTRAINT IF EXISTS aperturas_caja_pkey;
ALTER TABLE IF EXISTS ONLY public.almacenes DROP CONSTRAINT IF EXISTS almacenes_pkey;
ALTER TABLE IF EXISTS ONLY public.almacen_stocks DROP CONSTRAINT IF EXISTS almacen_stocks_pkey;
ALTER TABLE IF EXISTS ONLY public.alertas_stock DROP CONSTRAINT IF EXISTS alertas_stock_pkey;
ALTER TABLE IF EXISTS ONLY public.adjuntos_ticket DROP CONSTRAINT IF EXISTS adjuntos_ticket_pkey;
ALTER TABLE IF EXISTS ONLY public.adjuntos DROP CONSTRAINT IF EXISTS adjuntos_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.ventas;
DROP TABLE IF EXISTS public.usuarios;
DROP TABLE IF EXISTS public.unidades_medida;
DROP TABLE IF EXISTS public.tipos_movimiento_config;
DROP TABLE IF EXISTS public.tickets;
DROP TABLE IF EXISTS public.series_documento;
DROP TABLE IF EXISTS public.refresh_tokens;
DROP TABLE IF EXISTS public.recepciones_compra;
DROP TABLE IF EXISTS public.proveedores;
DROP TABLE IF EXISTS public.productos;
DROP TABLE IF EXISTS public.producto_proveedores;
DROP TABLE IF EXISTS public.producto_imagenes;
DROP TABLE IF EXISTS public.ordenes_compra;
DROP TABLE IF EXISTS public.notas_debito;
DROP TABLE IF EXISTS public.notas_credito;
DROP TABLE IF EXISTS public.movimientos_stock;
DROP TABLE IF EXISTS public.movimientos_caja;
DROP TABLE IF EXISTS public.modelos_catalogo;
DROP TABLE IF EXISTS public.metodos_pago;
DROP TABLE IF EXISTS public.marcas;
DROP TABLE IF EXISTS public.lecturas_snmp;
DROP TABLE IF EXISTS public.historial_tickets;
DROP TABLE IF EXISTS public.garantias;
DROP TABLE IF EXISTS public.fiscal_secrets;
DROP TABLE IF EXISTS public.equipos;
DROP TABLE IF EXISTS public.equipo_clientes;
DROP TABLE IF EXISTS public.empresa_sedes_fiscales;
DROP TABLE IF EXISTS public.detalles_venta;
DROP TABLE IF EXISTS public.detalles_ticket;
DROP TABLE IF EXISTS public.detalles_recepcion;
DROP TABLE IF EXISTS public.detalles_orden_compra;
DROP TABLE IF EXISTS public.contactos_cliente;
DROP TABLE IF EXISTS public.config_empresa_fiscal;
DROP TABLE IF EXISTS public.config_empresa;
DROP TABLE IF EXISTS public.comunicaciones_baja;
DROP TABLE IF EXISTS public.comprobantes;
DROP TABLE IF EXISTS public.comprobante_envio_logs;
DROP TABLE IF EXISTS public.comprobante_detalles;
DROP TABLE IF EXISTS public.compatibilidades;
DROP TABLE IF EXISTS public.clientes;
DROP TABLE IF EXISTS public.cliente_validaciones_sunat;
DROP TABLE IF EXISTS public.certificados_digitales;
DROP TABLE IF EXISTS public.categorias;
DROP TABLE IF EXISTS public.casos_garantia;
DROP TABLE IF EXISTS public.cajas;
DROP TABLE IF EXISTS public.auditoria;
DROP TABLE IF EXISTS public.arqueos_caja;
DROP TABLE IF EXISTS public.aperturas_caja;
DROP TABLE IF EXISTS public.almacenes;
DROP TABLE IF EXISTS public.almacen_stocks;
DROP TABLE IF EXISTS public.alertas_stock;
DROP TABLE IF EXISTS public.adjuntos_ticket;
DROP TABLE IF EXISTS public.adjuntos;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."TipoServicio";
DROP TYPE IF EXISTS public."TipoProducto";
DROP TYPE IF EXISTS public."TipoMovimientoCaja";
DROP TYPE IF EXISTS public."TipoMovimiento";
DROP TYPE IF EXISTS public."TipoFiscalProducto";
DROP TYPE IF EXISTS public."TipoEnvio";
DROP TYPE IF EXISTS public."TipoDocumento";
DROP TYPE IF EXISTS public."TipoCliente";
DROP TYPE IF EXISTS public."TipoAfectacionIgv";
DROP TYPE IF EXISTS public."RolUsuario";
DROP TYPE IF EXISTS public."PrioridadTicket";
DROP TYPE IF EXISTS public."MovimientoComportamiento";
DROP TYPE IF EXISTS public."EstadoVenta";
DROP TYPE IF EXISTS public."EstadoTicket";
DROP TYPE IF EXISTS public."EstadoOrdenCompra";
DROP TYPE IF EXISTS public."EstadoGarantia";
DROP TYPE IF EXISTS public."EstadoFacturacionVenta";
DROP TYPE IF EXISTS public."EstadoEquipo";
DROP TYPE IF EXISTS public."EstadoComunicacionBaja";
DROP TYPE IF EXISTS public."EstadoComprobante";
DROP TYPE IF EXISTS public."EstadoComercialEquipo";
DROP TYPE IF EXISTS public."EstadoCaja";
DROP TYPE IF EXISTS public."CondicionProducto";
DROP TYPE IF EXISTS public."CertificadoStorageProvider";
DROP TYPE IF EXISTS public."AmbienteSunat";
DROP EXTENSION IF EXISTS pgcrypto;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: AmbienteSunat; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AmbienteSunat" AS ENUM (
    'BETA',
    'PRODUCCION'
);


--
-- Name: CertificadoStorageProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificadoStorageProvider" AS ENUM (
    'LOCAL_PRIVATE',
    'MINIO_PRIVATE',
    'SECRET_MANAGER'
);


--
-- Name: CondicionProducto; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CondicionProducto" AS ENUM (
    'NUEVO',
    'USADO',
    'REACONDICIONADO',
    'RECUPERADO',
    'SEMINUEVO'
);


--
-- Name: EstadoCaja; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoCaja" AS ENUM (
    'ABIERTA',
    'CERRADA'
);


--
-- Name: EstadoComercialEquipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoComercialEquipo" AS ENUM (
    'DISPONIBLE',
    'VENDIDO',
    'ALQUILADO',
    'RESERVADO',
    'EN_REPARACION',
    'USO_INTERNO',
    'BAJA'
);


--
-- Name: EstadoComprobante; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoComprobante" AS ENUM (
    'PENDIENTE_ENVIO',
    'EN_PROCESO_SUNAT',
    'ACEPTADO',
    'ACEPTADO_CON_OBSERVACIONES',
    'RECHAZADO',
    'BAJA_PENDIENTE',
    'ANULADO'
);


--
-- Name: EstadoComunicacionBaja; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoComunicacionBaja" AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'ACEPTADA',
    'RECHAZADA'
);


--
-- Name: EstadoEquipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoEquipo" AS ENUM (
    'ACTIVO',
    'EN_REPARACION',
    'BAJA'
);


--
-- Name: EstadoFacturacionVenta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoFacturacionVenta" AS ENUM (
    'SIN_COMPROBANTE',
    'EN_EMISION',
    'EMITIDA',
    'EMITIDA_CON_OBS',
    'RECHAZADA',
    'ANULADA_FISCAL'
);


--
-- Name: EstadoGarantia; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoGarantia" AS ENUM (
    'ACTIVA',
    'VENCIDA',
    'ANULADA'
);


--
-- Name: EstadoOrdenCompra; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoOrdenCompra" AS ENUM (
    'BORRADOR',
    'APROBADA',
    'ENVIADA_PROVEEDOR',
    'RECIBIDA_PARCIAL',
    'RECIBIDA_TOTAL',
    'CANCELADA'
);


--
-- Name: EstadoTicket; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoTicket" AS ENUM (
    'ABIERTO',
    'EN_PROCESO',
    'EN_ESPERA',
    'CERRADO',
    'CANCELADO'
);


--
-- Name: EstadoVenta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EstadoVenta" AS ENUM (
    'COTIZACION',
    'ORDEN_CONFIRMADA',
    'ENTREGADA',
    'CANCELADA'
);


--
-- Name: MovimientoComportamiento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovimientoComportamiento" AS ENUM (
    'ENTRADA',
    'SALIDA',
    'TRANSFERENCIA'
);


--
-- Name: PrioridadTicket; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PrioridadTicket" AS ENUM (
    'BAJA',
    'MEDIA',
    'ALTA',
    'CRITICA'
);


--
-- Name: RolUsuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RolUsuario" AS ENUM (
    'ADMIN',
    'ENCARGADO',
    'TECNICO'
);


--
-- Name: TipoAfectacionIgv; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoAfectacionIgv" AS ENUM (
    'GRAVADO_OPERACION_ONEROSA',
    'EXONERADO_OPERACION_ONEROSA',
    'INAFECTO_OPERACION_ONEROSA',
    'EXPORTACION'
);


--
-- Name: TipoCliente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoCliente" AS ENUM (
    'NATURAL',
    'EMPRESA'
);


--
-- Name: TipoDocumento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoDocumento" AS ENUM (
    'FACTURA',
    'BOLETA',
    'NOTA_CREDITO',
    'NOTA_DEBITO'
);


--
-- Name: TipoEnvio; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoEnvio" AS ENUM (
    'ENVIO_INICIAL',
    'REINTENTO',
    'CONSULTA_TICKET',
    'COMUNICACION_BAJA'
);


--
-- Name: TipoFiscalProducto; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoFiscalProducto" AS ENUM (
    'BIEN',
    'SERVICIO'
);


--
-- Name: TipoMovimiento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoMovimiento" AS ENUM (
    'COMPRA_RECIBIDA',
    'VENTA',
    'CONSUMO_SOPORTE',
    'DEVOLUCION_CLIENTE',
    'DEVOLUCION_PROVEEDOR',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO',
    'TRANSFERENCIA',
    'BAJA_DANO'
);


--
-- Name: TipoMovimientoCaja; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoMovimientoCaja" AS ENUM (
    'INGRESO',
    'EGRESO',
    'VENTA',
    'DEVOLUCION',
    'RETIRO',
    'DEPOSITO',
    'AJUSTE'
);


--
-- Name: TipoProducto; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoProducto" AS ENUM (
    'EQUIPO',
    'REPUESTO',
    'INSUMO',
    'SERVICIO',
    'ACCESORIO'
);


--
-- Name: TipoServicio; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TipoServicio" AS ENUM (
    'TALLER',
    'VISITA',
    'REMOTO'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: adjuntos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adjuntos (
    id text NOT NULL,
    entidad text NOT NULL,
    "entidadId" text NOT NULL,
    url text NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    tamano integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: adjuntos_ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adjuntos_ticket (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    url text NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    tamano integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: alertas_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alertas_stock (
    id text NOT NULL,
    "productoId" text NOT NULL,
    "almacenId" text NOT NULL,
    "stockActual" integer NOT NULL,
    "stockMinimo" integer NOT NULL,
    resuelta boolean DEFAULT false NOT NULL,
    "resueltaPorId" text,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: almacen_stocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.almacen_stocks (
    id text NOT NULL,
    "almacenId" text NOT NULL,
    "productoId" text NOT NULL,
    cantidad integer DEFAULT 0 NOT NULL,
    ubicacion text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: almacenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.almacenes (
    id text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    direccion text,
    "esPrincipal" boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: aperturas_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aperturas_caja (
    id text NOT NULL,
    "cajaId" text NOT NULL,
    "usuarioAperturaId" text NOT NULL,
    "usuarioCierreId" text,
    estado public."EstadoCaja" DEFAULT 'ABIERTA'::public."EstadoCaja" NOT NULL,
    "montoInicial" numeric(12,2) NOT NULL,
    "montoEsperado" numeric(12,2),
    "montoContado" numeric(12,2),
    diferencia numeric(12,2),
    "notasApertura" text,
    "notasCierre" text,
    "abiertaEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cerradaEn" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: arqueos_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arqueos_caja (
    id text NOT NULL,
    "aperturaId" text NOT NULL,
    "usuarioId" text NOT NULL,
    "montoEsperado" numeric(12,2) NOT NULL,
    "montoContado" numeric(12,2) NOT NULL,
    diferencia numeric(12,2) NOT NULL,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id text NOT NULL,
    "usuarioId" text,
    accion text NOT NULL,
    modelo text NOT NULL,
    "modeloId" text,
    "datosAntes" jsonb,
    "datosDespues" jsonb,
    ip text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cajas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas (
    id text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    activa boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: casos_garantia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.casos_garantia (
    id text NOT NULL,
    "garantiaId" text NOT NULL,
    "ticketId" text,
    descripcion text NOT NULL,
    resolucion text,
    aceptada boolean,
    motivo text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "padreId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    tipo public."TipoProducto" DEFAULT 'REPUESTO'::public."TipoProducto" NOT NULL
);


--
-- Name: certificados_digitales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificados_digitales (
    id text NOT NULL,
    "configEmpresaFiscalId" text NOT NULL,
    nombre text NOT NULL,
    "storageProvider" public."CertificadoStorageProvider" DEFAULT 'LOCAL_PRIVATE'::public."CertificadoStorageProvider" NOT NULL,
    "storageKey" text NOT NULL,
    "passwordSecretRef" text,
    "fingerprintSha256" text,
    "serialNumber" text,
    subject text,
    issuer text,
    "validoDesde" timestamp(3) without time zone,
    "validoHasta" timestamp(3) without time zone,
    activo boolean DEFAULT false NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: cliente_validaciones_sunat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_validaciones_sunat (
    id text NOT NULL,
    "clienteId" text,
    "tipoDocumentoSunat" text NOT NULL,
    "numeroDocumento" text NOT NULL,
    "nombreNormalizado" text,
    "direccionFiscal" text,
    estado text NOT NULL,
    "condicionDomicilio" text,
    "ultimaValidacionAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id text NOT NULL,
    tipo public."TipoCliente" NOT NULL,
    nombre text,
    apellido text,
    dni text,
    "razonSocial" text,
    ruc text,
    email text,
    telefono text,
    celular text,
    direccion text,
    distrito text,
    provincia text,
    departamento text,
    referencia text,
    notas text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    latitud double precision,
    longitud double precision,
    "esGenerico" boolean DEFAULT false NOT NULL
);


--
-- Name: compatibilidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibilidades (
    id text NOT NULL,
    "repuestoId" text NOT NULL,
    "modeloId" text NOT NULL,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: comprobante_detalles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprobante_detalles (
    id text NOT NULL,
    "comprobanteId" text NOT NULL,
    "productoId" text,
    item integer NOT NULL,
    "codigoInterno" text,
    descripcion text NOT NULL,
    "unidadSunat" text NOT NULL,
    "tipoFiscalProducto" public."TipoFiscalProducto" NOT NULL,
    "tipoAfectacionIgv" public."TipoAfectacionIgv" NOT NULL,
    cantidad numeric(12,4) NOT NULL,
    "valorUnitario" numeric(12,4) NOT NULL,
    "precioUnitario" numeric(12,4) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    "baseImponible" numeric(10,2) NOT NULL,
    igv numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    "metadataFiscal" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: comprobante_envio_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprobante_envio_logs (
    id text NOT NULL,
    "comprobanteId" text NOT NULL,
    proveedor text,
    "tipoEvento" text,
    estado text,
    intento integer DEFAULT 1 NOT NULL,
    "requestPayload" jsonb,
    "responsePayload" jsonb,
    "codigoRespuesta" text,
    mensaje text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    tipo public."TipoEnvio",
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "responseCode" text,
    "responseDescription" text,
    "cdrStorageKey" text,
    "errorMessage" text,
    "durationMs" integer
);


--
-- Name: comprobantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprobantes (
    id text NOT NULL,
    "ventaId" text NOT NULL,
    tipo public."TipoDocumento" NOT NULL,
    serie text NOT NULL,
    correlativo integer NOT NULL,
    numero text NOT NULL,
    "clienteNombre" text NOT NULL,
    "clienteDocTipo" text NOT NULL,
    "clienteDocNum" text NOT NULL,
    "clienteDireccion" text,
    subtotal numeric(10,2) NOT NULL,
    igv numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    estado public."EstadoComprobante" DEFAULT 'PENDIENTE_ENVIO'::public."EstadoComprobante" NOT NULL,
    "xmlContent" text,
    "cdrContent" text,
    "codigoSunat" text,
    "mensajeSunat" text,
    "hashSunat" text,
    "fechaEmision" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaEnvio" timestamp(3) without time zone,
    "intentosEnvio" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "emisorRuc" text,
    "emisorRazonSocial" text,
    "emisorNombreComercial" text,
    "emisorDireccionFiscal" text,
    "emisorUbigeoFiscal" text,
    "emisorCodigoEstablecimiento" text,
    snapshot jsonb,
    ambiente public."AmbienteSunat" DEFAULT 'BETA'::public."AmbienteSunat" NOT NULL,
    "comprobanteOrigenId" text,
    "motivoNota" text,
    "motivoNotaDescripcion" text,
    "esNotaExcepcional" boolean DEFAULT false NOT NULL,
    "operationId" text,
    "ticketSunat" text,
    "hashCpe" text,
    "xmlStorageKey" text,
    "cdrStorageKey" text,
    "pdfStorageKey" text,
    "emitidoPor" text
);


--
-- Name: comunicaciones_baja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunicaciones_baja (
    id text NOT NULL,
    "comprobanteId" text NOT NULL,
    "identificadorBaja" text NOT NULL,
    motivo text NOT NULL,
    "fechaGeneracion" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaReferencia" timestamp(3) without time zone NOT NULL,
    estado public."EstadoComunicacionBaja" DEFAULT 'PENDIENTE'::public."EstadoComunicacionBaja" NOT NULL,
    "ticketSunat" text,
    "cdrStorageKey" text,
    "errorMessage" text,
    "iniciadoPor" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: config_empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_empresa (
    id text NOT NULL,
    "razonSocial" text NOT NULL,
    ruc text NOT NULL,
    direccion text NOT NULL,
    telefono text,
    email text,
    logo text,
    "serieFactura" text DEFAULT 'F001'::text NOT NULL,
    "serieBoleta" text DEFAULT 'B001'::text NOT NULL,
    "serieNotaCredito" text DEFAULT 'FC01'::text NOT NULL,
    "serieNotaDebito" text DEFAULT 'FD01'::text NOT NULL,
    "correlativoFactura" integer DEFAULT 0 NOT NULL,
    "correlativoBoleta" integer DEFAULT 0 NOT NULL,
    "correlativoNotaCredito" integer DEFAULT 0 NOT NULL,
    "correlativoNotaDebito" integer DEFAULT 0 NOT NULL,
    "porcentajeIGV" numeric(4,2) DEFAULT 18.00 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "nombreComercial" text,
    slogan text,
    "descripcionCorta" text,
    "descripcionSeo" text,
    rubro text,
    website text,
    "telefonoVentas" text,
    "telefonoSoporte" text,
    whatsapp text,
    "emailVentas" text,
    "emailSoporte" text,
    "logoDark" text,
    favicon text,
    "colorPrimario" text,
    "colorSecundario" text,
    "heroTitulo" text,
    "heroSubtitulo" text,
    "catalogoDescripcion" text,
    "contactoDescripcion" text,
    "garantiaDescripcion" text,
    "ticketDescripcion" text,
    "pwaDescripcion" text
);


--
-- Name: config_empresa_fiscal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_empresa_fiscal (
    id text NOT NULL,
    ruc text NOT NULL,
    "razonSocial" text NOT NULL,
    "nombreComercial" text,
    "direccionFiscal" text NOT NULL,
    "ubigeoFiscal" text,
    "codigoEstablecimiento" text,
    "correoSee" text,
    "regimenTributario" text,
    "formatoImpresionDefault" text,
    "pieImpresion" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ambienteDefault" public."AmbienteSunat" DEFAULT 'BETA'::public."AmbienteSunat" NOT NULL
);


--
-- Name: contactos_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contactos_cliente (
    id text NOT NULL,
    "clienteId" text NOT NULL,
    tipo text NOT NULL,
    descripcion text NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usuarioId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: detalles_orden_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_orden_compra (
    id text NOT NULL,
    "ordenCompraId" text NOT NULL,
    "productoId" text NOT NULL,
    cantidad integer NOT NULL,
    "cantidadRecibida" integer DEFAULT 0 NOT NULL,
    "precioUnitario" numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: detalles_recepcion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_recepcion (
    id text NOT NULL,
    "recepcionId" text NOT NULL,
    "productoId" text NOT NULL,
    "cantidadRecibida" integer NOT NULL
);


--
-- Name: detalles_ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_ticket (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "productoId" text NOT NULL,
    cantidad integer NOT NULL,
    "precioUnitario" numeric(10,2) NOT NULL,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cubiertoGarantia" boolean DEFAULT false NOT NULL
);


--
-- Name: detalles_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_venta (
    id text NOT NULL,
    "ventaId" text NOT NULL,
    "productoId" text NOT NULL,
    cantidad integer NOT NULL,
    "precioUnitario" numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "equipoSerie" text
);


--
-- Name: empresa_sedes_fiscales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa_sedes_fiscales (
    id text NOT NULL,
    "configEmpresaFiscalId" text NOT NULL,
    nombre text NOT NULL,
    "codigoEstablecimientoSunat" text NOT NULL,
    direccion text NOT NULL,
    ubigeo text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: equipo_clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipo_clientes (
    id text NOT NULL,
    "equipoId" text NOT NULL,
    "clienteId" text NOT NULL,
    "ventaId" text,
    "fechaInicio" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaFin" timestamp(3) without time zone,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: equipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos (
    id text NOT NULL,
    "numeroSerie" text NOT NULL,
    "productoId" text NOT NULL,
    estado public."EstadoEquipo" DEFAULT 'ACTIVO'::public."EstadoEquipo" NOT NULL,
    ubicacion text,
    firmware text,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "estadoComercial" public."EstadoComercialEquipo" DEFAULT 'DISPONIBLE'::public."EstadoComercialEquipo" NOT NULL,
    condicion public."CondicionProducto",
    procedencia text,
    "contadorInicial" integer,
    "contadorActual" integer,
    "fechaIngreso" timestamp(3) without time zone,
    "observacionEstado" text,
    "codigoQr" text,
    "almacenId" text,
    "ipAddress" text,
    "snmpCommunity" text DEFAULT 'public'::text,
    "snmpPort" integer DEFAULT 161
);


--
-- Name: fiscal_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_secrets (
    id text NOT NULL,
    scope text NOT NULL,
    name text NOT NULL,
    "encryptedValue" text NOT NULL,
    iv text NOT NULL,
    "authTag" text NOT NULL,
    algorithm text DEFAULT 'AES-256-GCM'::text NOT NULL,
    "keyVersion" text DEFAULT 'v1'::text NOT NULL,
    "rotatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: garantias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.garantias (
    id text NOT NULL,
    "equipoId" text NOT NULL,
    "ventaId" text,
    "clienteIdOriginal" text,
    "clienteDocTipo" text,
    "clienteDocNumero" text,
    "clienteNombre" text,
    "fechaInicio" timestamp(3) without time zone NOT NULL,
    "fechaFin" timestamp(3) without time zone NOT NULL,
    cobertura text NOT NULL,
    exclusiones text,
    estado public."EstadoGarantia" DEFAULT 'ACTIVA'::public."EstadoGarantia" NOT NULL,
    "codigoQR" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contadorInicio" integer,
    "contadorMaxCopias" integer
);


--
-- Name: historial_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_tickets (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "usuarioId" text,
    campo text NOT NULL,
    "valorAntes" text,
    "valorDespues" text,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: lecturas_snmp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecturas_snmp (
    id text NOT NULL,
    "equipoId" text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "nivelTonerNegro" integer,
    "nivelTonerCian" integer,
    "nivelTonerMagenta" integer,
    "nivelTonerAmarillo" integer,
    "paginasTotales" integer,
    "erroresActivos" text[],
    "estadoFusor" text,
    "rawData" jsonb
);


--
-- Name: marcas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marcas (
    id text NOT NULL,
    nombre text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    tipos public."TipoProducto"[] DEFAULT ARRAY['EQUIPO'::public."TipoProducto"] NOT NULL
);


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago (
    id text NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: modelos_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_catalogo (
    id text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    tipo public."TipoProducto" DEFAULT 'EQUIPO'::public."TipoProducto" NOT NULL,
    "marcaId" text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: movimientos_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_caja (
    id text NOT NULL,
    "aperturaId" text NOT NULL,
    tipo public."TipoMovimientoCaja" NOT NULL,
    monto numeric(12,2) NOT NULL,
    "metodoPagoId" text,
    concepto text NOT NULL,
    "referenciaTipo" text,
    "referenciaId" text,
    "usuarioId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: movimientos_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_stock (
    id text NOT NULL,
    tipo text NOT NULL,
    "productoId" text NOT NULL,
    "almacenOrigenId" text,
    "almacenDestinoId" text,
    cantidad integer NOT NULL,
    "cantidadAnterior" integer NOT NULL,
    "cantidadPosterior" integer NOT NULL,
    "costoUnitario" numeric(10,2),
    "referenciaId" text,
    "referenciaTipo" text,
    justificacion text,
    "usuarioId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notas_credito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas_credito (
    id text NOT NULL,
    "comprobanteOrigenId" text NOT NULL,
    tipo text NOT NULL,
    motivo text NOT NULL,
    monto numeric(10,2) NOT NULL,
    serie text NOT NULL,
    correlativo integer NOT NULL,
    numero text NOT NULL,
    estado public."EstadoComprobante" DEFAULT 'PENDIENTE_ENVIO'::public."EstadoComprobante" NOT NULL,
    "xmlContent" text,
    "cdrContent" text,
    "intentosEnvio" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: notas_debito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas_debito (
    id text NOT NULL,
    "comprobanteOrigenId" text NOT NULL,
    motivo text NOT NULL,
    monto numeric(10,2) NOT NULL,
    serie text NOT NULL,
    correlativo integer NOT NULL,
    numero text NOT NULL,
    estado public."EstadoComprobante" DEFAULT 'PENDIENTE_ENVIO'::public."EstadoComprobante" NOT NULL,
    "xmlContent" text,
    "cdrContent" text,
    "intentosEnvio" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ordenes_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordenes_compra (
    id text NOT NULL,
    numero text NOT NULL,
    "proveedorId" text NOT NULL,
    "usuarioId" text NOT NULL,
    estado public."EstadoOrdenCompra" DEFAULT 'BORRADOR'::public."EstadoOrdenCompra" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    igv numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    notas text,
    "fechaEsperada" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: producto_imagenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_imagenes (
    id text NOT NULL,
    "productoId" text NOT NULL,
    url text NOT NULL,
    nombre text,
    tipo text,
    tamano integer,
    "esPrincipal" boolean DEFAULT false NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: producto_proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_proveedores (
    id text NOT NULL,
    "productoId" text NOT NULL,
    "proveedorId" text NOT NULL,
    "codigoProveedor" text,
    "precioCompra" numeric(10,2),
    "esPrincipal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id text NOT NULL,
    sku text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    "categoriaId" text NOT NULL,
    "marcaId" text,
    modelo text,
    "precioCompra" numeric(10,2) NOT NULL,
    "precioVenta" numeric(10,2) NOT NULL,
    "precioMinimo" numeric(10,2) NOT NULL,
    "stockMinimo" integer DEFAULT 0 NOT NULL,
    "manejaInventario" boolean DEFAULT true NOT NULL,
    "tieneNumeroSerie" boolean DEFAULT false NOT NULL,
    "esConsumible" boolean DEFAULT false NOT NULL,
    imagen text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "unidadMedidaId" text NOT NULL,
    tipo public."TipoProducto" DEFAULT 'REPUESTO'::public."TipoProducto" NOT NULL,
    "codigoBarras" text,
    "codigoQr" text,
    condicion public."CondicionProducto",
    "requiereRepuestos" boolean DEFAULT false NOT NULL,
    "tiempoEstimadoMin" integer,
    "modeloCatalogoId" text,
    atributos jsonb,
    "garantiaMaxCopias" integer,
    "mesesGarantia" integer DEFAULT 12 NOT NULL
);


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id text NOT NULL,
    "razonSocial" text NOT NULL,
    ruc text NOT NULL,
    email text,
    telefono text,
    direccion text,
    "contactoNombre" text,
    "contactoTelefono" text,
    notas text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: recepciones_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recepciones_compra (
    id text NOT NULL,
    "ordenCompraId" text NOT NULL,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    "usuarioId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: series_documento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.series_documento (
    id text NOT NULL,
    tipo public."TipoDocumento" NOT NULL,
    serie text NOT NULL,
    "correlativoActual" integer DEFAULT 0 NOT NULL,
    "codigoEstablecimiento" text DEFAULT '0000'::text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "configEmpresaFiscalId" text,
    "sedeFiscalId" text,
    ambiente public."AmbienteSunat" DEFAULT 'BETA'::public."AmbienteSunat" NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id text NOT NULL,
    codigo text NOT NULL,
    "clienteId" text NOT NULL,
    "equipoId" text,
    "tecnicoId" text,
    "creadoPorId" text NOT NULL,
    titulo text NOT NULL,
    descripcion text NOT NULL,
    "fallaReportada" text,
    prioridad public."PrioridadTicket" DEFAULT 'MEDIA'::public."PrioridadTicket" NOT NULL,
    estado public."EstadoTicket" DEFAULT 'ABIERTO'::public."EstadoTicket" NOT NULL,
    "tipoServicio" public."TipoServicio" DEFAULT 'TALLER'::public."TipoServicio" NOT NULL,
    diagnostico text,
    solucion text,
    "montoManoObra" numeric(10,2),
    "montoRepuestos" numeric(10,2),
    "montoTotal" numeric(10,2),
    "fechaRecepcion" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaPromesa" timestamp(3) without time zone,
    "fechaCierre" timestamp(3) without time zone,
    "firmaCliente" text,
    "firmaFecha" timestamp(3) without time zone,
    "firmaGeoLat" double precision,
    "firmaGeoLng" double precision,
    notas text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: tipos_movimiento_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_movimiento_config (
    id text NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    comportamiento public."MovimientoComportamiento" NOT NULL,
    "requiereJustificacion" boolean DEFAULT false NOT NULL,
    "requiereEvidencia" boolean DEFAULT false NOT NULL,
    "disponibleTecnico" boolean DEFAULT false NOT NULL
);


--
-- Name: unidades_medida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_medida (
    id text NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id text NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    rol public."RolUsuario" NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    "ultimoAcceso" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    telefono text,
    celular text,
    whatsapp text,
    direccion text,
    cargo text,
    bio text,
    "avatarUrl" text
);


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id text NOT NULL,
    numero text NOT NULL,
    "clienteId" text NOT NULL,
    "usuarioId" text NOT NULL,
    "metodoPagoId" text,
    "referenciaPago" text,
    estado public."EstadoVenta" DEFAULT 'COTIZACION'::public."EstadoVenta" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    igv numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    notas text,
    "validoHasta" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "estadoFacturacion" public."EstadoFacturacionVenta" DEFAULT 'SIN_COMPROBANTE'::public."EstadoFacturacionVenta" NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
851d89fe-d2de-418b-97fb-c50289223909	3b06ae29c37c736f6c910fecc2286c4d3911aa570d334d4780115a474bba797d	2026-04-28 15:21:46.360456-05	20260406022029_init	\N	\N	2026-04-28 15:21:45.752605-05	1
04962fc4-f3e9-4b44-ada7-9c64be9e7a26	de903e22dca52dee32ae8bbfa3d5f81d6e1d98061e3a2810efca38cee839dab1	2026-04-28 15:21:46.373428-05	20260406143000_soft_delete_categorias_marcas	\N	\N	2026-04-28 15:21:46.3611-05	1
42c12256-35a4-4749-9e9d-6a1fabf29494	000516c2050f2c893d1edec85fee183a70a8224c97aea520b9e1ee4dc3ae7442	2026-05-02 15:33:49.437784-05	20260501103000_fiscalidad_minima	\N	\N	2026-05-02 15:33:49.138885-05	1
3f645de0-9752-4a78-bd2b-eefb561208cb	fd735348bc7d75436ec3cc1d9673ad1a7df399a27412c4a532f42e68b8ec1224	2026-04-28 15:21:46.383246-05	20260406224500_soft_delete_almacenes	\N	\N	2026-04-28 15:21:46.37529-05	1
9bafc95a-d160-46fe-8c21-c940fe2fa9f9	f78806ca112dca45312aab3631536fad29f096f73f91b5b2f8f649cf1e87265e	2026-04-28 15:21:46.418711-05	20260423090000_unidades_medida_catalogo	\N	\N	2026-04-28 15:21:46.384072-05	1
6f8f2207-90c9-4b61-bc43-b9c9f3534c19	f05d80da81efc7a8d396c95db07efaf96fe33b2617e437bd5108ab15cea2f7b6	2026-05-06 09:21:52.421101-05	20260506085128_doc01_arquitectura_fiscal	\N	\N	2026-05-06 09:21:52.133022-05	1
ff08ad8d-8de4-4fd3-bf13-7568585dc1f0	cdd164939c37703daaed1ab065680262328970072247c95d7a61ab29657409fe	2026-04-28 15:21:46.439992-05	20260425133000_tipos_movimiento_config	\N	\N	2026-04-28 15:21:46.419776-05	1
a3640fac-cb96-4929-ad69-a108bdec6e46	4e116973188c2a8fef6bc387a8f71622046a68a097f4de3efa6e3fdb5920d095	2026-05-02 15:33:49.441393-05	20260501120000_comprobante_emisor_snapshot	\N	\N	2026-05-02 15:33:49.4384-05	1
89183b80-6713-48d2-88c9-38859eb21188	1d33d7e199d9929840a80e4b97c47525aa551bb7748687db832e796b9c1080ed	2026-04-28 15:21:46.50992-05	20260425153000_tipos_movimiento_dinamicos	\N	\N	2026-04-28 15:21:46.441022-05	1
a754a0c3-30f1-4852-bada-39ba6fdd99f7	7af61fc70d30f04ca21260ecd8bb34102f3c4e8e2a4a033713e14b09f6631916	2026-04-28 15:21:46.514643-05	20260427110000_clientes_ubicacion_mapa	\N	\N	2026-04-28 15:21:46.510868-05	1
7d6f45e4-c7a6-4575-b32e-a1c5d4ccb736	5565eb454da85e474966e65e25592a74a8623f5c77181fe024bec734f83818e4	2026-04-28 15:21:46.629629-05	20260427143000_catalogo_tipos_producto	\N	\N	2026-04-28 15:21:46.515423-05	1
04cb1977-e15f-475a-9075-446a8e344e67	d76bb08d4da6c83f91cc8d30a53bf061ab1a2f3d1b65afed0e1b9f7a78c74513	2026-05-02 15:33:49.522287-05	20260501150000_sunat_directo_seguro	\N	\N	2026-05-02 15:33:49.442124-05	1
0d873b80-88a8-4452-844e-c9d0dd02ffe4	3027ab6a8daedd23b43bf65e27b964bcd34ef874aba08aa92af1282514f0fd52	2026-04-28 15:21:46.636386-05	20260427193000_marcas_tipos_seminuevo	\N	\N	2026-04-28 15:21:46.630231-05	1
839462d4-8c03-40fd-839a-413a723ddb77	847a2e30b2d2986fff9e4f28e819c9de7330c767ddea353f6b5cdcc260bf61de	2026-04-28 15:21:46.662715-05	20260427213000_modelos_catalogo_producto	\N	\N	2026-04-28 15:21:46.636946-05	1
7495eb54-1a97-4436-8341-ad47c60ce27b	5b73ec4c7c0f3ac10f0c7f2551b7279026d695f5498503a3862cfa0f6a36cddc	2026-04-28 15:21:46.675021-05	20260427223000_equipos_almacen_logistico	\N	\N	2026-04-28 15:21:46.663555-05	1
1c9cfb04-a47f-429e-8d7f-8da71230d940	79762b1224a131078e44945901b9464318a529a3acf5a83e720eb8a46eefa103	2026-05-03 19:14:50.213317-05	20260503160000_usuario_perfil_personal	\N	\N	2026-05-03 19:14:50.170786-05	1
e0b349f2-bcb7-4252-ab5d-87a927b72b73	fa74733fed8e4fa7314fac746d5b9a5761d349d85d87c2cb52ef66a4563d13ad	2026-04-28 15:22:01.281577-05	20260428202201_add_caja_y_cliente_generico	\N	\N	2026-04-28 15:22:01.065516-05	1
15d2e1bc-e726-4bb2-9a39-597d875830a9	5ac001ee197ba18048011f7cb6540ea696218481d6969325a06eab992bcc82a9	2026-05-01 00:42:33.540072-05	20260501090000_config_empresa_public_branding	\N	\N	2026-05-01 00:42:33.501689-05	1
4fbc3ad9-0432-482d-a854-9bb8ed4a8a50	fa65bca221c86027278dd8905b5dd01643fa101f003329e2dbb11edbd46abe89	2026-05-04 18:48:18.528339-05	20260504234818_add_producto_atributos	\N	\N	2026-05-04 18:48:18.488696-05	1
bfedeee2-46f5-4833-b4ae-74d2d57ef382	8977748ca37e69c9ce84b5559a030acd3ec5942aad963bc039b5d6f90b189621	2026-05-04 20:17:38.583762-05	20260505011738_equipo_snmp_config	\N	\N	2026-05-04 20:17:38.528613-05	1
def31edf-3ce3-457a-86fe-6ad870f3b757	ff44b58bc1459a959988a247930dc24465a2b963e9515a8b1f2ce257418320f0	2026-05-04 23:01:36.033502-05	20260505040135_detalle_ticket_cubierto_garantia	\N	\N	2026-05-04 23:01:35.980649-05	1
66fe7866-f58d-4572-9e38-4e3af9e3a3d1	a1a0eb51035930666471e4407bc7a2181912d80548659cb9b0f0d4dc96a2b04c	2026-05-05 19:36:57.304737-05	20260506003657_garantia_meses_y_copias	\N	\N	2026-05-05 19:36:57.249517-05	1
\.


--
-- Data for Name: adjuntos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.adjuntos (id, entidad, "entidadId", url, nombre, tipo, tamano, "createdAt") FROM stdin;
\.


--
-- Data for Name: adjuntos_ticket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.adjuntos_ticket (id, "ticketId", url, nombre, tipo, tamano, "createdAt") FROM stdin;
\.


--
-- Data for Name: alertas_stock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alertas_stock (id, "productoId", "almacenId", "stockActual", "stockMinimo", resuelta, "resueltaPorId", "resolvedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: almacen_stocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.almacen_stocks (id, "almacenId", "productoId", cantidad, ubicacion, "updatedAt") FROM stdin;
239c0c45-6c1f-4090-8f1d-dafb1b59f0a2	1ea3fb8a-4aea-48af-ad47-2db5199f7dc1	d187dead-e4ac-4e69-8021-5e1cce955204	1	\N	2026-05-04 19:45:06.492
\.


--
-- Data for Name: almacenes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.almacenes (id, nombre, descripcion, direccion, "esPrincipal", activo, "createdAt", "updatedAt", "deletedAt") FROM stdin;
1ea3fb8a-4aea-48af-ad47-2db5199f7dc1	Almacen principal		\N	f	t	2026-04-29 19:23:26.132	2026-04-29 19:23:26.132	\N
afa93b52-b29d-48ad-a9cb-f0fbf4c16171	Tienda		\N	f	f	2026-05-06 02:13:44.522	2026-05-06 02:14:27.25	2026-05-06 02:14:27.241
\.


--
-- Data for Name: aperturas_caja; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aperturas_caja (id, "cajaId", "usuarioAperturaId", "usuarioCierreId", estado, "montoInicial", "montoEsperado", "montoContado", diferencia, "notasApertura", "notasCierre", "abiertaEn", "cerradaEn", "createdAt", "updatedAt") FROM stdin;
f2c22324-9bb1-43a4-95b3-ecab27d3ca98	48838042-3af9-4211-bbf5-fdc2ff7573b1	9cd8b54b-435b-41fc-9ce9-32226316aef4	\N	ABIERTA	400.00	400.00	\N	\N	\N	\N	2026-04-29 03:33:17.71	\N	2026-04-29 03:33:17.71	2026-04-29 03:33:17.71
\.


--
-- Data for Name: arqueos_caja; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.arqueos_caja (id, "aperturaId", "usuarioId", "montoEsperado", "montoContado", diferencia, notas, "createdAt") FROM stdin;
\.


--
-- Data for Name: auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auditoria (id, "usuarioId", accion, modelo, "modeloId", "datosAntes", "datosDespues", ip, "userAgent", "createdAt") FROM stdin;
4795ee35-04b1-44d5-a7b8-326b685c5d78	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": true}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDE0NDYwLCJleHAiOjE3Nzc0NDMyNjB9.xjquOWBuE927tLCL8Prygsk-wKvumE0axoj4jaaUKqM", "refreshToken": "3e232463c45a8830ce283335e15eb17eaadcf2d54517e5c730386e481eeeba28676e62aa6d4a34d7dc907630070336a53ab032f164c08d8b5f81cc08645a82b6"}, "meta": {"timestamp": "2026-04-28T22:14:20.092Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; es-PE) PowerShell/7.6.1	2026-04-28 22:14:20.099
101cddd5-c940-4ab2-8b1a-e537c9f5abcb	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": true}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDE0NTAwLCJleHAiOjE3Nzc0NDMzMDB9.XiYDt4fKSQGCh8Hje0cSTRc0K-Kxy2lGp7NFsoXZ1WQ", "refreshToken": "78b40c4962deafbfafa8281e9d08974bbbf95b42d05dd2222b2f79ce73d40338e0c35c192e98738c6caefb9525b64a1768d122957f4b09b677dc6a1134d9e359"}, "meta": {"timestamp": "2026-04-28T22:15:00.469Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-28 22:15:00.472
4ecb7966-55d8-4c06-b76d-55b4578ff85b	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	auth	change-password	\N	{"data": {"message": "Contrasena actualizada correctamente."}, "meta": {"timestamp": "2026-04-28T22:15:18.963Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-28 22:15:18.965
c8554802-6895-483b-815b-1eb174d96046	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDIyMjExLCJleHAiOjE3Nzc0NTEwMTF9.w9jWjGFGG24-7QuVgCfntOPOzoB2ly-XGPPvhhhudRY", "refreshToken": "49534580f1ec41adc928975988f1ed96535a3a9bb6992986aa610b09a565f5f97c3f3763350730f653818d145b0c87ed07032c5f6a048a0ffb82182dc6c0de74"}, "meta": {"timestamp": "2026-04-29T00:23:31.256Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-29 00:23:31.26
ae2bfb11-2266-4047-946b-defd9f5fe0b8	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDIyMjE0LCJleHAiOjE3Nzc0NTEwMTR9.QQ85O72JIrK6piHEvPWsRR76R0lIigjYqM1x9SM4NQE", "refreshToken": "7f7cf1938c10db6ab3f43f5bd4f790ad7efbbabe447ce9d755d01fce7ef43668c526de9236cf5c6ae637cfe2dc46782ad70ed335b27f21e81feef830c77e3ae1"}, "meta": {"timestamp": "2026-04-29T00:23:34.879Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-29 00:23:34.882
77e91025-c95a-42a7-95c7-18da581f6f2a	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDI4OTcyLCJleHAiOjE3Nzc0NTc3NzJ9.FvIiN-jY5JW9N6DoHkTHidb3qsByLJYQuCsW_i_FVYk", "refreshToken": "ae8c9aa8c4257f4b31cabf546429e5275cda3e6801b8dc7c0a4ceeede766e7c2601be5b6b64a3689273e72f4261bcc872b658c0c516fb4e4778cf58686761488"}, "meta": {"timestamp": "2026-04-29T02:16:12.865Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-04-29 02:16:12.868
327f8e44-c2ee-4b2e-bfb8-15fd0b18ae1a	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	caja	cajas	\N	{"data": {"id": "48838042-3af9-4211-bbf5-fdc2ff7573b1", "activa": true, "nombre": "Caja Principal", "createdAt": "2026-04-29T03:33:05.031Z", "updatedAt": "2026-04-29T03:33:05.031Z", "descripcion": null}, "meta": {"timestamp": "2026-04-29T03:33:05.042Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-29 03:33:05.048
c98ee939-b407-433c-ac0d-25256f4c3937	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	caja	aperturas	\N	{"data": {"id": "f2c22324-9bb1-43a4-95b3-ecab27d3ca98", "caja": {"id": "48838042-3af9-4211-bbf5-fdc2ff7573b1", "activa": true, "nombre": "Caja Principal", "createdAt": "2026-04-29T03:33:05.031Z", "updatedAt": "2026-04-29T03:33:05.031Z", "descripcion": null}, "cajaId": "48838042-3af9-4211-bbf5-fdc2ff7573b1", "estado": "ABIERTA", "abiertaEn": "2026-04-29T03:33:17.710Z", "cerradaEn": null, "createdAt": "2026-04-29T03:33:17.710Z", "updatedAt": "2026-04-29T03:33:17.710Z", "diferencia": null, "notasCierre": null, "montoContado": null, "montoInicial": "400", "montoEsperado": "400", "notasApertura": null, "usuarioApertura": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "nombre": "Administrador", "apellido": "Sistema"}, "usuarioCierreId": null, "usuarioAperturaId": "9cd8b54b-435b-41fc-9ce9-32226316aef4"}, "meta": {"timestamp": "2026-04-29T03:33:17.721Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-29 03:33:17.722
d22de692-9fe7-4bd1-bd72-9fc2abfa5d8e	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDg5MTg1LCJleHAiOjE3Nzc1MTc5ODV9.hWwbjrVa2tvzOjFSQHXhjJYlBzrc9igm-XBmsflfA4Y", "refreshToken": "971f43b793694b65017c5650b4bc750dd44282a9ac354d6d52ddc9b34cf765b6a230d25474da5592a455b9995dfb7fa1d9b3e2e50c2dfcc1bb8be509d2bd3712"}, "meta": {"timestamp": "2026-04-29T18:59:45.577Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-29 18:59:45.582
599bc50c-78e4-442e-8ffa-b53438ad58c8	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/336948af-7858-4974-98b8-33d903398cf5.jpg", "size": 23644, "isImage": true, "filename": "336948af-7858-4974-98b8-33d903398cf5.jpg", "mimeType": "image/jpeg", "originalName": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg"}, "meta": {"timestamp": "2026-05-05T00:00:03.130Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:00:03.132
2c2fad0c-f573-46a3-bf66-bbe06904edee	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDg5NzUyLCJleHAiOjE3Nzc1MTg1NTJ9.FusX1Yhcwwxvhf7oOaMylJTUxIGZsY91o4K7p4U9arI", "refreshToken": "781eb2e71c1e902354131ff14098c8e5a68a01801aeef18e48361e4694ab428d816f2840522d99cb82196a099c0d529bdd2a6863cac95659230cfd1fde644e45"}, "meta": {"timestamp": "2026-04-29T19:09:12.010Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-04-29 19:09:12.011
2e7ac8a9-f72a-4f18-953e-2e4ecfba19ad	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	inventario	almacenes	\N	{"data": {"id": "1ea3fb8a-4aea-48af-ad47-2db5199f7dc1", "activo": true, "nombre": "Almacen principal", "createdAt": "2026-04-29T19:23:26.132Z", "deletedAt": null, "direccion": null, "updatedAt": "2026-04-29T19:23:26.132Z", "descripcion": "", "esPrincipal": false}, "meta": {"timestamp": "2026-04-29T19:23:26.153Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-04-29 19:23:26.157
6a3bc3d5-98d4-4d10-844b-b64674da3fcb	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	categorias	\N	\N	{"data": {"id": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "tipo": "EQUIPO", "nombre": "Impresoras", "padreId": null, "createdAt": "2026-04-29T19:23:54.979Z", "deletedAt": null, "updatedAt": "2026-04-29T19:23:54.979Z", "descripcion": null}, "meta": {"timestamp": "2026-04-29T19:23:54.995Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-04-29 19:23:54.998
8b518992-53f9-4bf2-97f1-e9706711b386	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	marcas	\N	\N	{"data": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "tipos": ["EQUIPO"], "nombre": "Konica minolta", "createdAt": "2026-04-29T19:24:14.796Z", "deletedAt": null, "updatedAt": "2026-04-29T19:24:14.796Z"}, "meta": {"timestamp": "2026-04-29T19:24:14.811Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-04-29 19:24:14.813
364f07dc-bc2c-4723-a3a5-29de0f933787	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	modelos	\N	\N	{"data": {"id": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "activo": true, "nombre": "Bizhub 888", "marcaId": "31ec3903-250b-49c1-8a97-444f6d9e6049", "createdAt": "2026-04-29T19:24:40.740Z", "deletedAt": null, "updatedAt": "2026-04-29T19:24:40.740Z", "descripcion": null}, "meta": {"timestamp": "2026-04-29T19:24:40.750Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.422.30944 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-04-29 19:24:40.751
79d33d31-111e-492f-aaab-2f32c03de222	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NDkxNzIwLCJleHAiOjE3Nzc1MjA1MjB9.CegYT19JfcoVrYmQDUvPHzP3uqD6wgkMiJlSc2nOyvk", "refreshToken": "b555151b83ca33b6f5d03bc1d60be0610e6a5dd88b82c113df6051faac12334e2c5c9135775982431abc33a58bed55a4b514a1a5969520f1cbed89eaaa4a9a9b"}, "meta": {"timestamp": "2026-04-29T19:42:00.139Z"}}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-29 19:42:00.149
4ce0a444-6df2-4fad-97eb-24bc17e3d01f	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NTc4NTE3LCJleHAiOjE3Nzc2MDczMTd9.74e2lOOqIjTsuG4Ii8vi-dDGBIDUGoQjfvAyvP_HgKg", "refreshToken": "800894977d3505c584f90b011911e2b7a76890325f76241c7c9a3dc6931fd110bbce70e95e5c7fb33414e4fc15c46e87f3ec43f9e58dba696fb4737c755c4715"}, "meta": {"timestamp": "2026-04-30T19:48:37.390Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-30 19:48:37.397
fa2ad4d4-7dd5-4286-b29d-91147d6f0463	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NjA4MDgwLCJleHAiOjE3Nzc2MzY4ODB9.fR86dHB8Msk78nJNDRNXEn53foW-Fa-qSuhaR3kc4zc", "refreshToken": "d3b652cb4469b0a1cc86ce249ea7d2ff7503e03a154c298c8043cd8737d4ad7bc3fbb332affc7c1ea4d954ebd97db60e96c1818edd984bfb399549fe87b5f415"}, "meta": {"timestamp": "2026-05-01T04:01:20.667Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-01 04:01:20.673
6f1d6504-94d0-4803-aee6-fd79a137e1e1	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NjE4NDYzLCJleHAiOjE3Nzc2NDcyNjN9.Ur-ByFM5avhYOlBdfK_ol0DJM_kINPgJw9LQfUWNFuQ", "refreshToken": "6cfe72f66ad3f5bb9d2dced1632671cfa8e6f36e92b9dabed860ce71d94c3ebba380015a3ad262c717e171d623a0361f89ca6b4fd358d7c6a4cb8d31e25ceeda"}, "meta": {"timestamp": "2026-05-01T06:54:23.105Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-01 06:54:23.12
04a652e7-100e-4377-9b7e-0a251f567e00	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NjYyODc2LCJleHAiOjE3Nzc2OTE2NzZ9.y8Od0OlWQ9Kc7TM6ET-zeipl00yhVxq-H-zJRJ6VhWU", "refreshToken": "2117f7b5deabe62c80d599cf6025876490975a29311e0100b8be35d35c9a598cc05021727fb208694164afacbe79fe2cfa1fcb62652fab8fa8b8e01e81c382e4"}, "meta": {"timestamp": "2026-05-01T19:14:36.667Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-01 19:14:36.696
0173c591-b6b0-470f-a73c-0625fa765156	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	config	empresa	\N	{"data": {"id": "empresa", "ruc": "", "logo": "", "email": "", "rubro": "", "slogan": "", "favicon": "", "website": "", "logoDark": "", "telefono": "", "whatsapp": "", "direccion": "", "updatedAt": "2026-05-01T23:05:07.396Z", "heroTitulo": "", "emailVentas": "", "razonSocial": "FORSE SUR S.A.C.", "serieBoleta": "B001", "emailSoporte": "", "serieFactura": "F001", "colorPrimario": "", "heroSubtitulo": "", "porcentajeIGV": "18", "descripcionSeo": "", "pwaDescripcion": "", "telefonoVentas": "", "colorSecundario": "", "nombreComercial": "Force Importaciones", "serieNotaDebito": "FD01", "telefonoSoporte": "", "descripcionCorta": "", "serieNotaCredito": "FC01", "correlativoBoleta": 0, "ticketDescripcion": "", "correlativoFactura": 0, "catalogoDescripcion": "", "contactoDescripcion": "", "garantiaDescripcion": "", "correlativoNotaDebito": 0, "correlativoNotaCredito": 0}, "meta": {"timestamp": "2026-05-01T23:05:07.431Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-01 23:05:07.463
dcf95de9-5d04-4760-a6b3-73b552ac8700	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3Njg0MDYxLCJleHAiOjE3Nzc3MTI4NjF9.EE62gRfQI5jhv8bvgO9hVYEqt_8N7WjZsAoEVztjRcY", "refreshToken": "f6e0e5e35fe9124276eff1f65f1bf0fb779842b8712924f5313e797a5756af037dd930021fab6b584ce22c2721cf04d5caf48dab7192e1d3dd7ed78f2732c9e3"}, "meta": {"timestamp": "2026-05-02T01:07:41.725Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-02 01:07:41.733
6d32f3db-3c6b-4361-8f5a-1dc751b29193	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3NzQ5NTQ1LCJleHAiOjE3Nzc3NzgzNDV9.lZrjzc-MAyPHtK5aunJIjLsrK2e3TNY14dOzZZQUbvo", "refreshToken": "924f7427980ae678059d82756b6cbb06c50af526c77748ef229af90be0a5a6304aa96a94f8668de9fe63d42164a773aa35770abcacdd57b34f0829ec77ac5436"}, "meta": {"timestamp": "2026-05-02T19:19:05.888Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-02 19:19:05.891
8bfd8c60-644f-4915-85d2-1d9a907cf647	\N	CREAR	auth	refresh	\N	{"data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3Nzc4NjIxLCJleHAiOjE3Nzc4MDc0MjF9.QdwD-p1T9xW0kOubhIoLfqY4dvvV-ucdN1EMCVJ91S4", "refreshToken": "fb1dc6280782d4d189a787c971a56492666a30abc56f103bb9df28e45d8e74c3c51172adc71070b4cb954ce8ede8feb95fb6d763e255cc41f8aae7ccc75a3d67"}, "meta": {"timestamp": "2026-05-03T03:23:41.356Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 03:23:41.363
637aabad-f475-430b-921e-2f2be22b46d3	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	categorias	\N	\N	{"data": {"id": "b7af771f-a761-4857-ba1b-9e61c385bb87", "tipo": "REPUESTO", "nombre": "Equipos", "padreId": null, "createdAt": "2026-05-03T03:50:13.165Z", "deletedAt": null, "updatedAt": "2026-05-03T03:50:13.165Z", "descripcion": null}, "meta": {"timestamp": "2026-05-03T03:50:13.177Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 03:50:13.183
f81ea476-80ec-4f11-a36d-e0189d008f2b	9cd8b54b-435b-41fc-9ce9-32226316aef4	ELIMINAR	categorias	b7af771f-a761-4857-ba1b-9e61c385bb87	\N	{"meta": {"timestamp": "2026-05-03T03:50:44.929Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 03:50:44.931
185cf092-5194-4f7a-bf93-d5abd252fddf	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "rol": "ADMIN", "email": "admin@erp.local", "nombre": "Administrador", "apellido": "Sistema", "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3ODIxNzY3LCJleHAiOjE3Nzc4NTA1Njd9.oTq6vtAAmJqXwqoCz4_3czAKAFoXzak2bMMKFl324Wk", "refreshToken": "8f2bc42502287f63e5fa39d8555bd12dbaddc5dfbffe1d15e3aeaf5873edc0dac50901e2ac6255f61d287773ddb41a74f0aa20cf89eb5582a15ace30bdae190a"}, "meta": {"timestamp": "2026-05-03T15:22:47.306Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 15:22:47.311
a84f1fbc-781f-42d0-8107-39a1ac91d2d4	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/adc774f5-7ffe-40a9-9dd3-4467f473e13b.jpg", "size": 9143, "isImage": true, "filename": "adc774f5-7ffe-40a9-9dd3-4467f473e13b.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-03T15:40:49.520Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 15:40:49.523
a3482d63-211c-427e-8b03-116a12c8f4a4	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	config	empresa	\N	{"data": {"id": "empresa", "ruc": "", "logo": "/uploads/public/adc774f5-7ffe-40a9-9dd3-4467f473e13b.jpg", "email": "", "rubro": "", "slogan": "", "favicon": "", "website": "", "logoDark": "", "telefono": "", "whatsapp": "", "direccion": "", "updatedAt": "2026-05-03T15:40:55.725Z", "heroTitulo": "", "emailVentas": "", "razonSocial": "FORSE SUR S.A.C.", "serieBoleta": "B001", "emailSoporte": "", "serieFactura": "F001", "colorPrimario": "#EA580C", "heroSubtitulo": "", "porcentajeIGV": "18", "descripcionSeo": "", "pwaDescripcion": "", "telefonoVentas": "", "colorSecundario": "#EA580C", "nombreComercial": "Force Importaciones", "serieNotaDebito": "FD01", "telefonoSoporte": "", "descripcionCorta": "", "serieNotaCredito": "FC01", "correlativoBoleta": 0, "ticketDescripcion": "", "correlativoFactura": 0, "catalogoDescripcion": "", "contactoDescripcion": "", "garantiaDescripcion": "", "correlativoNotaDebito": 0, "correlativoNotaCredito": 0}, "meta": {"timestamp": "2026-05-03T15:40:55.733Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 15:40:55.735
4bf57049-4c96-40f4-a0eb-e8eba712454e	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/cfda4bbf-31c2-4c38-9951-385b68d1ab26.jpg", "size": 9143, "isImage": true, "filename": "cfda4bbf-31c2-4c38-9951-385b68d1ab26.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-05T00:00:37.113Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:00:37.113
9711c974-29c1-4399-ad2d-59c0560911af	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	config	empresa	\N	{"data": {"id": "empresa", "ruc": "", "logo": "", "email": "", "rubro": "", "slogan": "", "favicon": "", "website": "", "logoDark": "", "telefono": "", "whatsapp": "", "direccion": "", "updatedAt": "2026-05-03T15:41:32.215Z", "heroTitulo": "", "emailVentas": "", "razonSocial": "FORSE SUR S.A.C.", "serieBoleta": "B001", "emailSoporte": "", "serieFactura": "F001", "colorPrimario": "#EA580C", "heroSubtitulo": "", "porcentajeIGV": "18", "descripcionSeo": "", "pwaDescripcion": "", "telefonoVentas": "", "colorSecundario": "#EA580C", "nombreComercial": "Force Importaciones", "serieNotaDebito": "FD01", "telefonoSoporte": "", "descripcionCorta": "", "serieNotaCredito": "FC01", "correlativoBoleta": 0, "ticketDescripcion": "", "correlativoFactura": 0, "catalogoDescripcion": "", "contactoDescripcion": "", "garantiaDescripcion": "", "correlativoNotaDebito": 0, "correlativoNotaCredito": 0}, "meta": {"timestamp": "2026-05-03T15:41:32.219Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 15:41:32.225
163e5f55-0c63-4053-b114-0910ccde8edc	9cd8b54b-435b-41fc-9ce9-32226316aef4	ELIMINAR	config	metodos-pago	\N	{"data": {"id": "177f2208-75a4-4958-992b-2dc01297cd96", "activo": true, "codigo": "TARJETA_CREDITO", "nombre": "Tarjeta de crédito", "createdAt": "2026-05-02T20:34:00.822Z", "updatedAt": "2026-05-02T20:34:00.822Z"}, "meta": {"timestamp": "2026-05-03T17:11:20.231Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 17:11:20.252
f722ef2b-a356-4e5d-8bdb-a1868466ebcc	9cd8b54b-435b-41fc-9ce9-32226316aef4	ELIMINAR	config	metodos-pago	\N	{"data": {"id": "e17ede82-1c0d-4af9-8313-9f46050d5c5e", "activo": true, "codigo": "TARJETA_DEBITO", "nombre": "Tarjeta de débito", "createdAt": "2026-05-02T20:34:00.824Z", "updatedAt": "2026-05-02T20:34:00.824Z"}, "meta": {"timestamp": "2026-05-03T17:11:26.875Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 17:11:26.878
bfe9b256-5b17-49bd-b70f-11a9944f329a	9cd8b54b-435b-41fc-9ce9-32226316aef4	ELIMINAR	config	metodos-pago	\N	{"data": {"id": "ea25142d-0b30-4739-9632-709bb85eb64f", "activo": true, "codigo": "YAPE_PLIN", "nombre": "Yape / Plin", "createdAt": "2026-04-28T20:22:35.613Z", "updatedAt": "2026-05-02T20:34:00.820Z"}, "meta": {"timestamp": "2026-05-03T20:28:37.880Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 20:28:37.895
460c01be-9547-4475-bfc9-39fe3378da83	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/6d8cd076-3d91-46a5-8216-b224a5009932.png", "size": 2141496, "isImage": true, "filename": "6d8cd076-3d91-46a5-8216-b224a5009932.png", "mimeType": "image/png", "originalName": "Michael (1) (2) (1) (1) (1) (1) (1).png"}, "meta": {"timestamp": "2026-05-03T21:02:02.818Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-03 21:02:02.835
a1341ff9-f100-4388-ab42-31fb2f2da738	\N	CREAR	auth	refresh	\N	{"data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3ODUzNDYwLCJleHAiOjE3Nzc4ODIyNjB9.0jTkQlRdoCncfqsVRS4r49i7oIg9ZBwgUzFtFR_JKDM", "refreshToken": "2525d51941f84a234d9d0f627c2afe21522bc3634a7d7f3630abc8ed36c76d1fa4528cfc4491e110d5f934de9335583125f079fd3b4b168d0032feb471c87372"}, "meta": {"timestamp": "2026-05-04T00:11:00.211Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:11:00.22
c1418b26-3879-4bfc-bdb3-6296d2b0e85a	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/371734c1-4371-487c-8391-50a12ead8f43.png", "size": 2139372, "isImage": true, "filename": "371734c1-4371-487c-8391-50a12ead8f43.png", "mimeType": "image/png", "originalName": "Michael (1) (2) (1) (1) (1).png"}, "meta": {"timestamp": "2026-05-04T00:12:40.270Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:12:40.369
1cfdf600-3495-47d9-97c5-8b710d26c3a6	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/a716ef9f-3f93-41d3-82c7-ff652e432a63.jpeg", "size": 1022692, "isImage": true, "filename": "a716ef9f-3f93-41d3-82c7-ff652e432a63.jpeg", "mimeType": "image/jpeg", "originalName": "Michael1211111.jpeg"}, "meta": {"timestamp": "2026-05-04T00:16:52.409Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:16:52.429
7369ac0f-fb1c-4fc5-9705-4503b25fddc5	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	auth	me	\N	{"data": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "activo": true, "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/a716ef9f-3f93-41d3-82c7-ff652e432a63.jpeg", "createdAt": "2026-04-28T20:22:35.577Z", "direccion": null, "updatedAt": "2026-05-04T00:16:54.644Z", "ultimoAcceso": "2026-05-03T15:22:47.266Z", "mustChangePassword": false}, "meta": {"timestamp": "2026-05-04T00:16:54.649Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:16:54.652
7c0167d2-f609-4e05-a27e-76e508919de0	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/0ddfe151-214c-4d81-92ec-2b4e151a2041.jpg", "size": 9143, "isImage": true, "filename": "0ddfe151-214c-4d81-92ec-2b4e151a2041.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-04T00:30:56.264Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:30:56.28
b8f35b57-06ec-4e80-8694-34f5e7717f6e	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	auth	me	\N	{"data": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "activo": true, "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/a716ef9f-3f93-41d3-82c7-ff652e432a63.j", "createdAt": "2026-04-28T20:22:35.577Z", "direccion": null, "updatedAt": "2026-05-04T00:57:14.250Z", "ultimoAcceso": "2026-05-03T15:22:47.266Z", "mustChangePassword": false}, "meta": {"timestamp": "2026-05-04T00:57:14.266Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:57:14.271
1e735716-4e37-44af-8b64-78564826d472	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/6cb8ff72-ea62-46cd-a107-02b4372fa4a3.png", "size": 49779, "isImage": true, "filename": "6cb8ff72-ea62-46cd-a107-02b4372fa4a3.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-05-01 143609.png"}, "meta": {"timestamp": "2026-05-05T00:01:29.765Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:01:29.767
346cd30f-60e2-4444-bdf3-381315b5266f	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	auth	me	\N	{"data": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "activo": true, "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/a716ef9f-3f93-41d3-82c7-ff652e432a63.jpg", "createdAt": "2026-04-28T20:22:35.577Z", "direccion": null, "updatedAt": "2026-05-04T00:57:21.546Z", "ultimoAcceso": "2026-05-03T15:22:47.266Z", "mustChangePassword": false}, "meta": {"timestamp": "2026-05-04T00:57:21.561Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:57:21.563
e2a8366a-5064-48be-8bf8-e228345818f9	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "size": 1022692, "isImage": true, "filename": "5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "mimeType": "image/jpeg", "originalName": "Michael1211111.jpeg"}, "meta": {"timestamp": "2026-05-04T00:57:33.836Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:57:33.838
b032afd3-14b4-4a09-a004-5b2605189f53	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	auth	me	\N	{"data": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "activo": true, "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jp", "createdAt": "2026-04-28T20:22:35.577Z", "direccion": null, "updatedAt": "2026-05-04T00:57:38.487Z", "ultimoAcceso": "2026-05-03T15:22:47.266Z", "mustChangePassword": false}, "meta": {"timestamp": "2026-05-04T00:57:38.494Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:57:38.495
43f7b614-9a76-454e-9421-133204c6efbf	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	auth	me	\N	{"data": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "activo": true, "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "createdAt": "2026-04-28T20:22:35.577Z", "direccion": null, "updatedAt": "2026-05-04T00:57:42.352Z", "ultimoAcceso": "2026-05-03T15:22:47.266Z", "mustChangePassword": false}, "meta": {"timestamp": "2026-05-04T00:57:42.357Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 00:57:42.359
881b57b2-5037-48e8-a428-a6cb70597cfe	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3ODY1NjEyLCJleHAiOjE3Nzc4OTQ0MTJ9.fFN5BXSkEYJfrZ4M-kUjHYgmFIz5CCDnKe3AmO1pAyw", "refreshToken": "72f550cb0bcafdbc3ca5c84b6e9cb39aeba35c886b9d31ca41041e283784e9ff46ace32ace48fd15af2b04f307689b8bf7cd3962d3ffc77d7e8b4137ab7bd30e"}, "meta": {"timestamp": "2026-05-04T03:33:32.165Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 03:33:32.171
f447a845-a2c9-4875-a98e-f4baefdaee44	\N	CREAR	auth	refresh	\N	{"data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3OTAzNDc0LCJleHAiOjE3Nzc5MzIyNzR9.e6oeE_RqL67FvTHjzDvGv99k0vbYxmAE8aAvS2ifwFo", "refreshToken": "c7cad4494902eb63284a4c0bdb82d2956bfff02d3011a73dbeca228f085f82e692d97eed0be4824f39a7e487dba6486dc7bb162f0adf2002aaab09f405c0c916"}, "meta": {"timestamp": "2026-05-04T14:04:34.158Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 14:04:34.162
e930c5f1-e0ed-4a96-8517-500910252990	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	clientes	\N	\N	{"data": {"id": "f62d0e81-4afe-42b0-8569-2df09d94b881", "dni": "77027939", "ruc": null, "tipo": "NATURAL", "email": "rodrigoakameluriarte@gmail.com", "notas": null, "activo": true, "nombre": "EDWARD RODRIGO", "celular": "974842500", "latitud": null, "apellido": "URIARTE ANCCOTA", "distrito": "Puno", "longitud": null, "telefono": "974842500", "createdAt": "2026-05-04T14:56:51.971Z", "deletedAt": null, "direccion": "JR. ACORA 265", "provincia": "Puno", "updatedAt": "2026-05-04T14:56:51.971Z", "esGenerico": false, "referencia": null, "razonSocial": null, "departamento": "Puno"}, "meta": {"timestamp": "2026-05-04T14:56:51.975Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 14:56:51.98
2ba9ae94-7a0d-4a6b-bfe4-726b140e5498	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	facturacion	clientes-validaciones	\N	{"data": {"id": "23210f0e-1a74-44b0-a606-a94a835b91da", "estado": "VALIDO", "clienteId": "f62d0e81-4afe-42b0-8569-2df09d94b881", "createdAt": "2026-05-04T15:02:55.183Z", "updatedAt": "2026-05-04T15:02:55.183Z", "direccionFiscal": "JR. ACORA 265", "numeroDocumento": "77027939", "nombreNormalizado": "EDWARD RODRIGO URIARTE ANCCOTA", "condicionDomicilio": null, "tipoDocumentoSunat": "1", "ultimaValidacionAt": "2026-05-04T15:02:55.182Z"}, "meta": {"timestamp": "2026-05-04T15:02:55.190Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 15:02:55.193
784f05ef-5bdd-4111-9ccd-152a12229baa	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3OTIyNjQ4LCJleHAiOjE3Nzc5NTE0NDh9.6tPBhtkCzAlmd9LSSw7MZawZNJAGnhfCthHJ3F6-3-0", "refreshToken": "89e98f2ef33f7ca87aed499a147f3fed07fba1a5af80eeb511ae3c95143a8907fe848d8474c4432467e6aa1119f011e6e617c75c3f7a19f51a95d6c38f07b6d7"}, "meta": {"timestamp": "2026-05-04T19:24:08.547Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:24:08.553
09af2f8a-17f7-4e42-a330-df7b53ccf0bf	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/e895bb3f-3fd1-4050-be69-d051ae8808be.jpg", "size": 23644, "isImage": true, "filename": "e895bb3f-3fd1-4050-be69-d051ae8808be.jpg", "mimeType": "image/jpeg", "originalName": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg"}, "meta": {"timestamp": "2026-05-04T19:24:49.578Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:24:49.582
ac0965ef-81a9-40ee-b3c5-6939f35b9f0c	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3OTIzNjUwLCJleHAiOjE3Nzc5NTI0NTB9.tqOzwik4JipMHx4f6Gwfq7hc-wY4GbWpjhiq6pxbV9Y", "refreshToken": "65ca0a90ec21c578ba174b9a9dae98d51a3d55d35ea63776a73701121b7cfd22435a71f587a525522197400d0d10ea018e9680af70d6be26b9dce5314e5574d4"}, "meta": {"timestamp": "2026-05-04T19:40:50.985Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:40:50.987
18ffe507-6d8f-4989-90ff-d73e71302d56	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "size": 23644, "isImage": true, "filename": "34baa744-2db7-442d-b096-0ef8202bae43.jpg", "mimeType": "image/jpeg", "originalName": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg"}, "meta": {"timestamp": "2026-05-04T19:43:29.410Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:43:29.454
1f533c1c-cf76-4952-a4f3-60f116f20964	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	productos	\N	\N	{"data": {"id": "d187dead-e4ac-4e69-8021-5e1cce955204", "sku": "REP-GEN-0001", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "activo": true, "imagen": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "modelo": "Bizhub 888", "nombre": "Impresora copiadora Konica minolta Bizhub 888", "marcaId": "31ec3903-250b-49c1-8a97-444f6d9e6049", "codigoQr": null, "imagenes": [{"id": "dbb3bbaa-7af1-4cf3-b2f5-ac364e451748", "url": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "tipo": "image/jpeg", "orden": 0, "nombre": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg", "tamano": 23644, "createdAt": "2026-05-04T19:43:32.153Z", "productoId": "d187dead-e4ac-4e69-8021-5e1cce955204", "esPrincipal": true}], "modeloId": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "categoria": {"id": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "tipo": "EQUIPO", "nombre": "Impresoras", "padreId": null}, "condicion": "USADO", "createdAt": "2026-05-04T19:43:32.153Z", "deletedAt": null, "updatedAt": "2026-05-04T19:43:32.153Z", "categoriaId": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "descripcion": null, "precioVenta": "5300", "stockMinimo": 0, "codigoBarras": "REP-GEN-0001", "esConsumible": false, "precioCompra": "5000", "precioMinimo": "5200", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": {"id": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "nombre": "Bizhub 888"}, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": true, "modeloCatalogoId": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tieneNumeroSerie": true, "requiereRepuestos": false, "tiempoEstimadoMin": null}, "meta": {"timestamp": "2026-05-04T19:43:32.176Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:43:32.179
2ad2d18f-3b66-467f-8f68-adbca66ad2ad	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	equipos	\N	\N	{"data": {"id": "b3a3d66d-1a31-4a87-890f-7df205855d4b", "notas": "", "estado": "ACTIVO", "almacen": {"id": "1ea3fb8a-4aea-48af-ad47-2db5199f7dc1", "nombre": "Almacen principal"}, "codigoQr": "EQP:ABC123", "firmware": "", "producto": {"id": "d187dead-e4ac-4e69-8021-5e1cce955204", "sku": "REP-GEN-0001", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "imagen": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "modelo": "Bizhub 888", "nombre": "Impresora copiadora Konica minolta Bizhub 888", "imagenes": [{"id": "dbb3bbaa-7af1-4cf3-b2f5-ac364e451748", "url": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "tipo": "image/jpeg", "orden": 0, "nombre": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg", "tamano": 23644, "createdAt": "2026-05-04T19:43:32.153Z", "productoId": "d187dead-e4ac-4e69-8021-5e1cce955204", "esPrincipal": true}], "categoria": {"id": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "nombre": "Impresoras"}, "condicion": "USADO", "codigoBarras": "REP-GEN-0001", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "manejaInventario": true}, "almacenId": "1ea3fb8a-4aea-48af-ad47-2db5199f7dc1", "condicion": null, "createdAt": "2026-05-04T19:45:06.457Z", "ubicacion": "", "updatedAt": "2026-05-04T19:45:06.457Z", "productoId": "d187dead-e4ac-4e69-8021-5e1cce955204", "numeroSerie": "ABC123", "procedencia": "", "fechaIngreso": "2026-05-04T00:00:00.000Z", "contadorActual": 40000, "contadorInicial": 40000, "estadoComercial": "DISPONIBLE", "observacionEstado": ""}, "meta": {"timestamp": "2026-05-04T19:45:06.517Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:45:06.519
2334bf35-d4cf-418b-a9d6-bbd4cb96ec1b	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	soporte	tickets	\N	{"data": {"id": "915704a6-0e10-48b6-9a63-835b61782f5a", "notas": null, "codigo": "TKT-2026-0001", "equipo": {"id": "b3a3d66d-1a31-4a87-890f-7df205855d4b", "productoId": "d187dead-e4ac-4e69-8021-5e1cce955204", "numeroSerie": "ABC123"}, "estado": "ABIERTO", "titulo": "Falla en las gomas de rodamiento", "cliente": {"id": "d75bd204-8023-40cc-8783-70584add56e0", "dni": "00000000", "ruc": null, "nombre": "Público en General"}, "tecnico": null, "equipoId": "b3a3d66d-1a31-4a87-890f-7df205855d4b", "solucion": null, "clienteId": "d75bd204-8023-40cc-8783-70584add56e0", "createdAt": "2026-05-04T19:46:29.030Z", "deletedAt": null, "prioridad": "ALTA", "tecnicoId": null, "updatedAt": "2026-05-04T19:46:29.030Z", "firmaFecha": null, "montoTotal": null, "creadoPorId": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "descripcion": "Constantes trabamientos durante la impresion.", "diagnostico": null, "fechaCierre": null, "firmaGeoLat": null, "firmaGeoLng": null, "fechaPromesa": null, "firmaCliente": null, "tipoServicio": "VISITA", "montoManoObra": null, "fallaReportada": null, "fechaRecepcion": "2026-05-04T19:46:29.030Z", "montoRepuestos": null}, "meta": {"timestamp": "2026-05-04T19:46:29.073Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 19:46:29.08
cce87a7a-e61a-46be-8547-4c225c7bc572	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	auth	logout	\N	{"meta": {"timestamp": "2026-05-04T20:12:49.422Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 20:12:49.429
abe89696-2994-4823-b2b3-f3f6b38b1bd7	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/0a0d46c8-2b4f-4d74-84be-f5c3717d4ef2.webp", "size": 16520, "isImage": true, "filename": "0a0d46c8-2b4f-4d74-84be-f5c3717d4ef2.webp", "mimeType": "image/webp", "originalName": "original-ef913c33670cf38c3559e63eeb5250f4.webp"}, "meta": {"timestamp": "2026-05-05T00:01:29.877Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:01:29.88
e3fdd8e0-6187-468b-98ca-ffd284099b0a	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/e3edd2b7-9ca3-4416-8222-64f7f62f7fd6.png", "size": 109028, "isImage": true, "filename": "e3edd2b7-9ca3-4416-8222-64f7f62f7fd6.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-05-01 141759.png"}, "meta": {"timestamp": "2026-05-05T00:01:29.899Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:01:29.9
722df898-7ba8-46ef-a9e9-c9933e110b38	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	d187dead-e4ac-4e69-8021-5e1cce955204	\N	{"data": {"id": "d187dead-e4ac-4e69-8021-5e1cce955204", "sku": "REP-GEN-0001", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "activo": true, "imagen": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "modelo": "Bizhub 888", "nombre": "Impresora copiadora Konica minolta Bizhub 888", "marcaId": "31ec3903-250b-49c1-8a97-444f6d9e6049", "codigoQr": null, "imagenes": [{"id": "764ad15c-cd95-43a1-8fab-93f06cd2e3de", "url": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "tipo": "image/jpeg", "orden": 0, "nombre": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg", "tamano": 23644, "createdAt": "2026-05-04T21:43:35.783Z", "productoId": "d187dead-e4ac-4e69-8021-5e1cce955204", "esPrincipal": true}], "modeloId": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "categoria": {"id": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "tipo": "EQUIPO", "nombre": "Impresoras", "padreId": null}, "condicion": "USADO", "createdAt": "2026-05-04T19:43:32.153Z", "deletedAt": null, "updatedAt": "2026-05-04T21:43:35.783Z", "categoriaId": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "descripcion": null, "precioVenta": "5300", "stockActual": 1, "stockMinimo": 2, "codigoBarras": "REP-GEN-0001", "esConsumible": false, "precioCompra": "5000", "precioMinimo": "5200", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": {"id": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "nombre": "Bizhub 888"}, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": true, "modeloCatalogoId": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tieneNumeroSerie": true, "requiereRepuestos": false, "tiempoEstimadoMin": null}, "meta": {"timestamp": "2026-05-04T21:43:35.819Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 21:43:35.823
6ebf7e7f-96f0-4449-8358-04f5a8559bee	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	d187dead-e4ac-4e69-8021-5e1cce955204	\N	{"data": {"id": "d187dead-e4ac-4e69-8021-5e1cce955204", "sku": "REP-GEN-0001", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "activo": true, "imagen": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "modelo": "Bizhub 888", "nombre": "Impresora copiadora Konica minolta Bizhub 888", "marcaId": "31ec3903-250b-49c1-8a97-444f6d9e6049", "codigoQr": null, "imagenes": [{"id": "66d26c8e-1763-4bb2-b4c3-9b707d2afcb5", "url": "/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg", "tipo": "image/jpeg", "orden": 0, "nombre": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg", "tamano": 23644, "createdAt": "2026-05-04T21:44:09.897Z", "productoId": "d187dead-e4ac-4e69-8021-5e1cce955204", "esPrincipal": true}], "modeloId": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "categoria": {"id": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "tipo": "EQUIPO", "nombre": "Impresoras", "padreId": null}, "condicion": "USADO", "createdAt": "2026-05-04T19:43:32.153Z", "deletedAt": null, "updatedAt": "2026-05-04T21:44:09.897Z", "categoriaId": "fe878243-5ff1-4323-90de-cd4b89a6e5f4", "descripcion": null, "precioVenta": "5300", "stockActual": 1, "stockMinimo": 1, "codigoBarras": "REP-GEN-0001", "esConsumible": false, "precioCompra": "5000", "precioMinimo": "5200", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": {"id": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tipo": "EQUIPO", "marca": {"id": "31ec3903-250b-49c1-8a97-444f6d9e6049", "nombre": "Konica minolta"}, "nombre": "Bizhub 888"}, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": true, "modeloCatalogoId": "b71acf28-bd41-42d5-8c72-ebc4743b1918", "tieneNumeroSerie": true, "requiereRepuestos": false, "tiempoEstimadoMin": null}, "meta": {"timestamp": "2026-05-04T21:44:09.928Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 21:44:09.93
811f6918-f5d5-4366-999d-6fcc3b8b2fa9	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/87fab856-168d-45a2-936b-7c4da69e5672.jpg", "size": 9143, "isImage": true, "filename": "87fab856-168d-45a2-936b-7c4da69e5672.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-04T23:48:12.200Z"}}	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 23:48:12.214
70c6d2dd-47aa-4982-aa4f-6ecbbdd5a3c8	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/a5c8b206-1f61-4eae-8ee4-ea2defc94cf8.jpg", "size": 9143, "isImage": true, "filename": "a5c8b206-1f61-4eae-8ee4-ea2defc94cf8.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-04T23:49:55.602Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 23:49:55.605
a994e5ff-83b0-4084-82f5-6059373541b7	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/66e06b81-cc8d-41d2-864e-4cac2517cbe4.jpg", "size": 9143, "isImage": true, "filename": "66e06b81-cc8d-41d2-864e-4cac2517cbe4.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-04T23:55:44.955Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 23:55:44.957
1bbf55af-5d77-45bc-a566-8225c1d64208	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/e5b159a4-bac6-4200-95f9-54840b859f19.webp", "size": 16520, "isImage": true, "filename": "e5b159a4-bac6-4200-95f9-54840b859f19.webp", "mimeType": "image/webp", "originalName": "original-ef913c33670cf38c3559e63eeb5250f4.webp"}, "meta": {"timestamp": "2026-05-04T23:55:57.908Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 23:55:57.912
d283ab6b-eb7b-4891-9d01-119fba0d6ce0	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/ed11e0f9-49ed-40e1-bcfa-6c415ace1ed8.jpg", "size": 9143, "isImage": true, "filename": "ed11e0f9-49ed-40e1-bcfa-6c415ace1ed8.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-04T23:59:24.677Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 23:59:24.678
825c4f83-872c-4859-908a-4ec066b732d3	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/3c99564d-32bf-4b86-92b4-a93f2288a498.webp", "size": 16520, "isImage": true, "filename": "3c99564d-32bf-4b86-92b4-a93f2288a498.webp", "mimeType": "image/webp", "originalName": "original-ef913c33670cf38c3559e63eeb5250f4.webp"}, "meta": {"timestamp": "2026-05-04T23:59:43.927Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-04 23:59:43.929
d8c3bc7f-4af1-44fa-9ab2-5cd6b677af56	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/d76f14d5-f564-4e1a-8fd0-e73158530dd8.png", "size": 96594, "isImage": true, "filename": "d76f14d5-f564-4e1a-8fd0-e73158530dd8.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph (1).png"}, "meta": {"timestamp": "2026-05-05T00:00:02.959Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:00:02.962
45d28b28-fc9b-45d7-bdb3-51277e27a9fb	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/f4a1e0a9-4165-423d-a0cf-626c516c8f34.png", "size": 105424, "isImage": true, "filename": "f4a1e0a9-4165-423d-a0cf-626c516c8f34.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph.png"}, "meta": {"timestamp": "2026-05-05T00:00:03.076Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:00:03.082
3c2710e5-8c5a-4564-b8a9-193f2180beb2	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/d5e6ff25-d186-4c33-8bb5-bd0673571359.jpg", "size": 561469, "isImage": true, "filename": "d5e6ff25-d186-4c33-8bb5-bd0673571359.jpg", "mimeType": "image/jpeg", "originalName": "Recursos (1) (version 1) (1)_page-0001.jpg"}, "meta": {"timestamp": "2026-05-05T00:00:03.110Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:00:03.111
5068df49-7c8f-4100-a871-2dba498532cf	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/76b3cc78-2024-45c9-b958-a0d790a4a8c3.png", "size": 86425, "isImage": true, "filename": "76b3cc78-2024-45c9-b958-a0d790a4a8c3.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph (2).png"}, "meta": {"timestamp": "2026-05-05T00:01:29.913Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:01:29.914
db012a60-46ec-4298-8a22-5f31c5fc98c5	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/48086312-4a78-470e-8c7b-9bc820c4529f.png", "size": 96594, "isImage": true, "filename": "48086312-4a78-470e-8c7b-9bc820c4529f.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph (1).png"}, "meta": {"timestamp": "2026-05-05T00:01:29.925Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:01:29.926
07822f74-8915-49c8-86bc-7ecd96438b3a	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/32ac2e34-26b7-466e-a656-039b11e85279.png", "size": 105424, "isImage": true, "filename": "32ac2e34-26b7-466e-a656-039b11e85279.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph.png"}, "meta": {"timestamp": "2026-05-05T00:01:29.936Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:01:29.937
1e630f63-392f-4c35-bdac-b9460f1b21d3	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/103c9273-8a11-421c-a950-06aef0001409.jpg", "size": 9143, "isImage": true, "filename": "103c9273-8a11-421c-a950-06aef0001409.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-05T00:11:20.213Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:11:20.217
efc15814-1e4c-4501-acb9-a1822d0b2a9b	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/a4b76df0-e9f9-40b7-a48a-d6e8556789c9.jpg", "size": 9143, "isImage": true, "filename": "a4b76df0-e9f9-40b7-a48a-d6e8556789c9.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-05T00:14:02.094Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:02.095
75d8568a-bc6d-45e9-bcb5-8eac7b336433	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/0c1f4560-727b-4ef9-b187-5a2627274d39.png", "size": 49779, "isImage": true, "filename": "0c1f4560-727b-4ef9-b187-5a2627274d39.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-05-01 143609.png"}, "meta": {"timestamp": "2026-05-05T00:14:16.717Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.718
004d25ff-dcc2-481f-8e2f-8a5f1d974a2c	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/40350908-15b9-4f5c-9370-0954dd245f3e.webp", "size": 16520, "isImage": true, "filename": "40350908-15b9-4f5c-9370-0954dd245f3e.webp", "mimeType": "image/webp", "originalName": "original-ef913c33670cf38c3559e63eeb5250f4.webp"}, "meta": {"timestamp": "2026-05-05T00:14:16.802Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.803
1f730a38-c008-4e31-bc3d-0674143e78e3	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/6ca20162-0b69-4253-aa51-29235a4f4b48.png", "size": 109028, "isImage": true, "filename": "6ca20162-0b69-4253-aa51-29235a4f4b48.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-05-01 141759.png"}, "meta": {"timestamp": "2026-05-05T00:14:16.819Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.82
fed0a66c-9914-4ace-b4e2-ef33a91eb259	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/669521fa-c44f-4fe5-a06e-d4f71c2efaec.png", "size": 86425, "isImage": true, "filename": "669521fa-c44f-4fe5-a06e-d4f71c2efaec.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph (2).png"}, "meta": {"timestamp": "2026-05-05T00:14:16.839Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.84
96c17dd7-cf60-4d82-8dec-dee15dcb961a	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/38a6196d-cd20-46b3-89f1-5c437f36520e.png", "size": 96594, "isImage": true, "filename": "38a6196d-cd20-46b3-89f1-5c437f36520e.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph (1).png"}, "meta": {"timestamp": "2026-05-05T00:14:16.856Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.858
a2c7bada-9e90-4f2c-9879-fc048d1e1a53	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/1d8900fe-866d-4d7b-8907-08549736ee76.png", "size": 105424, "isImage": true, "filename": "1d8900fe-866d-4d7b-8907-08549736ee76.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph.png"}, "meta": {"timestamp": "2026-05-05T00:14:16.873Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.874
dd14758f-6322-4fcc-9d63-bcad048bef51	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/e16c550d-9c15-49ba-8017-9518438cc63a.jpg", "size": 561469, "isImage": true, "filename": "e16c550d-9c15-49ba-8017-9518438cc63a.jpg", "mimeType": "image/jpeg", "originalName": "Recursos (1) (version 1) (1)_page-0001.jpg"}, "meta": {"timestamp": "2026-05-05T00:14:16.903Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.904
fb3efde8-1820-400c-bd88-5ba162f6b93e	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/c4b4a463-6a4d-4f38-a953-f88cdb7dfcf5.jpg", "size": 23644, "isImage": true, "filename": "c4b4a463-6a4d-4f38-a953-f88cdb7dfcf5.jpg", "mimeType": "image/jpeg", "originalName": "Konica-Minolta-bizhub-808-Segunda-Mano.jpg"}, "meta": {"timestamp": "2026-05-05T00:14:16.916Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.919
33c9a8b8-5282-4f87-be70-a433886b2141	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/1ccf8e20-ada9-49b1-a3eb-61a2153c838b.png", "size": 74769, "isImage": true, "filename": "1ccf8e20-ada9-49b1-a3eb-61a2153c838b.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-04-25 133043.png"}, "meta": {"timestamp": "2026-05-05T00:14:16.935Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.936
3c768b89-13e7-47e7-a436-827bb6cc0ede	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/09fa2b60-ca8e-4df6-9604-7035f5bf07c5.png", "size": 67863, "isImage": true, "filename": "09fa2b60-ca8e-4df6-9604-7035f5bf07c5.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-04-25 130735.png"}, "meta": {"timestamp": "2026-05-05T00:14:16.953Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:14:16.954
4ccc89fc-59dd-4fb5-812a-424440a13c73	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/90227943-c98f-4891-9058-cfb6ced14015.jpg", "size": 9143, "isImage": true, "filename": "90227943-c98f-4891-9058-cfb6ced14015.jpg", "mimeType": "image/jpeg", "originalName": "images.jpg"}, "meta": {"timestamp": "2026-05-05T00:17:22.495Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:17:22.496
a1d7d2f5-4d53-488b-90a5-a33e9589d9dc	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/7f168541-2997-4001-9ce3-a50e126ab939.png", "size": 49779, "isImage": true, "filename": "7f168541-2997-4001-9ce3-a50e126ab939.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-05-01 143609.png"}, "meta": {"timestamp": "2026-05-05T00:17:22.658Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:17:22.66
8167c9ea-699d-4de1-955d-e98cd560e02b	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/41c1fb4d-901f-4c95-aa61-b9a8d5b63f6f.png", "size": 86425, "isImage": true, "filename": "41c1fb4d-901f-4c95-aa61-b9a8d5b63f6f.png", "mimeType": "image/png", "originalName": "Beige Simple Modern Fishbone Diagram Graph (2).png"}, "meta": {"timestamp": "2026-05-05T00:17:23.017Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:17:23.019
1a139ff8-e48b-44b7-ae36-18620aa41425	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/e9bf5836-2dad-41dd-ba52-04a28dc56e03.png", "size": 109028, "isImage": true, "filename": "e9bf5836-2dad-41dd-ba52-04a28dc56e03.png", "mimeType": "image/png", "originalName": "Captura de pantalla 2026-05-01 141759.png"}, "meta": {"timestamp": "2026-05-05T00:17:22.950Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:17:22.951
1038aee8-1d77-4077-9747-4c01ab9c0a12	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	uploads	\N	\N	{"data": {"path": "/uploads/public/5713ff0b-1ec1-456b-b8b8-a138a5e395eb.webp", "size": 16520, "isImage": true, "filename": "5713ff0b-1ec1-456b-b8b8-a138a5e395eb.webp", "mimeType": "image/webp", "originalName": "original-ef913c33670cf38c3559e63eeb5250f4.webp"}, "meta": {"timestamp": "2026-05-05T00:17:22.852Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 00:17:22.877
661e3af6-4988-49ff-b99b-9f57251232ea	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3OTUyMzc2LCJleHAiOjE3Nzc5ODExNzZ9.tDWMzTwrYAUH8bOQZpnght_0-HFEJvPsfY7N6Oh8g38", "refreshToken": "c9b88e280e343acb467d5307cbab9db308f9c645d7b3591a1ce2c84f214c4ac580d563c95f466615e8e5026d421146191d03419abb6ee5d3b0f6a260ba42e079"}, "meta": {"timestamp": "2026-05-05T03:39:36.738Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; es-PE) PowerShell/7.6.1	2026-05-05 03:39:36.762
d4076c62-66cd-4e8a-82a2-39773bab0f3a	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3OTUyMzg5LCJleHAiOjE3Nzc5ODExODl9.dAnbYxwkh9kicbuyiG06BYNSud2crApImRI2mszGMxc", "refreshToken": "4bebc5ce6ccdad025e326f7be11cca9e04f7b7070c904a8ba6aff07f825c62f1ec11ed29c1417dc9ca427db008397e2655dd0fbfde3bc718f3d78104c48c845c"}, "meta": {"timestamp": "2026-05-05T03:39:49.929Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Microsoft Windows 10.0.26200; es-PE) PowerShell/7.6.1	2026-05-05 03:39:49.932
43ceeb86-3084-4ddf-8f1d-f225fb30b12a	\N	CREAR	auth	refresh	\N	{"data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc3OTUyMzkwLCJleHAiOjE3Nzc5ODExOTB9.GTKInEyG9xYhGVEn1PIEoSOYAkyoztShaAJeVJKmry0", "refreshToken": "15daa999eb1d9168ed2809e935c7cbe802090830ebde253cd5bd1d10e324c44336bcf1d666886fd43a25659c689189645bdb9f9a68e9a280b7c8c6ac7388ea6b"}, "meta": {"timestamp": "2026-05-05T03:39:50.823Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 03:39:50.824
0e7516b5-51a1-4c53-b58c-a597b823143a	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc4MDE3NjMxLCJleHAiOjE3NzgwNDY0MzF9._RZ-V4t8ItOdHHVOZ0aIOKxQ4Npc7aVnkYqngEkE8qI", "refreshToken": "20c9636c829c7b5a03559a6793e41dc10d9a8a513abe5e396c51536ac2c5d73f2b780c65a67268beb3594ba9768436b685db8f75e0ca63c94ef90423d86c7c03"}, "meta": {"timestamp": "2026-05-05T21:47:11.478Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 21:47:11.482
b4b27ff5-bdf6-4254-a931-f71632704bff	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	auth	logout	\N	{"meta": {"timestamp": "2026-05-05T22:02:17.150Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:02:17.152
4218578e-de1e-4194-8193-07499fee124d	\N	CREAR	auth	register	\N	{"data": {"message": "Tu solicitud fue registrada. Un administrador debe activar tu cuenta antes de ingresar."}, "meta": {"timestamp": "2026-05-05T22:02:35.778Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:02:35.779
8f0308f9-b503-4e37-af5c-e06aa8773aa3	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc4MDE4NTYzLCJleHAiOjE3NzgwNDczNjN9.nHgwLO83DsMapLSx_GQvKiyKy3KPINMXNMIrDZTR98w", "refreshToken": "73ff5c8fd622cd8729ba41dc57a08c4a47412b18072c2445dac20dab346678ad15dc396098ec00e5b4bde676608f1f08cc5b36cecb428e6bfd77ded486711071"}, "meta": {"timestamp": "2026-05-05T22:02:43.600Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:02:43.601
3e514064-9b64-4355-aa33-d094217f13e4	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	usuarios	e8da4375-50aa-4636-a4eb-c524f7d38634	\N	{"data": {"id": "e8da4375-50aa-4636-a4eb-c524f7d38634", "bio": null, "rol": "TECNICO", "cargo": null, "email": "edardmichaelu@gmail.com", "activo": true, "nombre": "Edard", "celular": null, "apellido": "Michael", "telefono": null, "whatsapp": null, "avatarUrl": null, "createdAt": "2026-05-05T22:02:35.775Z", "direccion": null, "updatedAt": "2026-05-05T22:03:11.834Z", "ultimoAcceso": null, "mustChangePassword": true}, "meta": {"timestamp": "2026-05-05T22:03:11.837Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:03:11.839
5dfe8a2c-207b-43fd-abe5-881f1bf30927	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	auth	logout	\N	{"meta": {"timestamp": "2026-05-05T22:03:14.463Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:03:14.464
c89b9ab9-6ff7-4757-b7f2-6cf61fc9647c	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "e8da4375-50aa-4636-a4eb-c524f7d38634", "bio": null, "rol": "TECNICO", "cargo": null, "email": "edardmichaelu@gmail.com", "nombre": "Edard", "celular": null, "apellido": "Michael", "telefono": null, "whatsapp": null, "avatarUrl": null, "direccion": null, "mustChangePassword": true}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlOGRhNDM3NS01MGFhLTQ2MzYtYTRlYi1jNTI0ZjdkMzg2MzQiLCJlbWFpbCI6ImVkYXJkbWljaGFlbHVAZ21haWwuY29tIiwicm9sIjoiVEVDTklDTyIsImlhdCI6MTc3ODAxODU5OSwiZXhwIjoxNzc4MDQ3Mzk5fQ.5nWcj0DGEeKI0NnCBEtfDC0YdtJduPa1J-d1FkMQUvM", "refreshToken": "b2501423251e836250a93405e9792127a454f1c252a7eeac75d1171274917d59b012560ddbcbbd3c43744fcc6894459bf54e818351833b469b55bb3d19bb7e28"}, "meta": {"timestamp": "2026-05-05T22:03:19.173Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:03:19.175
eeffce46-2b21-4bab-9e2c-58c324699c51	e8da4375-50aa-4636-a4eb-c524f7d38634	CREAR	auth	change-password	\N	{"data": {"message": "Contrasena actualizada correctamente."}, "meta": {"timestamp": "2026-05-05T22:03:30.137Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:03:30.139
6fd1bfce-b5b9-4f0f-856f-a8f7f6a58b74	e8da4375-50aa-4636-a4eb-c524f7d38634	CREAR	auth	logout	\N	{"meta": {"timestamp": "2026-05-05T22:04:02.479Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:04:02.482
9a244f8e-61db-4dce-911b-6a4f991899bc	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc4MDE4NjQ3LCJleHAiOjE3NzgwNDc0NDd9.ESffBk3F16nad-9kEdj74CDY5Rqmt8HjqJtYII3a1Oo", "refreshToken": "7d071e561b741d0ccab4be2035cf12d9eb8b2835e4007a46cf2dc498adebae5fbe7385c9a29716d4fb2be975bf9b67286aa7cb80fbf1bd198736999011bdd2eb"}, "meta": {"timestamp": "2026-05-05T22:04:07.255Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:04:07.255
5bb01191-500a-4f94-9742-64608c4e5fcb	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	categorias	\N	\N	{"data": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null, "createdAt": "2026-05-05T22:06:28.833Z", "deletedAt": null, "updatedAt": "2026-05-05T22:06:28.833Z", "descripcion": null}, "meta": {"timestamp": "2026-05-05T22:06:28.837Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:06:28.84
d4dd8bc3-ede0-4063-9ceb-b74d8fb8cb7b	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	productos	\N	\N	{"data": {"id": "e0c39fbe-f75e-4355-a96f-69a964104b76", "sku": "SER-MAN-0001", "tipo": "SERVICIO", "marca": null, "activo": true, "imagen": null, "modelo": null, "nombre": "Servicio de mantenimiento preventivo", "marcaId": null, "codigoQr": "PRD:SER-MAN-0001", "imagenes": [], "modeloId": null, "atributos": null, "categoria": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null}, "condicion": null, "createdAt": "2026-05-05T22:07:30.060Z", "deletedAt": null, "updatedAt": "2026-05-05T22:07:30.060Z", "categoriaId": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "descripcion": null, "precioVenta": "100", "stockActual": 0, "stockMinimo": 0, "codigoBarras": "SER-MAN-0001", "esConsumible": false, "precioCompra": "100", "precioMinimo": "100", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": null, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": false, "modeloCatalogoId": null, "tieneNumeroSerie": false, "requiereRepuestos": true, "tiempoEstimadoMin": 30}, "meta": {"timestamp": "2026-05-05T22:07:30.110Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:07:30.111
3401b847-1c08-4493-87ca-26a673841f44	9cd8b54b-435b-41fc-9ce9-32226316aef4	CREAR	inventario	almacenes	\N	{"data": {"id": "afa93b52-b29d-48ad-a9cb-f0fbf4c16171", "activo": true, "nombre": "Tienda", "createdAt": "2026-05-06T02:13:44.522Z", "deletedAt": null, "direccion": null, "updatedAt": "2026-05-06T02:13:44.522Z", "descripcion": "", "esPrincipal": false}, "meta": {"timestamp": "2026-05-06T02:13:44.530Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-06 02:13:44.535
86509088-3c5f-4a42-8bce-339eb851a3cc	9cd8b54b-435b-41fc-9ce9-32226316aef4	ELIMINAR	inventario	almacenes	\N	{"meta": {"timestamp": "2026-05-06T02:14:27.257Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-06 02:14:27.258
f7792d28-0889-4f83-a9a7-5dc8ec67e96f	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	e0c39fbe-f75e-4355-a96f-69a964104b76	\N	{"data": {"id": "e0c39fbe-f75e-4355-a96f-69a964104b76", "sku": "SER-MAN-0001", "tipo": "SERVICIO", "marca": null, "activo": true, "imagen": null, "modelo": null, "nombre": "Servicio de mantenimiento preventivo", "marcaId": null, "codigoQr": "PRD:SER-MAN-0001", "imagenes": [], "modeloId": null, "atributos": null, "categoria": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null}, "condicion": null, "createdAt": "2026-05-05T22:07:30.060Z", "deletedAt": null, "updatedAt": "2026-05-05T22:50:00.596Z", "categoriaId": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "descripcion": null, "precioVenta": "100", "stockActual": 0, "stockMinimo": 0, "codigoBarras": "SER-MAN-0001", "esConsumible": false, "precioCompra": "100", "precioMinimo": "100", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": null, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": false, "modeloCatalogoId": null, "tieneNumeroSerie": false, "requiereRepuestos": true, "tiempoEstimadoMin": 30}, "meta": {"timestamp": "2026-05-05T22:50:00.684Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:50:00.696
665bd04f-fe55-4cfa-a6a3-680eeb9b6db7	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	e0c39fbe-f75e-4355-a96f-69a964104b76	\N	{"data": {"id": "e0c39fbe-f75e-4355-a96f-69a964104b76", "sku": "SER-MAN-0001", "tipo": "SERVICIO", "marca": null, "activo": true, "imagen": null, "modelo": null, "nombre": "Servicio de mantenimiento preventivo", "marcaId": null, "codigoQr": "PRD:SER-MAN-0001", "imagenes": [], "modeloId": null, "atributos": null, "categoria": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null}, "condicion": null, "createdAt": "2026-05-05T22:07:30.060Z", "deletedAt": null, "updatedAt": "2026-05-05T22:51:10.581Z", "categoriaId": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "descripcion": null, "precioVenta": "100", "stockActual": 0, "stockMinimo": 0, "codigoBarras": "SER-MAN-0001", "esConsumible": false, "precioCompra": "100", "precioMinimo": "100", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": null, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": false, "modeloCatalogoId": null, "tieneNumeroSerie": false, "requiereRepuestos": true, "tiempoEstimadoMin": 300}, "meta": {"timestamp": "2026-05-05T22:51:10.632Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 22:51:10.635
5cc978f1-83ce-48e7-b09d-84baf11826e5	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	e0c39fbe-f75e-4355-a96f-69a964104b76	\N	{"data": {"id": "e0c39fbe-f75e-4355-a96f-69a964104b76", "sku": "SER-MAN-0001", "tipo": "SERVICIO", "marca": null, "activo": true, "imagen": null, "modelo": null, "nombre": "Servicio de mantenimiento preventivo", "marcaId": null, "codigoQr": "PRD:SER-MAN-0001", "imagenes": [], "modeloId": null, "atributos": null, "categoria": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null}, "condicion": null, "createdAt": "2026-05-05T22:07:30.060Z", "deletedAt": null, "updatedAt": "2026-05-05T23:54:46.354Z", "categoriaId": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "descripcion": null, "precioVenta": "100", "stockActual": 0, "stockMinimo": 0, "codigoBarras": "SER-MAN-0001", "esConsumible": false, "precioCompra": "100", "precioMinimo": "100", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": null, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": false, "modeloCatalogoId": null, "tieneNumeroSerie": false, "requiereRepuestos": true, "tiempoEstimadoMin": 30}, "meta": {"timestamp": "2026-05-05T23:54:46.401Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 23:54:46.418
03a9a9a5-11ca-4243-ab31-870a8cc3a268	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	e0c39fbe-f75e-4355-a96f-69a964104b76	\N	{"data": {"id": "e0c39fbe-f75e-4355-a96f-69a964104b76", "sku": "SER-MAN-0001", "tipo": "SERVICIO", "marca": null, "activo": true, "imagen": null, "modelo": null, "nombre": "Servicio de mantenimiento preventivo", "marcaId": null, "codigoQr": "PRD:SER-MAN-0001", "imagenes": [], "modeloId": null, "atributos": null, "categoria": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null}, "condicion": null, "createdAt": "2026-05-05T22:07:30.060Z", "deletedAt": null, "updatedAt": "2026-05-05T23:56:15.452Z", "categoriaId": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "descripcion": "El precio base es por unidad de servicio, si se hacen varios servicios en uno mismo el costo base por servicio agregado podria resumirse a la mitad, es decir un servicio = 100, 2 mismos servicios a 150 del mismo tipo", "precioVenta": "100", "stockActual": 0, "stockMinimo": 0, "codigoBarras": "SER-MAN-0001", "esConsumible": false, "precioCompra": "100", "precioMinimo": "100", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": null, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": false, "modeloCatalogoId": null, "tieneNumeroSerie": false, "requiereRepuestos": true, "tiempoEstimadoMin": 30}, "meta": {"timestamp": "2026-05-05T23:56:15.478Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 23:56:15.48
44075ecf-d23b-4cde-8150-1c26ffc4dc5b	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	productos	e0c39fbe-f75e-4355-a96f-69a964104b76	\N	{"data": {"id": "e0c39fbe-f75e-4355-a96f-69a964104b76", "sku": "SER-MAN-0001", "tipo": "SERVICIO", "marca": null, "activo": true, "imagen": null, "modelo": null, "nombre": "Servicio de mantenimiento preventivo", "marcaId": null, "codigoQr": "PRD:SER-MAN-0001", "imagenes": [], "modeloId": null, "atributos": null, "categoria": {"id": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "tipo": "SERVICIO", "nombre": "Mantenimiento", "padreId": null}, "condicion": null, "createdAt": "2026-05-05T22:07:30.060Z", "deletedAt": null, "updatedAt": "2026-05-05T23:57:15.289Z", "categoriaId": "c9a5de66-bce5-4471-bd35-d89b5826bcf1", "descripcion": "El precio base es por unidad de servicio, si se hacen varios servicios en uno mismo el costo base por servicio agregado podria resumirse a la mitad, es decir un servicio = 100, 2 servicios del mismo tipo  seria igual a 150.", "precioVenta": "100", "stockActual": 0, "stockMinimo": 0, "codigoBarras": "SER-MAN-0001", "esConsumible": false, "precioCompra": "100", "precioMinimo": "100", "unidadMedida": {"id": "11111111-1111-4111-8111-111111111111", "codigo": "UND", "nombre": "Unidad"}, "modeloCatalogo": null, "unidadMedidaId": "11111111-1111-4111-8111-111111111111", "manejaInventario": false, "modeloCatalogoId": null, "tieneNumeroSerie": false, "requiereRepuestos": true, "tiempoEstimadoMin": 30}, "meta": {"timestamp": "2026-05-05T23:57:15.307Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-05 23:57:15.308
924f2fab-a591-4b28-981e-66c5755e9fa2	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	clientes	f62d0e81-4afe-42b0-8569-2df09d94b881	\N	{"data": {"id": "f62d0e81-4afe-42b0-8569-2df09d94b881", "dni": "77635353", "ruc": null, "tipo": "NATURAL", "email": "rodrigoakameluriarte@gmail.com", "notas": null, "activo": true, "nombre": "Julio", "celular": "974842500", "latitud": null, "apellido": "Carranza", "distrito": "Puno", "longitud": null, "telefono": "974842500", "createdAt": "2026-05-04T14:56:51.971Z", "deletedAt": null, "direccion": "JR. ACORA 265", "provincia": "Puno", "updatedAt": "2026-05-06T03:25:57.236Z", "esGenerico": false, "referencia": null, "razonSocial": null, "departamento": "Puno"}, "meta": {"timestamp": "2026-05-06T03:25:57.246Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-06 03:25:57.251
cfab09ab-07d9-4c19-93d2-b6e00d40d5cb	9cd8b54b-435b-41fc-9ce9-32226316aef4	ACTUALIZAR	facturacion	clientes-validaciones	\N	{"data": {"id": "23210f0e-1a74-44b0-a606-a94a835b91da", "estado": "VALIDO", "clienteId": "f62d0e81-4afe-42b0-8569-2df09d94b881", "createdAt": "2026-05-04T15:02:55.183Z", "updatedAt": "2026-05-06T03:26:44.177Z", "direccionFiscal": "JR. ACORA 265", "numeroDocumento": "77044445", "nombreNormalizado": "Julio  Carranza", "condicionDomicilio": null, "tipoDocumentoSunat": "1", "ultimaValidacionAt": "2026-05-06T03:26:44.174Z"}, "meta": {"timestamp": "2026-05-06T03:26:44.180Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-06 03:26:44.181
7ee210d7-9a2c-4b32-a3b2-0260db021b1d	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc4MDQzMzAzLCJleHAiOjE3NzgwNzIxMDN9.yRpmunhE991H9ZDBL9cY8OCor1DPm7D2dARoUtFYku8", "refreshToken": "fe993c9272be398e1c0a61ab091c6ec8fd0c88e8be79fd12db0104fb6ac63b9cd11e783442edf08f3a2fb55ccbd5dbe803791804632ac6821990f811b2b5b685"}, "meta": {"timestamp": "2026-05-06T04:55:03.231Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Codex/26.429.61741 Chrome/146.0.7680.179 Electron/41.2.0 Safari/537.36	2026-05-06 04:55:03.234
f0546854-0d6b-4581-9fc0-f37a6ca00d4b	\N	CREAR	auth	refresh	\N	{"data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc4MDQ3NDc1LCJleHAiOjE3NzgwNzYyNzV9.qWqTwkMXcSvmWHZHeXbg-_T5RDfiGYwb8KNhpJn6gn8", "refreshToken": "69b9b0cde8b390d8f380e7052f9fa6579867a17b4a8b847d648578fdc0a177453187e7fce16f614e4cd32cadc3f42ad718cac8c687fad0b6b3685b9b29c1e77d"}, "meta": {"timestamp": "2026-05-06T06:04:35.356Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-05-06 06:04:35.358
7cbd2494-d130-4c64-bc72-a03634bde904	\N	CREAR	auth	login	\N	{"data": {"user": {"id": "9cd8b54b-435b-41fc-9ce9-32226316aef4", "bio": null, "rol": "ADMIN", "cargo": null, "email": "admin@erp.local", "nombre": "Administrador", "celular": null, "apellido": "Sistema", "telefono": null, "whatsapp": null, "avatarUrl": "/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg", "direccion": null, "mustChangePassword": false}, "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5Y2Q4YjU0Yi00MzViLTQxZmMtOWNlOS0zMjIyNjMxNmFlZjQiLCJlbWFpbCI6ImFkbWluQGVycC5sb2NhbCIsInJvbCI6IkFETUlOIiwiaWF0IjoxNzc4MDcyOTY5LCJleHAiOjE3NzgxMDE3Njl9.dPDNMskL_jGdT5zL-bftGdrt1iJchi_v3_BEeoaBq5M", "refreshToken": "152cb8cdc91445258e5bd792bfd4b7327d4ecfcdb8f16f316962e9cb0de0de5b3595ef82f1629d07a8972a9e87486e47b8136e7ced768fccfe6e9bf184a32176"}, "meta": {"timestamp": "2026-05-06T13:09:29.736Z"}}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-05-06 13:09:29.75
\.


--
-- Data for Name: cajas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cajas (id, nombre, descripcion, activa, "createdAt", "updatedAt") FROM stdin;
48838042-3af9-4211-bbf5-fdc2ff7573b1	Caja Principal	\N	t	2026-04-29 03:33:05.031	2026-05-05 01:27:24.603
\.


--
-- Data for Name: casos_garantia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.casos_garantia (id, "garantiaId", "ticketId", descripcion, resolucion, aceptada, motivo, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias (id, nombre, descripcion, "padreId", "createdAt", "updatedAt", "deletedAt", tipo) FROM stdin;
fe878243-5ff1-4323-90de-cd4b89a6e5f4	Impresoras	\N	\N	2026-04-29 19:23:54.979	2026-04-29 19:23:54.979	\N	EQUIPO
b7af771f-a761-4857-ba1b-9e61c385bb87	Equipos	\N	\N	2026-05-03 03:50:13.165	2026-05-03 03:50:44.921	2026-05-03 03:50:44.914	REPUESTO
c9a5de66-bce5-4471-bd35-d89b5826bcf1	Mantenimiento	\N	\N	2026-05-05 22:06:28.833	2026-05-05 22:06:28.833	\N	SERVICIO
\.


--
-- Data for Name: certificados_digitales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.certificados_digitales (id, "configEmpresaFiscalId", nombre, "storageProvider", "storageKey", "passwordSecretRef", "fingerprintSha256", "serialNumber", subject, issuer, "validoDesde", "validoHasta", activo, "revokedAt", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: cliente_validaciones_sunat; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cliente_validaciones_sunat (id, "clienteId", "tipoDocumentoSunat", "numeroDocumento", "nombreNormalizado", "direccionFiscal", estado, "condicionDomicilio", "ultimaValidacionAt", "createdAt", "updatedAt") FROM stdin;
23210f0e-1a74-44b0-a606-a94a835b91da	f62d0e81-4afe-42b0-8569-2df09d94b881	1	77044445	Julio  Carranza	JR. ACORA 265	VALIDO	\N	2026-05-06 03:26:44.174	2026-05-04 15:02:55.183	2026-05-06 03:26:44.177
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes (id, tipo, nombre, apellido, dni, "razonSocial", ruc, email, telefono, celular, direccion, distrito, provincia, departamento, referencia, notas, activo, "createdAt", "updatedAt", "deletedAt", latitud, longitud, "esGenerico") FROM stdin;
d75bd204-8023-40cc-8783-70584add56e0	NATURAL	Público en General	\N	00000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2026-05-02 20:34:00.843	2026-05-05 01:27:24.591	\N	\N	\N	t
f62d0e81-4afe-42b0-8569-2df09d94b881	NATURAL	Julio	Carranza	77635353	\N	\N	rodrigoakameluriarte@gmail.com	974842500	974842500	JR. ACORA 265	Puno	Puno	Puno	\N	\N	t	2026-05-04 14:56:51.971	2026-05-06 03:25:57.236	\N	\N	\N	f
\.


--
-- Data for Name: compatibilidades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.compatibilidades (id, "repuestoId", "modeloId", notas, "createdAt") FROM stdin;
\.


--
-- Data for Name: comprobante_detalles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comprobante_detalles (id, "comprobanteId", "productoId", item, "codigoInterno", descripcion, "unidadSunat", "tipoFiscalProducto", "tipoAfectacionIgv", cantidad, "valorUnitario", "precioUnitario", descuento, "baseImponible", igv, total, "metadataFiscal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: comprobante_envio_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comprobante_envio_logs (id, "comprobanteId", proveedor, "tipoEvento", estado, intento, "requestPayload", "responsePayload", "codigoRespuesta", mensaje, "createdAt", "updatedAt", tipo, fecha, "responseCode", "responseDescription", "cdrStorageKey", "errorMessage", "durationMs") FROM stdin;
\.


--
-- Data for Name: comprobantes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comprobantes (id, "ventaId", tipo, serie, correlativo, numero, "clienteNombre", "clienteDocTipo", "clienteDocNum", "clienteDireccion", subtotal, igv, total, estado, "xmlContent", "cdrContent", "codigoSunat", "mensajeSunat", "hashSunat", "fechaEmision", "fechaEnvio", "intentosEnvio", "createdAt", "updatedAt", "emisorRuc", "emisorRazonSocial", "emisorNombreComercial", "emisorDireccionFiscal", "emisorUbigeoFiscal", "emisorCodigoEstablecimiento", snapshot, ambiente, "comprobanteOrigenId", "motivoNota", "motivoNotaDescripcion", "esNotaExcepcional", "operationId", "ticketSunat", "hashCpe", "xmlStorageKey", "cdrStorageKey", "pdfStorageKey", "emitidoPor") FROM stdin;
\.


--
-- Data for Name: comunicaciones_baja; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comunicaciones_baja (id, "comprobanteId", "identificadorBaja", motivo, "fechaGeneracion", "fechaReferencia", estado, "ticketSunat", "cdrStorageKey", "errorMessage", "iniciadoPor", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: config_empresa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.config_empresa (id, "razonSocial", ruc, direccion, telefono, email, logo, "serieFactura", "serieBoleta", "serieNotaCredito", "serieNotaDebito", "correlativoFactura", "correlativoBoleta", "correlativoNotaCredito", "correlativoNotaDebito", "porcentajeIGV", "updatedAt", "nombreComercial", slogan, "descripcionCorta", "descripcionSeo", rubro, website, "telefonoVentas", "telefonoSoporte", whatsapp, "emailVentas", "emailSoporte", "logoDark", favicon, "colorPrimario", "colorSecundario", "heroTitulo", "heroSubtitulo", "catalogoDescripcion", "contactoDescripcion", "garantiaDescripcion", "ticketDescripcion", "pwaDescripcion") FROM stdin;
empresa	FORSE SUR S.A.C.						F001	B001	FC01	FD01	0	0	0	0	18.00	2026-05-03 15:41:32.215	Force Importaciones													#EA580C	#EA580C							
\.


--
-- Data for Name: config_empresa_fiscal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.config_empresa_fiscal (id, ruc, "razonSocial", "nombreComercial", "direccionFiscal", "ubigeoFiscal", "codigoEstablecimiento", "correoSee", "regimenTributario", "formatoImpresionDefault", "pieImpresion", "createdAt", "updatedAt", "ambienteDefault") FROM stdin;
\.


--
-- Data for Name: contactos_cliente; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contactos_cliente (id, "clienteId", tipo, descripcion, fecha, "usuarioId", "createdAt") FROM stdin;
\.


--
-- Data for Name: detalles_orden_compra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalles_orden_compra (id, "ordenCompraId", "productoId", cantidad, "cantidadRecibida", "precioUnitario", subtotal) FROM stdin;
\.


--
-- Data for Name: detalles_recepcion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalles_recepcion (id, "recepcionId", "productoId", "cantidadRecibida") FROM stdin;
\.


--
-- Data for Name: detalles_ticket; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalles_ticket (id, "ticketId", "productoId", cantidad, "precioUnitario", notas, "createdAt", "cubiertoGarantia") FROM stdin;
\.


--
-- Data for Name: detalles_venta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalles_venta (id, "ventaId", "productoId", cantidad, "precioUnitario", descuento, subtotal, "equipoSerie") FROM stdin;
\.


--
-- Data for Name: empresa_sedes_fiscales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empresa_sedes_fiscales (id, "configEmpresaFiscalId", nombre, "codigoEstablecimientoSunat", direccion, ubigeo, activo, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: equipo_clientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipo_clientes (id, "equipoId", "clienteId", "ventaId", "fechaInicio", "fechaFin", notas, "createdAt") FROM stdin;
\.


--
-- Data for Name: equipos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipos (id, "numeroSerie", "productoId", estado, ubicacion, firmware, notas, "createdAt", "updatedAt", "estadoComercial", condicion, procedencia, "contadorInicial", "contadorActual", "fechaIngreso", "observacionEstado", "codigoQr", "almacenId", "ipAddress", "snmpCommunity", "snmpPort") FROM stdin;
b3a3d66d-1a31-4a87-890f-7df205855d4b	ABC123	d187dead-e4ac-4e69-8021-5e1cce955204	ACTIVO				2026-05-04 19:45:06.457	2026-05-04 19:45:06.457	DISPONIBLE	\N		40000	40000	2026-05-04 00:00:00		EQP:ABC123	1ea3fb8a-4aea-48af-ad47-2db5199f7dc1	\N	public	161
\.


--
-- Data for Name: fiscal_secrets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fiscal_secrets (id, scope, name, "encryptedValue", iv, "authTag", algorithm, "keyVersion", "rotatedAt", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: garantias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.garantias (id, "equipoId", "ventaId", "clienteIdOriginal", "clienteDocTipo", "clienteDocNumero", "clienteNombre", "fechaInicio", "fechaFin", cobertura, exclusiones, estado, "codigoQR", "createdAt", "updatedAt", "contadorInicio", "contadorMaxCopias") FROM stdin;
\.


--
-- Data for Name: historial_tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.historial_tickets (id, "ticketId", "usuarioId", campo, "valorAntes", "valorDespues", notas, "createdAt") FROM stdin;
aa7b724e-7275-4375-9e25-28b4901f379f	915704a6-0e10-48b6-9a63-835b61782f5a	9cd8b54b-435b-41fc-9ce9-32226316aef4	estado	\N	ABIERTO	Ticket creado	2026-05-04 19:46:29.056
\.


--
-- Data for Name: lecturas_snmp; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lecturas_snmp (id, "equipoId", "timestamp", "nivelTonerNegro", "nivelTonerCian", "nivelTonerMagenta", "nivelTonerAmarillo", "paginasTotales", "erroresActivos", "estadoFusor", "rawData") FROM stdin;
\.


--
-- Data for Name: marcas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marcas (id, nombre, "createdAt", "updatedAt", "deletedAt", tipos) FROM stdin;
31ec3903-250b-49c1-8a97-444f6d9e6049	Konica minolta	2026-04-29 19:24:14.796	2026-04-29 19:24:14.796	\N	{EQUIPO}
\.


--
-- Data for Name: metodos_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.metodos_pago (id, codigo, nombre, activo, "createdAt", "updatedAt") FROM stdin;
58c440b7-8e79-4af9-9012-329bdce60ede	EFECTIVO	Efectivo	t	2026-04-28 20:22:35.606	2026-05-05 01:27:24.532
2ad66066-3258-4f3d-b687-aa715a20964e	TRANSFERENCIA	Transferencia	t	2026-05-02 20:34:00.817	2026-05-05 01:27:24.544
ff641cb4-f227-49a0-98c2-2b5e95c3cc31	YAPE_PLIN	Yape / Plin	t	2026-05-04 20:26:58.136	2026-05-05 01:27:24.547
c29dd47f-8cc4-4931-9778-6f7229e3626b	TARJETA_CREDITO	Tarjeta de crédito	t	2026-05-04 20:26:58.14	2026-05-05 01:27:24.552
daa31ff3-75a1-4313-80a8-c3e6816fd760	TARJETA_DEBITO	Tarjeta de débito	t	2026-05-04 20:26:58.142	2026-05-05 01:27:24.556
\.


--
-- Data for Name: modelos_catalogo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modelos_catalogo (id, nombre, descripcion, tipo, "marcaId", activo, "createdAt", "updatedAt", "deletedAt") FROM stdin;
b71acf28-bd41-42d5-8c72-ebc4743b1918	Bizhub 888	\N	EQUIPO	31ec3903-250b-49c1-8a97-444f6d9e6049	t	2026-04-29 19:24:40.74	2026-04-29 19:24:40.74	\N
\.


--
-- Data for Name: movimientos_caja; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimientos_caja (id, "aperturaId", tipo, monto, "metodoPagoId", concepto, "referenciaTipo", "referenciaId", "usuarioId", "createdAt") FROM stdin;
\.


--
-- Data for Name: movimientos_stock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimientos_stock (id, tipo, "productoId", "almacenOrigenId", "almacenDestinoId", cantidad, "cantidadAnterior", "cantidadPosterior", "costoUnitario", "referenciaId", "referenciaTipo", justificacion, "usuarioId", "createdAt") FROM stdin;
c712a76f-f6ad-446e-9381-cd94244edeb9	AJUSTE_POSITIVO	d187dead-e4ac-4e69-8021-5e1cce955204	\N	1ea3fb8a-4aea-48af-ad47-2db5199f7dc1	1	0	1	\N	ABC123	EQUIPO	Ingreso automático al inventario por sincronización del equipo ABC123	9cd8b54b-435b-41fc-9ce9-32226316aef4	2026-05-04 19:45:06.499
\.


--
-- Data for Name: notas_credito; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notas_credito (id, "comprobanteOrigenId", tipo, motivo, monto, serie, correlativo, numero, estado, "xmlContent", "cdrContent", "intentosEnvio", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notas_debito; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notas_debito (id, "comprobanteOrigenId", motivo, monto, serie, correlativo, numero, estado, "xmlContent", "cdrContent", "intentosEnvio", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ordenes_compra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ordenes_compra (id, numero, "proveedorId", "usuarioId", estado, subtotal, igv, total, notas, "fechaEsperada", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: producto_imagenes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.producto_imagenes (id, "productoId", url, nombre, tipo, tamano, "esPrincipal", orden, "createdAt") FROM stdin;
66d26c8e-1763-4bb2-b4c3-9b707d2afcb5	d187dead-e4ac-4e69-8021-5e1cce955204	/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg	Konica-Minolta-bizhub-808-Segunda-Mano.jpg	image/jpeg	23644	t	0	2026-05-04 21:44:09.897
\.


--
-- Data for Name: producto_proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.producto_proveedores (id, "productoId", "proveedorId", "codigoProveedor", "precioCompra", "esPrincipal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, sku, nombre, descripcion, "categoriaId", "marcaId", modelo, "precioCompra", "precioVenta", "precioMinimo", "stockMinimo", "manejaInventario", "tieneNumeroSerie", "esConsumible", imagen, activo, "createdAt", "updatedAt", "deletedAt", "unidadMedidaId", tipo, "codigoBarras", "codigoQr", condicion, "requiereRepuestos", "tiempoEstimadoMin", "modeloCatalogoId", atributos, "garantiaMaxCopias", "mesesGarantia") FROM stdin;
d187dead-e4ac-4e69-8021-5e1cce955204	REP-GEN-0001	Impresora copiadora Konica minolta Bizhub 888	\N	fe878243-5ff1-4323-90de-cd4b89a6e5f4	31ec3903-250b-49c1-8a97-444f6d9e6049	Bizhub 888	5000.00	5300.00	5200.00	1	t	t	f	/uploads/public/34baa744-2db7-442d-b096-0ef8202bae43.jpg	t	2026-05-04 19:43:32.153	2026-05-04 21:44:09.897	\N	11111111-1111-4111-8111-111111111111	EQUIPO	REP-GEN-0001	\N	USADO	f	\N	b71acf28-bd41-42d5-8c72-ebc4743b1918	\N	\N	12
e0c39fbe-f75e-4355-a96f-69a964104b76	SER-MAN-0001	Servicio de mantenimiento preventivo	El precio base es por unidad de servicio, si se hacen varios servicios en uno mismo el costo base por servicio agregado podria resumirse a la mitad, es decir un servicio = 100, 2 servicios del mismo tipo  seria igual a 150.	c9a5de66-bce5-4471-bd35-d89b5826bcf1	\N	\N	100.00	100.00	100.00	0	f	f	f	\N	t	2026-05-05 22:07:30.06	2026-05-05 23:57:15.289	\N	11111111-1111-4111-8111-111111111111	SERVICIO	SER-MAN-0001	PRD:SER-MAN-0001	\N	t	30	\N	null	\N	12
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, "razonSocial", ruc, email, telefono, direccion, "contactoNombre", "contactoTelefono", notas, activo, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: recepciones_compra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recepciones_compra (id, "ordenCompraId", notas, "createdAt") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, "usuarioId", token, "expiresAt", revoked, "createdAt") FROM stdin;
071f4720-1634-40fe-813f-c149c1e0384f	9cd8b54b-435b-41fc-9ce9-32226316aef4	3e232463c45a8830ce283335e15eb17eaadcf2d54517e5c730386e481eeeba28676e62aa6d4a34d7dc907630070336a53ab032f164c08d8b5f81cc08645a82b6	2026-05-28 22:14:20.078	t	2026-04-28 22:14:20.083
e88222f3-5101-47a8-b5d3-79bb2b113968	9cd8b54b-435b-41fc-9ce9-32226316aef4	78b40c4962deafbfafa8281e9d08974bbbf95b42d05dd2222b2f79ce73d40338e0c35c192e98738c6caefb9525b64a1768d122957f4b09b677dc6a1134d9e359	2026-05-28 22:15:00.467	t	2026-04-28 22:15:00.467
046c1aa3-ac65-4d45-aa1f-677774b2f12e	9cd8b54b-435b-41fc-9ce9-32226316aef4	49534580f1ec41adc928975988f1ed96535a3a9bb6992986aa610b09a565f5f97c3f3763350730f653818d145b0c87ed07032c5f6a048a0ffb82182dc6c0de74	2026-05-29 00:23:31.242	f	2026-04-29 00:23:31.247
3e33db1b-1a51-4d2b-a195-0257e08ea825	9cd8b54b-435b-41fc-9ce9-32226316aef4	7f7cf1938c10db6ab3f43f5bd4f790ad7efbbabe447ce9d755d01fce7ef43668c526de9236cf5c6ae637cfe2dc46782ad70ed335b27f21e81feef830c77e3ae1	2026-05-29 00:23:34.852	f	2026-04-29 00:23:34.853
35095a55-d6f6-4e8b-b565-e6c9251617a8	9cd8b54b-435b-41fc-9ce9-32226316aef4	ae8c9aa8c4257f4b31cabf546429e5275cda3e6801b8dc7c0a4ceeede766e7c2601be5b6b64a3689273e72f4261bcc872b658c0c516fb4e4778cf58686761488	2026-05-29 02:16:12.858	f	2026-04-29 02:16:12.859
c18a16e9-f3fa-469e-80f3-76b018d57ccd	9cd8b54b-435b-41fc-9ce9-32226316aef4	971f43b793694b65017c5650b4bc750dd44282a9ac354d6d52ddc9b34cf765b6a230d25474da5592a455b9995dfb7fa1d9b3e2e50c2dfcc1bb8be509d2bd3712	2026-05-29 18:59:45.56	f	2026-04-29 18:59:45.565
248ed7a9-de67-4065-943f-642dfff2ad5d	9cd8b54b-435b-41fc-9ce9-32226316aef4	781eb2e71c1e902354131ff14098c8e5a68a01801aeef18e48361e4694ab428d816f2840522d99cb82196a099c0d529bdd2a6863cac95659230cfd1fde644e45	2026-05-29 19:09:12.006	f	2026-04-29 19:09:12.006
b6943cd7-eb34-403d-90ae-b819a32182c0	9cd8b54b-435b-41fc-9ce9-32226316aef4	b555151b83ca33b6f5d03bc1d60be0610e6a5dd88b82c113df6051faac12334e2c5c9135775982431abc33a58bed55a4b514a1a5969520f1cbed89eaaa4a9a9b	2026-05-29 19:42:00.125	f	2026-04-29 19:42:00.132
cf06d846-6bec-4690-9fd5-c70183a209d8	9cd8b54b-435b-41fc-9ce9-32226316aef4	800894977d3505c584f90b011911e2b7a76890325f76241c7c9a3dc6931fd110bbce70e95e5c7fb33414e4fc15c46e87f3ec43f9e58dba696fb4737c755c4715	2026-05-30 19:48:37.373	f	2026-04-30 19:48:37.379
d9587943-3a36-439e-a80e-cf0150df6187	9cd8b54b-435b-41fc-9ce9-32226316aef4	d3b652cb4469b0a1cc86ce249ea7d2ff7503e03a154c298c8043cd8737d4ad7bc3fbb332affc7c1ea4d954ebd97db60e96c1818edd984bfb399549fe87b5f415	2026-05-31 04:01:20.654	f	2026-05-01 04:01:20.66
2f3aaaa8-a7bd-4c09-9f26-7bffc1875494	9cd8b54b-435b-41fc-9ce9-32226316aef4	6cfe72f66ad3f5bb9d2dced1632671cfa8e6f36e92b9dabed860ce71d94c3ebba380015a3ad262c717e171d623a0361f89ca6b4fd358d7c6a4cb8d31e25ceeda	2026-05-31 06:54:23.078	f	2026-05-01 06:54:23.094
4b2d1741-e0fe-4b50-8109-44a91a3912bd	9cd8b54b-435b-41fc-9ce9-32226316aef4	2117f7b5deabe62c80d599cf6025876490975a29311e0100b8be35d35c9a598cc05021727fb208694164afacbe79fe2cfa1fcb62652fab8fa8b8e01e81c382e4	2026-05-31 19:14:36.61	f	2026-05-01 19:14:36.645
7e838b6f-880a-48cc-80fc-afd0933477e0	9cd8b54b-435b-41fc-9ce9-32226316aef4	f6e0e5e35fe9124276eff1f65f1bf0fb779842b8712924f5313e797a5756af037dd930021fab6b584ce22c2721cf04d5caf48dab7192e1d3dd7ed78f2732c9e3	2026-06-01 01:07:41.704	f	2026-05-02 01:07:41.712
83591a3f-41ab-4bd7-b170-c7fdb0b54fcd	9cd8b54b-435b-41fc-9ce9-32226316aef4	924f7427980ae678059d82756b6cbb06c50af526c77748ef229af90be0a5a6304aa96a94f8668de9fe63d42164a773aa35770abcacdd57b34f0829ec77ac5436	2026-06-01 19:19:05.871	t	2026-05-02 19:19:05.877
5868bd71-061f-4c20-8683-088dd51b6345	9cd8b54b-435b-41fc-9ce9-32226316aef4	fb1dc6280782d4d189a787c971a56492666a30abc56f103bb9df28e45d8e74c3c51172adc71070b4cb954ce8ede8feb95fb6d763e255cc41f8aae7ccc75a3d67	2026-06-02 03:23:41.345	f	2026-05-03 03:23:41.35
05589990-58c6-4ec7-895a-a06355f41a07	9cd8b54b-435b-41fc-9ce9-32226316aef4	8f2bc42502287f63e5fa39d8555bd12dbaddc5dfbffe1d15e3aeaf5873edc0dac50901e2ac6255f61d287773ddb41a74f0aa20cf89eb5582a15ace30bdae190a	2026-06-02 15:22:47.29	t	2026-05-03 15:22:47.297
c493c3f2-df9a-4bc8-9d27-491614535a41	9cd8b54b-435b-41fc-9ce9-32226316aef4	2525d51941f84a234d9d0f627c2afe21522bc3634a7d7f3630abc8ed36c76d1fa4528cfc4491e110d5f934de9335583125f079fd3b4b168d0032feb471c87372	2026-06-03 00:11:00.19	f	2026-05-04 00:11:00.201
50e08c59-29eb-475d-aac4-4e0b43d4baf2	9cd8b54b-435b-41fc-9ce9-32226316aef4	72f550cb0bcafdbc3ca5c84b6e9cb39aeba35c886b9d31ca41041e283784e9ff46ace32ace48fd15af2b04f307689b8bf7cd3962d3ffc77d7e8b4137ab7bd30e	2026-06-03 03:33:32.15	t	2026-05-04 03:33:32.155
e426649e-b536-48d9-a4c2-b1e9c899589c	9cd8b54b-435b-41fc-9ce9-32226316aef4	c7cad4494902eb63284a4c0bdb82d2956bfff02d3011a73dbeca228f085f82e692d97eed0be4824f39a7e487dba6486dc7bb162f0adf2002aaab09f405c0c916	2026-06-03 14:04:34.13	f	2026-05-04 14:04:34.139
1bd46cc7-632c-4c4c-b64a-3b57bc8e3d64	9cd8b54b-435b-41fc-9ce9-32226316aef4	65ca0a90ec21c578ba174b9a9dae98d51a3d55d35ea63776a73701121b7cfd22435a71f587a525522197400d0d10ea018e9680af70d6be26b9dce5314e5574d4	2026-06-03 19:40:50.974	t	2026-05-04 19:40:50.975
318a4e7f-4386-4376-94a5-9b28e39a4911	9cd8b54b-435b-41fc-9ce9-32226316aef4	c9b88e280e343acb467d5307cbab9db308f9c645d7b3591a1ce2c84f214c4ac580d563c95f466615e8e5026d421146191d03419abb6ee5d3b0f6a260ba42e079	2026-06-04 03:39:36.704	f	2026-05-05 03:39:36.724
de1cf733-0c84-4aed-b86b-6dbb8de09b40	9cd8b54b-435b-41fc-9ce9-32226316aef4	4bebc5ce6ccdad025e326f7be11cca9e04f7b7070c904a8ba6aff07f825c62f1ec11ed29c1417dc9ca427db008397e2655dd0fbfde3bc718f3d78104c48c845c	2026-06-04 03:39:49.924	f	2026-05-05 03:39:49.925
5c063035-87bc-446a-8891-966765e594e8	9cd8b54b-435b-41fc-9ce9-32226316aef4	89e98f2ef33f7ca87aed499a147f3fed07fba1a5af80eeb511ae3c95143a8907fe848d8474c4432467e6aa1119f011e6e617c75c3f7a19f51a95d6c38f07b6d7	2026-06-03 19:24:08.534	t	2026-05-04 19:24:08.539
d3b0a454-0c02-478d-aa71-6083b1730284	9cd8b54b-435b-41fc-9ce9-32226316aef4	15daa999eb1d9168ed2809e935c7cbe802090830ebde253cd5bd1d10e324c44336bcf1d666886fd43a25659c689189645bdb9f9a68e9a280b7c8c6ac7388ea6b	2026-06-04 03:39:50.819	f	2026-05-05 03:39:50.82
868b012b-9944-4def-abac-0940ca579245	9cd8b54b-435b-41fc-9ce9-32226316aef4	20c9636c829c7b5a03559a6793e41dc10d9a8a513abe5e396c51536ac2c5d73f2b780c65a67268beb3594ba9768436b685db8f75e0ca63c94ef90423d86c7c03	2026-06-04 21:47:11.461	t	2026-05-05 21:47:11.465
c2561c4e-12e8-4534-a02a-f51aa6c346a8	9cd8b54b-435b-41fc-9ce9-32226316aef4	73ff5c8fd622cd8729ba41dc57a08c4a47412b18072c2445dac20dab346678ad15dc396098ec00e5b4bde676608f1f08cc5b36cecb428e6bfd77ded486711071	2026-06-04 22:02:43.595	t	2026-05-05 22:02:43.596
84ebf1ef-0039-4295-ad07-ec37d2fcb895	e8da4375-50aa-4636-a4eb-c524f7d38634	b2501423251e836250a93405e9792127a454f1c252a7eeac75d1171274917d59b012560ddbcbbd3c43744fcc6894459bf54e818351833b469b55bb3d19bb7e28	2026-06-04 22:03:19.17	t	2026-05-05 22:03:19.171
18a32c33-537a-48c7-a7dd-1ebe46a91f89	9cd8b54b-435b-41fc-9ce9-32226316aef4	fe993c9272be398e1c0a61ab091c6ec8fd0c88e8be79fd12db0104fb6ac63b9cd11e783442edf08f3a2fb55ccbd5dbe803791804632ac6821990f811b2b5b685	2026-06-05 04:55:03.218	f	2026-05-06 04:55:03.224
a30c484b-f6e0-432f-a0c9-f6fa427b077e	9cd8b54b-435b-41fc-9ce9-32226316aef4	7d071e561b741d0ccab4be2035cf12d9eb8b2835e4007a46cf2dc498adebae5fbe7385c9a29716d4fb2be975bf9b67286aa7cb80fbf1bd198736999011bdd2eb	2026-06-04 22:04:07.252	t	2026-05-05 22:04:07.253
c8e5cc4b-3785-4745-a151-fe5fc86a1775	9cd8b54b-435b-41fc-9ce9-32226316aef4	69b9b0cde8b390d8f380e7052f9fa6579867a17b4a8b847d648578fdc0a177453187e7fce16f614e4cd32cadc3f42ad718cac8c687fad0b6b3685b9b29c1e77d	2026-06-05 06:04:35.353	f	2026-05-06 06:04:35.354
4b47730f-e907-4f52-973b-d2f25aebb4bf	9cd8b54b-435b-41fc-9ce9-32226316aef4	152cb8cdc91445258e5bd792bfd4b7327d4ecfcdb8f16f316962e9cb0de0de5b3595ef82f1629d07a8972a9e87486e47b8136e7ced768fccfe6e9bf184a32176	2026-06-05 13:09:29.708	f	2026-05-06 13:09:29.72
\.


--
-- Data for Name: series_documento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.series_documento (id, tipo, serie, "correlativoActual", "codigoEstablecimiento", descripcion, activo, "createdAt", "updatedAt", "deletedAt", "configEmpresaFiscalId", "sedeFiscalId", ambiente) FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tickets (id, codigo, "clienteId", "equipoId", "tecnicoId", "creadoPorId", titulo, descripcion, "fallaReportada", prioridad, estado, "tipoServicio", diagnostico, solucion, "montoManoObra", "montoRepuestos", "montoTotal", "fechaRecepcion", "fechaPromesa", "fechaCierre", "firmaCliente", "firmaFecha", "firmaGeoLat", "firmaGeoLng", notas, "createdAt", "updatedAt", "deletedAt") FROM stdin;
915704a6-0e10-48b6-9a63-835b61782f5a	TKT-2026-0001	d75bd204-8023-40cc-8783-70584add56e0	b3a3d66d-1a31-4a87-890f-7df205855d4b	\N	9cd8b54b-435b-41fc-9ce9-32226316aef4	Falla en las gomas de rodamiento	Constantes trabamientos durante la impresion.	\N	ALTA	ABIERTO	VISITA	\N	\N	\N	\N	\N	2026-05-04 19:46:29.03	\N	\N	\N	\N	\N	\N	\N	2026-05-04 19:46:29.03	2026-05-04 19:46:29.03	\N
\.


--
-- Data for Name: tipos_movimiento_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tipos_movimiento_config (id, codigo, nombre, activo, orden, "createdAt", "updatedAt", comportamiento, "requiereJustificacion", "requiereEvidencia", "disponibleTecnico") FROM stdin;
a1111111-1111-4111-8111-111111111111	COMPRA_RECIBIDA	Compra recibida	t	1	2026-04-28 15:21:46.435	2026-04-28 20:22:35.626	ENTRADA	f	f	f
a2222222-2222-4222-8222-222222222222	VENTA	Venta	t	2	2026-04-28 15:21:46.435	2026-04-28 20:22:35.632	SALIDA	f	f	f
a3333333-3333-4333-8333-333333333333	CONSUMO_SOPORTE	Consumo soporte	t	3	2026-04-28 15:21:46.435	2026-04-28 20:22:35.636	SALIDA	f	f	t
a4444444-4444-4444-8444-444444444444	DEVOLUCION_CLIENTE	Devolución cliente	t	4	2026-04-28 15:21:46.435	2026-04-28 20:22:35.638	ENTRADA	f	f	f
a5555555-5555-4555-8555-555555555555	DEVOLUCION_PROVEEDOR	Devolución proveedor	t	5	2026-04-28 15:21:46.435	2026-04-28 20:22:35.64	SALIDA	f	f	f
a6666666-6666-4666-8666-666666666666	AJUSTE_POSITIVO	Ajuste positivo	t	6	2026-04-28 15:21:46.435	2026-04-28 20:22:35.643	ENTRADA	t	f	f
a7777777-7777-4777-8777-777777777777	AJUSTE_NEGATIVO	Ajuste negativo	t	7	2026-04-28 15:21:46.435	2026-04-28 20:22:35.649	SALIDA	t	f	f
a8888888-8888-4888-8888-888888888888	TRANSFERENCIA	Transferencia	t	8	2026-04-28 15:21:46.435	2026-04-28 20:22:35.652	TRANSFERENCIA	f	f	f
a9999999-9999-4999-8999-999999999999	BAJA_DANO	Baja por daño	t	9	2026-04-28 15:21:46.435	2026-04-28 20:22:35.655	SALIDA	t	t	f
\.


--
-- Data for Name: unidades_medida; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unidades_medida (id, codigo, nombre, descripcion, activo, "createdAt", "updatedAt", "deletedAt") FROM stdin;
11111111-1111-4111-8111-111111111111	UND	Unidad	Unidad genérica	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.664	\N
22222222-2222-4222-8222-222222222222	KG	Kilogramo	Peso en kilogramos	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.667	\N
33333333-3333-4333-8333-333333333333	GR	Gramo	Peso en gramos	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.669	\N
44444444-4444-4444-8444-444444444444	LT	Litro	Volumen en litros	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.67	\N
55555555-5555-4555-8555-555555555555	ML	Mililitro	Volumen en mililitros	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.672	\N
66666666-6666-4666-8666-666666666666	M	Metro	Longitud en metros	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.673	\N
77777777-7777-4777-8777-777777777777	CM	Centímetro	Longitud en centímetros	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.675	\N
88888888-8888-4888-8888-888888888888	CAJA	Caja	Presentación por caja	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.679	\N
99999999-9999-4999-8999-999999999999	PAQ	Paquete	Presentación por paquete	t	2026-04-28 15:21:46.397	2026-04-28 20:22:35.682	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, apellido, email, password, rol, activo, "mustChangePassword", "ultimoAcceso", "createdAt", "updatedAt", "deletedAt", telefono, celular, whatsapp, direccion, cargo, bio, "avatarUrl") FROM stdin;
9cd8b54b-435b-41fc-9ce9-32226316aef4	Administrador	Sistema	admin@erp.local	$2b$10$Z916hLxI7JieeqnVjKcHuuvsbXeGli0BwSLeq0zugVRA1Cl.wbfga	ADMIN	t	f	2026-05-06 13:09:29.667	2026-04-28 20:22:35.577	2026-05-06 13:09:29.685	\N	\N	\N	\N	\N	\N	\N	/uploads/public/5aea6cd1-40f5-449c-9aa6-5e761b4dbcfc.jpeg
e8da4375-50aa-4636-a4eb-c524f7d38634	Edard	Michael	edardmichaelu@gmail.com	$2b$10$fhDAI1Np1q8pY9SffR1Lpe2A.Dhk4Q12SVid3xAfsxIr5oYYxfX.e	TECNICO	t	f	2026-05-05 22:03:19.168	2026-05-05 22:02:35.775	2026-05-05 22:03:30.127	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ventas (id, numero, "clienteId", "usuarioId", "metodoPagoId", "referenciaPago", estado, subtotal, descuento, igv, total, notas, "validoHasta", "createdAt", "updatedAt", "deletedAt", "estadoFacturacion") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: adjuntos adjuntos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjuntos
    ADD CONSTRAINT adjuntos_pkey PRIMARY KEY (id);


--
-- Name: adjuntos_ticket adjuntos_ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjuntos_ticket
    ADD CONSTRAINT adjuntos_ticket_pkey PRIMARY KEY (id);


--
-- Name: alertas_stock alertas_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_stock
    ADD CONSTRAINT alertas_stock_pkey PRIMARY KEY (id);


--
-- Name: almacen_stocks almacen_stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacen_stocks
    ADD CONSTRAINT almacen_stocks_pkey PRIMARY KEY (id);


--
-- Name: almacenes almacenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacenes
    ADD CONSTRAINT almacenes_pkey PRIMARY KEY (id);


--
-- Name: aperturas_caja aperturas_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aperturas_caja
    ADD CONSTRAINT aperturas_caja_pkey PRIMARY KEY (id);


--
-- Name: arqueos_caja arqueos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arqueos_caja
    ADD CONSTRAINT arqueos_caja_pkey PRIMARY KEY (id);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: cajas cajas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id);


--
-- Name: casos_garantia casos_garantia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.casos_garantia
    ADD CONSTRAINT casos_garantia_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: certificados_digitales certificados_digitales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales
    ADD CONSTRAINT certificados_digitales_pkey PRIMARY KEY (id);


--
-- Name: cliente_validaciones_sunat cliente_validaciones_sunat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_validaciones_sunat
    ADD CONSTRAINT cliente_validaciones_sunat_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: compatibilidades compatibilidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibilidades
    ADD CONSTRAINT compatibilidades_pkey PRIMARY KEY (id);


--
-- Name: comprobante_detalles comprobante_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_detalles
    ADD CONSTRAINT comprobante_detalles_pkey PRIMARY KEY (id);


--
-- Name: comprobante_envio_logs comprobante_envio_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_envio_logs
    ADD CONSTRAINT comprobante_envio_logs_pkey PRIMARY KEY (id);


--
-- Name: comprobantes comprobantes_operationId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobantes
    ADD CONSTRAINT "comprobantes_operationId_key" UNIQUE ("operationId");


--
-- Name: comprobantes comprobantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobantes
    ADD CONSTRAINT comprobantes_pkey PRIMARY KEY (id);


--
-- Name: comunicaciones_baja comunicaciones_baja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicaciones_baja
    ADD CONSTRAINT comunicaciones_baja_pkey PRIMARY KEY (id);


--
-- Name: config_empresa_fiscal config_empresa_fiscal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_empresa_fiscal
    ADD CONSTRAINT config_empresa_fiscal_pkey PRIMARY KEY (id);


--
-- Name: config_empresa config_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_empresa
    ADD CONSTRAINT config_empresa_pkey PRIMARY KEY (id);


--
-- Name: contactos_cliente contactos_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos_cliente
    ADD CONSTRAINT contactos_cliente_pkey PRIMARY KEY (id);


--
-- Name: detalles_orden_compra detalles_orden_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra
    ADD CONSTRAINT detalles_orden_compra_pkey PRIMARY KEY (id);


--
-- Name: detalles_recepcion detalles_recepcion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion
    ADD CONSTRAINT detalles_recepcion_pkey PRIMARY KEY (id);


--
-- Name: detalles_ticket detalles_ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_ticket
    ADD CONSTRAINT detalles_ticket_pkey PRIMARY KEY (id);


--
-- Name: detalles_venta detalles_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_venta
    ADD CONSTRAINT detalles_venta_pkey PRIMARY KEY (id);


--
-- Name: empresa_sedes_fiscales empresa_sedes_fiscales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_sedes_fiscales
    ADD CONSTRAINT empresa_sedes_fiscales_pkey PRIMARY KEY (id);


--
-- Name: equipo_clientes equipo_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_clientes
    ADD CONSTRAINT equipo_clientes_pkey PRIMARY KEY (id);


--
-- Name: equipos equipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_pkey PRIMARY KEY (id);


--
-- Name: fiscal_secrets fiscal_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_secrets
    ADD CONSTRAINT fiscal_secrets_pkey PRIMARY KEY (id);


--
-- Name: garantias garantias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantias
    ADD CONSTRAINT garantias_pkey PRIMARY KEY (id);


--
-- Name: historial_tickets historial_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_tickets
    ADD CONSTRAINT historial_tickets_pkey PRIMARY KEY (id);


--
-- Name: lecturas_snmp lecturas_snmp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturas_snmp
    ADD CONSTRAINT lecturas_snmp_pkey PRIMARY KEY (id);


--
-- Name: marcas marcas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marcas
    ADD CONSTRAINT marcas_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: modelos_catalogo modelos_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_catalogo
    ADD CONSTRAINT modelos_catalogo_pkey PRIMARY KEY (id);


--
-- Name: movimientos_caja movimientos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id);


--
-- Name: movimientos_stock movimientos_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id);


--
-- Name: notas_credito notas_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_credito
    ADD CONSTRAINT notas_credito_pkey PRIMARY KEY (id);


--
-- Name: notas_debito notas_debito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_debito
    ADD CONSTRAINT notas_debito_pkey PRIMARY KEY (id);


--
-- Name: ordenes_compra ordenes_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_pkey PRIMARY KEY (id);


--
-- Name: producto_imagenes producto_imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_imagenes
    ADD CONSTRAINT producto_imagenes_pkey PRIMARY KEY (id);


--
-- Name: producto_proveedores producto_proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedores
    ADD CONSTRAINT producto_proveedores_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: recepciones_compra recepciones_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones_compra
    ADD CONSTRAINT recepciones_compra_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: series_documento series_documento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_documento
    ADD CONSTRAINT series_documento_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tipos_movimiento_config tipos_movimiento_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_movimiento_config
    ADD CONSTRAINT tipos_movimiento_config_pkey PRIMARY KEY (id);


--
-- Name: unidades_medida unidades_medida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: adjuntos_entidad_entidadId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "adjuntos_entidad_entidadId_idx" ON public.adjuntos USING btree (entidad, "entidadId");


--
-- Name: adjuntos_ticket_ticketId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "adjuntos_ticket_ticketId_idx" ON public.adjuntos_ticket USING btree ("ticketId");


--
-- Name: alertas_stock_almacenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alertas_stock_almacenId_idx" ON public.alertas_stock USING btree ("almacenId");


--
-- Name: alertas_stock_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alertas_stock_productoId_idx" ON public.alertas_stock USING btree ("productoId");


--
-- Name: alertas_stock_resueltaPorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "alertas_stock_resueltaPorId_idx" ON public.alertas_stock USING btree ("resueltaPorId");


--
-- Name: almacen_stocks_almacenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "almacen_stocks_almacenId_idx" ON public.almacen_stocks USING btree ("almacenId");


--
-- Name: almacen_stocks_almacenId_productoId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "almacen_stocks_almacenId_productoId_key" ON public.almacen_stocks USING btree ("almacenId", "productoId");


--
-- Name: almacen_stocks_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "almacen_stocks_productoId_idx" ON public.almacen_stocks USING btree ("productoId");


--
-- Name: almacenes_nombre_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX almacenes_nombre_active_key ON public.almacenes USING btree (nombre) WHERE ("deletedAt" IS NULL);


--
-- Name: aperturas_caja_cajaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aperturas_caja_cajaId_idx" ON public.aperturas_caja USING btree ("cajaId");


--
-- Name: aperturas_caja_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aperturas_caja_estado_idx ON public.aperturas_caja USING btree (estado);


--
-- Name: aperturas_caja_usuarioAperturaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aperturas_caja_usuarioAperturaId_idx" ON public.aperturas_caja USING btree ("usuarioAperturaId");


--
-- Name: aperturas_caja_usuarioCierreId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "aperturas_caja_usuarioCierreId_idx" ON public.aperturas_caja USING btree ("usuarioCierreId");


--
-- Name: arqueos_caja_aperturaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "arqueos_caja_aperturaId_idx" ON public.arqueos_caja USING btree ("aperturaId");


--
-- Name: arqueos_caja_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "arqueos_caja_usuarioId_idx" ON public.arqueos_caja USING btree ("usuarioId");


--
-- Name: auditoria_modelo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_modelo_idx ON public.auditoria USING btree (modelo);


--
-- Name: auditoria_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "auditoria_usuarioId_idx" ON public.auditoria USING btree ("usuarioId");


--
-- Name: cajas_nombre_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cajas_nombre_key ON public.cajas USING btree (nombre);


--
-- Name: casos_garantia_garantiaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "casos_garantia_garantiaId_idx" ON public.casos_garantia USING btree ("garantiaId");


--
-- Name: casos_garantia_ticketId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "casos_garantia_ticketId_idx" ON public.casos_garantia USING btree ("ticketId");


--
-- Name: categorias_nombre_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categorias_nombre_active_key ON public.categorias USING btree (nombre) WHERE ("deletedAt" IS NULL);


--
-- Name: categorias_padreId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "categorias_padreId_idx" ON public.categorias USING btree ("padreId");


--
-- Name: categorias_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categorias_tipo_idx ON public.categorias USING btree (tipo);


--
-- Name: certificados_digitales_activo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificados_digitales_activo_idx ON public.certificados_digitales USING btree (activo);


--
-- Name: certificados_digitales_configEmpresaFiscalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificados_digitales_configEmpresaFiscalId_idx" ON public.certificados_digitales USING btree ("configEmpresaFiscalId");


--
-- Name: certificados_digitales_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificados_digitales_revokedAt_idx" ON public.certificados_digitales USING btree ("revokedAt");


--
-- Name: cliente_validaciones_sunat_clienteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cliente_validaciones_sunat_clienteId_idx" ON public.cliente_validaciones_sunat USING btree ("clienteId");


--
-- Name: cliente_validaciones_sunat_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cliente_validaciones_sunat_estado_idx ON public.cliente_validaciones_sunat USING btree (estado);


--
-- Name: cliente_validaciones_sunat_tipoDocumentoSunat_numeroDocumen_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "cliente_validaciones_sunat_tipoDocumentoSunat_numeroDocumen_key" ON public.cliente_validaciones_sunat USING btree ("tipoDocumentoSunat", "numeroDocumento");


--
-- Name: clientes_dni_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clientes_dni_key ON public.clientes USING btree (dni);


--
-- Name: clientes_ruc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clientes_ruc_key ON public.clientes USING btree (ruc);


--
-- Name: compatibilidades_modeloId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compatibilidades_modeloId_idx" ON public.compatibilidades USING btree ("modeloId");


--
-- Name: compatibilidades_repuestoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "compatibilidades_repuestoId_idx" ON public.compatibilidades USING btree ("repuestoId");


--
-- Name: compatibilidades_repuestoId_modeloId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "compatibilidades_repuestoId_modeloId_key" ON public.compatibilidades USING btree ("repuestoId", "modeloId");


--
-- Name: comprobante_detalles_comprobanteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_detalles_comprobanteId_idx" ON public.comprobante_detalles USING btree ("comprobanteId");


--
-- Name: comprobante_detalles_comprobanteId_item_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "comprobante_detalles_comprobanteId_item_key" ON public.comprobante_detalles USING btree ("comprobanteId", item);


--
-- Name: comprobante_detalles_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_detalles_productoId_idx" ON public.comprobante_detalles USING btree ("productoId");


--
-- Name: comprobante_detalles_tipoAfectacionIgv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_detalles_tipoAfectacionIgv_idx" ON public.comprobante_detalles USING btree ("tipoAfectacionIgv");


--
-- Name: comprobante_detalles_tipoFiscalProducto_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_detalles_tipoFiscalProducto_idx" ON public.comprobante_detalles USING btree ("tipoFiscalProducto");


--
-- Name: comprobante_envio_logs_comprobanteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_envio_logs_comprobanteId_idx" ON public.comprobante_envio_logs USING btree ("comprobanteId");


--
-- Name: comprobante_envio_logs_comprobanteId_intento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_envio_logs_comprobanteId_intento_idx" ON public.comprobante_envio_logs USING btree ("comprobanteId", intento);


--
-- Name: comprobante_envio_logs_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobante_envio_logs_tipo_idx ON public.comprobante_envio_logs USING btree (tipo);


--
-- Name: comprobantes_comprobanteOrigenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobantes_comprobanteOrigenId_idx" ON public.comprobantes USING btree ("comprobanteOrigenId");


--
-- Name: comprobantes_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobantes_estado_idx ON public.comprobantes USING btree (estado);


--
-- Name: comprobantes_fechaEmision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobantes_fechaEmision_idx" ON public.comprobantes USING btree ("fechaEmision");


--
-- Name: comprobantes_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX comprobantes_numero_key ON public.comprobantes USING btree (numero);


--
-- Name: comprobantes_tipo_serie_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobantes_tipo_serie_idx ON public.comprobantes USING btree (tipo, serie);


--
-- Name: comprobantes_ventaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobantes_ventaId_idx" ON public.comprobantes USING btree ("ventaId");


--
-- Name: comprobantes_ventaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "comprobantes_ventaId_key" ON public.comprobantes USING btree ("ventaId");


--
-- Name: comunicaciones_baja_comprobanteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comunicaciones_baja_comprobanteId_idx" ON public.comunicaciones_baja USING btree ("comprobanteId");


--
-- Name: comunicaciones_baja_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comunicaciones_baja_estado_idx ON public.comunicaciones_baja USING btree (estado);


--
-- Name: comunicaciones_baja_identificadorBaja_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "comunicaciones_baja_identificadorBaja_key" ON public.comunicaciones_baja USING btree ("identificadorBaja");


--
-- Name: comunicaciones_baja_ticketSunat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comunicaciones_baja_ticketSunat_idx" ON public.comunicaciones_baja USING btree ("ticketSunat");


--
-- Name: config_empresa_fiscal_ambienteDefault_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "config_empresa_fiscal_ambienteDefault_idx" ON public.config_empresa_fiscal USING btree ("ambienteDefault");


--
-- Name: config_empresa_fiscal_codigoEstablecimiento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "config_empresa_fiscal_codigoEstablecimiento_idx" ON public.config_empresa_fiscal USING btree ("codigoEstablecimiento");


--
-- Name: config_empresa_fiscal_ruc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX config_empresa_fiscal_ruc_key ON public.config_empresa_fiscal USING btree (ruc);


--
-- Name: contactos_cliente_clienteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contactos_cliente_clienteId_idx" ON public.contactos_cliente USING btree ("clienteId");


--
-- Name: contactos_cliente_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contactos_cliente_usuarioId_idx" ON public.contactos_cliente USING btree ("usuarioId");


--
-- Name: detalles_orden_compra_ordenCompraId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_orden_compra_ordenCompraId_idx" ON public.detalles_orden_compra USING btree ("ordenCompraId");


--
-- Name: detalles_orden_compra_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_orden_compra_productoId_idx" ON public.detalles_orden_compra USING btree ("productoId");


--
-- Name: detalles_recepcion_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_recepcion_productoId_idx" ON public.detalles_recepcion USING btree ("productoId");


--
-- Name: detalles_recepcion_recepcionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_recepcion_recepcionId_idx" ON public.detalles_recepcion USING btree ("recepcionId");


--
-- Name: detalles_ticket_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_ticket_productoId_idx" ON public.detalles_ticket USING btree ("productoId");


--
-- Name: detalles_ticket_ticketId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_ticket_ticketId_idx" ON public.detalles_ticket USING btree ("ticketId");


--
-- Name: detalles_venta_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_venta_productoId_idx" ON public.detalles_venta USING btree ("productoId");


--
-- Name: detalles_venta_ventaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "detalles_venta_ventaId_idx" ON public.detalles_venta USING btree ("ventaId");


--
-- Name: empresa_sedes_fiscales_activo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empresa_sedes_fiscales_activo_idx ON public.empresa_sedes_fiscales USING btree (activo);


--
-- Name: empresa_sedes_fiscales_configEmpresaFiscalId_codigoEstablec_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "empresa_sedes_fiscales_configEmpresaFiscalId_codigoEstablec_key" ON public.empresa_sedes_fiscales USING btree ("configEmpresaFiscalId", "codigoEstablecimientoSunat");


--
-- Name: empresa_sedes_fiscales_configEmpresaFiscalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "empresa_sedes_fiscales_configEmpresaFiscalId_idx" ON public.empresa_sedes_fiscales USING btree ("configEmpresaFiscalId");


--
-- Name: equipo_clientes_clienteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "equipo_clientes_clienteId_idx" ON public.equipo_clientes USING btree ("clienteId");


--
-- Name: equipo_clientes_equipoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "equipo_clientes_equipoId_idx" ON public.equipo_clientes USING btree ("equipoId");


--
-- Name: equipo_clientes_ventaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "equipo_clientes_ventaId_idx" ON public.equipo_clientes USING btree ("ventaId");


--
-- Name: equipos_almacenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "equipos_almacenId_idx" ON public.equipos USING btree ("almacenId");


--
-- Name: equipos_codigoQr_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "equipos_codigoQr_key" ON public.equipos USING btree ("codigoQr");


--
-- Name: equipos_condicion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX equipos_condicion_idx ON public.equipos USING btree (condicion);


--
-- Name: equipos_estadoComercial_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "equipos_estadoComercial_idx" ON public.equipos USING btree ("estadoComercial");


--
-- Name: equipos_numeroSerie_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "equipos_numeroSerie_key" ON public.equipos USING btree ("numeroSerie");


--
-- Name: equipos_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "equipos_productoId_idx" ON public.equipos USING btree ("productoId");


--
-- Name: fiscal_secrets_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fiscal_secrets_scope_idx ON public.fiscal_secrets USING btree (scope);


--
-- Name: fiscal_secrets_scope_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fiscal_secrets_scope_name_key ON public.fiscal_secrets USING btree (scope, name);


--
-- Name: garantias_codigoQR_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "garantias_codigoQR_key" ON public.garantias USING btree ("codigoQR");


--
-- Name: garantias_equipoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "garantias_equipoId_idx" ON public.garantias USING btree ("equipoId");


--
-- Name: garantias_ventaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "garantias_ventaId_idx" ON public.garantias USING btree ("ventaId");


--
-- Name: historial_tickets_ticketId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "historial_tickets_ticketId_idx" ON public.historial_tickets USING btree ("ticketId");


--
-- Name: historial_tickets_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "historial_tickets_usuarioId_idx" ON public.historial_tickets USING btree ("usuarioId");


--
-- Name: lecturas_snmp_equipoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lecturas_snmp_equipoId_idx" ON public.lecturas_snmp USING btree ("equipoId");


--
-- Name: marcas_nombre_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marcas_nombre_active_key ON public.marcas USING btree (nombre) WHERE ("deletedAt" IS NULL);


--
-- Name: metodos_pago_codigo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX metodos_pago_codigo_key ON public.metodos_pago USING btree (codigo);


--
-- Name: modelos_catalogo_marcaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modelos_catalogo_marcaId_idx" ON public.modelos_catalogo USING btree ("marcaId");


--
-- Name: modelos_catalogo_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX modelos_catalogo_tipo_idx ON public.modelos_catalogo USING btree (tipo);


--
-- Name: movimientos_caja_aperturaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_caja_aperturaId_idx" ON public.movimientos_caja USING btree ("aperturaId");


--
-- Name: movimientos_caja_metodoPagoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_caja_metodoPagoId_idx" ON public.movimientos_caja USING btree ("metodoPagoId");


--
-- Name: movimientos_caja_referenciaTipo_referenciaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_caja_referenciaTipo_referenciaId_idx" ON public.movimientos_caja USING btree ("referenciaTipo", "referenciaId");


--
-- Name: movimientos_caja_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_caja_usuarioId_idx" ON public.movimientos_caja USING btree ("usuarioId");


--
-- Name: movimientos_stock_almacenDestinoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_stock_almacenDestinoId_idx" ON public.movimientos_stock USING btree ("almacenDestinoId");


--
-- Name: movimientos_stock_almacenOrigenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_stock_almacenOrigenId_idx" ON public.movimientos_stock USING btree ("almacenOrigenId");


--
-- Name: movimientos_stock_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_stock_productoId_idx" ON public.movimientos_stock USING btree ("productoId");


--
-- Name: movimientos_stock_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX movimientos_stock_tipo_idx ON public.movimientos_stock USING btree (tipo);


--
-- Name: movimientos_stock_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "movimientos_stock_usuarioId_idx" ON public.movimientos_stock USING btree ("usuarioId");


--
-- Name: notas_credito_comprobanteOrigenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notas_credito_comprobanteOrigenId_idx" ON public.notas_credito USING btree ("comprobanteOrigenId");


--
-- Name: notas_credito_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notas_credito_numero_key ON public.notas_credito USING btree (numero);


--
-- Name: notas_debito_comprobanteOrigenId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notas_debito_comprobanteOrigenId_idx" ON public.notas_debito USING btree ("comprobanteOrigenId");


--
-- Name: notas_debito_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notas_debito_numero_key ON public.notas_debito USING btree (numero);


--
-- Name: ordenes_compra_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ordenes_compra_numero_key ON public.ordenes_compra USING btree (numero);


--
-- Name: ordenes_compra_proveedorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ordenes_compra_proveedorId_idx" ON public.ordenes_compra USING btree ("proveedorId");


--
-- Name: ordenes_compra_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ordenes_compra_usuarioId_idx" ON public.ordenes_compra USING btree ("usuarioId");


--
-- Name: producto_imagenes_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "producto_imagenes_productoId_idx" ON public.producto_imagenes USING btree ("productoId");


--
-- Name: producto_proveedores_productoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "producto_proveedores_productoId_idx" ON public.producto_proveedores USING btree ("productoId");


--
-- Name: producto_proveedores_productoId_proveedorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "producto_proveedores_productoId_proveedorId_key" ON public.producto_proveedores USING btree ("productoId", "proveedorId");


--
-- Name: producto_proveedores_proveedorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "producto_proveedores_proveedorId_idx" ON public.producto_proveedores USING btree ("proveedorId");


--
-- Name: productos_categoriaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "productos_categoriaId_idx" ON public.productos USING btree ("categoriaId");


--
-- Name: productos_codigoBarras_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "productos_codigoBarras_key" ON public.productos USING btree ("codigoBarras");


--
-- Name: productos_codigoQr_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "productos_codigoQr_key" ON public.productos USING btree ("codigoQr");


--
-- Name: productos_condicion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX productos_condicion_idx ON public.productos USING btree (condicion);


--
-- Name: productos_marcaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "productos_marcaId_idx" ON public.productos USING btree ("marcaId");


--
-- Name: productos_modeloCatalogoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "productos_modeloCatalogoId_idx" ON public.productos USING btree ("modeloCatalogoId");


--
-- Name: productos_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX productos_sku_key ON public.productos USING btree (sku);


--
-- Name: productos_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX productos_tipo_idx ON public.productos USING btree (tipo);


--
-- Name: productos_unidadMedidaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "productos_unidadMedidaId_idx" ON public.productos USING btree ("unidadMedidaId");


--
-- Name: proveedores_ruc_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX proveedores_ruc_key ON public.proveedores USING btree (ruc);


--
-- Name: recepciones_compra_ordenCompraId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "recepciones_compra_ordenCompraId_idx" ON public.recepciones_compra USING btree ("ordenCompraId");


--
-- Name: refresh_tokens_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_token_idx ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "refresh_tokens_usuarioId_idx" ON public.refresh_tokens USING btree ("usuarioId");


--
-- Name: series_documento_activo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX series_documento_activo_idx ON public.series_documento USING btree (activo);


--
-- Name: series_documento_ambiente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX series_documento_ambiente_idx ON public.series_documento USING btree (ambiente);


--
-- Name: series_documento_configEmpresaFiscalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "series_documento_configEmpresaFiscalId_idx" ON public.series_documento USING btree ("configEmpresaFiscalId");


--
-- Name: series_documento_sedeFiscalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "series_documento_sedeFiscalId_idx" ON public.series_documento USING btree ("sedeFiscalId");


--
-- Name: series_documento_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX series_documento_tipo_idx ON public.series_documento USING btree (tipo);


--
-- Name: series_documento_tipo_serie_codigoEstablecimiento_ambiente_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "series_documento_tipo_serie_codigoEstablecimiento_ambiente_key" ON public.series_documento USING btree (tipo, serie, "codigoEstablecimiento", ambiente);


--
-- Name: tickets_clienteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tickets_clienteId_idx" ON public.tickets USING btree ("clienteId");


--
-- Name: tickets_codigo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tickets_codigo_key ON public.tickets USING btree (codigo);


--
-- Name: tickets_creadoPorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tickets_creadoPorId_idx" ON public.tickets USING btree ("creadoPorId");


--
-- Name: tickets_equipoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tickets_equipoId_idx" ON public.tickets USING btree ("equipoId");


--
-- Name: tickets_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_estado_idx ON public.tickets USING btree (estado);


--
-- Name: tickets_tecnicoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tickets_tecnicoId_idx" ON public.tickets USING btree ("tecnicoId");


--
-- Name: tipos_movimiento_config_codigo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tipos_movimiento_config_codigo_key ON public.tipos_movimiento_config USING btree (codigo);


--
-- Name: unidades_medida_codigo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unidades_medida_codigo_key ON public.unidades_medida USING btree (codigo);


--
-- Name: usuarios_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_email_key ON public.usuarios USING btree (email);


--
-- Name: ventas_clienteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ventas_clienteId_idx" ON public.ventas USING btree ("clienteId");


--
-- Name: ventas_metodoPagoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ventas_metodoPagoId_idx" ON public.ventas USING btree ("metodoPagoId");


--
-- Name: ventas_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ventas_numero_key ON public.ventas USING btree (numero);


--
-- Name: ventas_usuarioId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ventas_usuarioId_idx" ON public.ventas USING btree ("usuarioId");


--
-- Name: adjuntos_ticket adjuntos_ticket_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjuntos_ticket
    ADD CONSTRAINT "adjuntos_ticket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: alertas_stock alertas_stock_almacenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_stock
    ADD CONSTRAINT "alertas_stock_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES public.almacenes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: alertas_stock alertas_stock_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_stock
    ADD CONSTRAINT "alertas_stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: alertas_stock alertas_stock_resueltaPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_stock
    ADD CONSTRAINT "alertas_stock_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: almacen_stocks almacen_stocks_almacenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacen_stocks
    ADD CONSTRAINT "almacen_stocks_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES public.almacenes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: almacen_stocks almacen_stocks_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.almacen_stocks
    ADD CONSTRAINT "almacen_stocks_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: aperturas_caja aperturas_caja_cajaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aperturas_caja
    ADD CONSTRAINT "aperturas_caja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES public.cajas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: aperturas_caja aperturas_caja_usuarioAperturaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aperturas_caja
    ADD CONSTRAINT "aperturas_caja_usuarioAperturaId_fkey" FOREIGN KEY ("usuarioAperturaId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: aperturas_caja aperturas_caja_usuarioCierreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aperturas_caja
    ADD CONSTRAINT "aperturas_caja_usuarioCierreId_fkey" FOREIGN KEY ("usuarioCierreId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: arqueos_caja arqueos_caja_aperturaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arqueos_caja
    ADD CONSTRAINT "arqueos_caja_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES public.aperturas_caja(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: arqueos_caja arqueos_caja_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arqueos_caja
    ADD CONSTRAINT "arqueos_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: auditoria auditoria_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: casos_garantia casos_garantia_garantiaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.casos_garantia
    ADD CONSTRAINT "casos_garantia_garantiaId_fkey" FOREIGN KEY ("garantiaId") REFERENCES public.garantias(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: casos_garantia casos_garantia_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.casos_garantia
    ADD CONSTRAINT "casos_garantia_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: categorias categorias_padreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT "categorias_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES public.categorias(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificados_digitales certificados_digitales_configEmpresaFiscalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales
    ADD CONSTRAINT "certificados_digitales_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES public.config_empresa_fiscal(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cliente_validaciones_sunat cliente_validaciones_sunat_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_validaciones_sunat
    ADD CONSTRAINT "cliente_validaciones_sunat_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: compatibilidades compatibilidades_modeloId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibilidades
    ADD CONSTRAINT "compatibilidades_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compatibilidades compatibilidades_repuestoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibilidades
    ADD CONSTRAINT "compatibilidades_repuestoId_fkey" FOREIGN KEY ("repuestoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comprobante_detalles comprobante_detalles_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_detalles
    ADD CONSTRAINT "comprobante_detalles_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comprobante_detalles comprobante_detalles_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_detalles
    ADD CONSTRAINT "comprobante_detalles_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comprobante_envio_logs comprobante_envio_logs_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_envio_logs
    ADD CONSTRAINT "comprobante_envio_logs_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comprobantes comprobantes_comprobanteOrigenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobantes
    ADD CONSTRAINT "comprobantes_comprobanteOrigenId_fkey" FOREIGN KEY ("comprobanteOrigenId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE;


--
-- Name: comprobantes comprobantes_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobantes
    ADD CONSTRAINT "comprobantes_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comunicaciones_baja comunicaciones_baja_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicaciones_baja
    ADD CONSTRAINT "comunicaciones_baja_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE;


--
-- Name: contactos_cliente contactos_cliente_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos_cliente
    ADD CONSTRAINT "contactos_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contactos_cliente contactos_cliente_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos_cliente
    ADD CONSTRAINT "contactos_cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: detalles_orden_compra detalles_orden_compra_ordenCompraId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra
    ADD CONSTRAINT "detalles_orden_compra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES public.ordenes_compra(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_orden_compra detalles_orden_compra_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra
    ADD CONSTRAINT "detalles_orden_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_recepcion detalles_recepcion_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion
    ADD CONSTRAINT "detalles_recepcion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_recepcion detalles_recepcion_recepcionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion
    ADD CONSTRAINT "detalles_recepcion_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES public.recepciones_compra(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_ticket detalles_ticket_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_ticket
    ADD CONSTRAINT "detalles_ticket_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_ticket detalles_ticket_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_ticket
    ADD CONSTRAINT "detalles_ticket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_venta detalles_venta_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_venta
    ADD CONSTRAINT "detalles_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_venta detalles_venta_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_venta
    ADD CONSTRAINT "detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: empresa_sedes_fiscales empresa_sedes_fiscales_configEmpresaFiscalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_sedes_fiscales
    ADD CONSTRAINT "empresa_sedes_fiscales_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES public.config_empresa_fiscal(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipo_clientes equipo_clientes_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_clientes
    ADD CONSTRAINT "equipo_clientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipo_clientes equipo_clientes_equipoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_clientes
    ADD CONSTRAINT "equipo_clientes_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: equipo_clientes equipo_clientes_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_clientes
    ADD CONSTRAINT "equipo_clientes_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: equipos equipos_almacenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT "equipos_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES public.almacenes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: equipos equipos_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT "equipos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: garantias garantias_equipoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantias
    ADD CONSTRAINT "garantias_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: garantias garantias_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantias
    ADD CONSTRAINT "garantias_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: historial_tickets historial_tickets_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_tickets
    ADD CONSTRAINT "historial_tickets_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: historial_tickets historial_tickets_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_tickets
    ADD CONSTRAINT "historial_tickets_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lecturas_snmp lecturas_snmp_equipoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturas_snmp
    ADD CONSTRAINT "lecturas_snmp_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: modelos_catalogo modelos_catalogo_marcaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_catalogo
    ADD CONSTRAINT "modelos_catalogo_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES public.marcas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: movimientos_caja movimientos_caja_aperturaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT "movimientos_caja_aperturaId_fkey" FOREIGN KEY ("aperturaId") REFERENCES public.aperturas_caja(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_caja movimientos_caja_metodoPagoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT "movimientos_caja_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES public.metodos_pago(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: movimientos_caja movimientos_caja_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT "movimientos_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_stock movimientos_stock_almacenDestinoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT "movimientos_stock_almacenDestinoId_fkey" FOREIGN KEY ("almacenDestinoId") REFERENCES public.almacenes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: movimientos_stock movimientos_stock_almacenOrigenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT "movimientos_stock_almacenOrigenId_fkey" FOREIGN KEY ("almacenOrigenId") REFERENCES public.almacenes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: movimientos_stock movimientos_stock_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT "movimientos_stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_stock movimientos_stock_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT "movimientos_stock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notas_credito notas_credito_comprobanteOrigenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_credito
    ADD CONSTRAINT "notas_credito_comprobanteOrigenId_fkey" FOREIGN KEY ("comprobanteOrigenId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notas_debito notas_debito_comprobanteOrigenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_debito
    ADD CONSTRAINT "notas_debito_comprobanteOrigenId_fkey" FOREIGN KEY ("comprobanteOrigenId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ordenes_compra ordenes_compra_proveedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT "ordenes_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES public.proveedores(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ordenes_compra ordenes_compra_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT "ordenes_compra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: producto_imagenes producto_imagenes_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_imagenes
    ADD CONSTRAINT "producto_imagenes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: producto_proveedores producto_proveedores_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedores
    ADD CONSTRAINT "producto_proveedores_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public.productos(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: producto_proveedores producto_proveedores_proveedorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedores
    ADD CONSTRAINT "producto_proveedores_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES public.proveedores(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: productos productos_categoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES public.categorias(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: productos productos_marcaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT "productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES public.marcas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: productos productos_modeloCatalogoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT "productos_modeloCatalogoId_fkey" FOREIGN KEY ("modeloCatalogoId") REFERENCES public.modelos_catalogo(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: productos productos_unidadMedidaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT "productos_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES public.unidades_medida(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: recepciones_compra recepciones_compra_ordenCompraId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepciones_compra
    ADD CONSTRAINT "recepciones_compra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES public.ordenes_compra(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: series_documento series_documento_configEmpresaFiscalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_documento
    ADD CONSTRAINT "series_documento_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES public.config_empresa_fiscal(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: series_documento series_documento_sedeFiscalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_documento
    ADD CONSTRAINT "series_documento_sedeFiscalId_fkey" FOREIGN KEY ("sedeFiscalId") REFERENCES public.empresa_sedes_fiscales(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tickets tickets_creadoPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tickets tickets_equipoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES public.equipos(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_tecnicoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ventas ventas_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ventas ventas_metodoPagoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES public.metodos_pago(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ventas ventas_usuarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT "ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 26xKjI5tdeqenhQ8WVpShyJvJaQjhYpw8tzICFjKriIzV4kAw0WVFIySnTjn8Ra

