--
-- PostgreSQL database dump
--

\restrict qwv8PG8R3XlhKvhKTie8LbY1743j6HZzeZy9CU10YdbfQXgLzf6sBLtm43z52IP

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
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
    'ANULADO',
    'REQUIERE_REVISION'
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
-- Name: ModalidadEnvioBoletas; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ModalidadEnvioBoletas" AS ENUM (
    'INDIVIDUAL',
    'RESUMEN'
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
-- Name: comprobante_email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprobante_email_logs (
    id text NOT NULL,
    "comprobanteId" text NOT NULL,
    destinatario text NOT NULL,
    asunto text NOT NULL,
    estado text NOT NULL,
    "errorMessage" text,
    "messageId" text,
    "sentAt" timestamp(3) without time zone,
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
    "ventaId" text,
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
    "emitidoPor" text,
    "cdrRecibidaAt" timestamp(3) without time zone,
    "payloadHash" text,
    "fechaVencimientoPlazo" timestamp(3) without time zone,
    observaciones text,
    "tokenConsulta" text,
    "tokenConsultaCreatedAt" timestamp(3) without time zone
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cdrCodigo" text,
    "cdrMensaje" text,
    "cdrRecibidaAt" timestamp(3) without time zone,
    "xmlStorageKey" text,
    deadline timestamp(3) without time zone
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
    "ambienteDefault" public."AmbienteSunat" DEFAULT 'BETA'::public."AmbienteSunat" NOT NULL,
    "modalidadEnvioBoletas" public."ModalidadEnvioBoletas" DEFAULT 'INDIVIDUAL'::public."ModalidadEnvioBoletas" NOT NULL,
    "reglasValidacion" jsonb
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
-- Name: feriados_nacionales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feriados_nacionales (
    id text NOT NULL,
    fecha date NOT NULL,
    nombre text NOT NULL,
    anio integer NOT NULL,
    "esNoLaborable" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
-- Name: portal_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_access_logs (
    id text NOT NULL,
    "comprobanteId" text NOT NULL,
    "metodoAcceso" text NOT NULL,
    "ipOrigen" text NOT NULL,
    "userAgent" text,
    accion text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
-- Name: series_documento_baja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.series_documento_baja (
    id text NOT NULL,
    "configEmpresaFiscalId" text NOT NULL,
    ambiente public."AmbienteSunat" DEFAULT 'BETA'::public."AmbienteSunat" NOT NULL,
    fecha text NOT NULL,
    "correlativoActual" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
-- Name: comprobante_email_logs comprobante_email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_email_logs
    ADD CONSTRAINT comprobante_email_logs_pkey PRIMARY KEY (id);


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
-- Name: feriados_nacionales feriados_nacionales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feriados_nacionales
    ADD CONSTRAINT feriados_nacionales_pkey PRIMARY KEY (id);


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
-- Name: ordenes_compra ordenes_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordenes_compra
    ADD CONSTRAINT ordenes_compra_pkey PRIMARY KEY (id);


--
-- Name: portal_access_logs portal_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_access_logs
    ADD CONSTRAINT portal_access_logs_pkey PRIMARY KEY (id);


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
-- Name: series_documento_baja series_documento_baja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_documento_baja
    ADD CONSTRAINT series_documento_baja_pkey PRIMARY KEY (id);


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
-- Name: comprobante_email_logs_comprobanteId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobante_email_logs_comprobanteId_createdAt_idx" ON public.comprobante_email_logs USING btree ("comprobanteId", "createdAt");


--
-- Name: comprobante_email_logs_destinatario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobante_email_logs_destinatario_idx ON public.comprobante_email_logs USING btree (destinatario);


--
-- Name: comprobante_email_logs_estado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobante_email_logs_estado_idx ON public.comprobante_email_logs USING btree (estado);


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
-- Name: comprobantes_fechaVencimientoPlazo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobantes_fechaVencimientoPlazo_idx" ON public.comprobantes USING btree ("fechaVencimientoPlazo");


--
-- Name: comprobantes_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX comprobantes_numero_key ON public.comprobantes USING btree (numero);


--
-- Name: comprobantes_tipo_serie_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobantes_tipo_serie_idx ON public.comprobantes USING btree (tipo, serie);


--
-- Name: comprobantes_tokenConsulta_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "comprobantes_tokenConsulta_key" ON public.comprobantes USING btree ("tokenConsulta");


--
-- Name: comprobantes_ventaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "comprobantes_ventaId_idx" ON public.comprobantes USING btree ("ventaId");


--
-- Name: comprobantes_ventaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "comprobantes_ventaId_key" ON public.comprobantes USING btree ("ventaId");


--
-- Name: comunicaciones_baja_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX comunicaciones_baja_active_unique ON public.comunicaciones_baja USING btree ("comprobanteId") WHERE (estado = ANY (ARRAY['PENDIENTE'::public."EstadoComunicacionBaja", 'EN_PROCESO'::public."EstadoComunicacionBaja", 'ACEPTADA'::public."EstadoComunicacionBaja"]));


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
-- Name: feriados_nacionales_anio_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feriados_nacionales_anio_idx ON public.feriados_nacionales USING btree (anio);


--
-- Name: feriados_nacionales_fecha_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feriados_nacionales_fecha_key ON public.feriados_nacionales USING btree (fecha);


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
-- Name: portal_access_logs_comprobanteId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "portal_access_logs_comprobanteId_createdAt_idx" ON public.portal_access_logs USING btree ("comprobanteId", "createdAt");


--
-- Name: portal_access_logs_ipOrigen_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "portal_access_logs_ipOrigen_createdAt_idx" ON public.portal_access_logs USING btree ("ipOrigen", "createdAt");


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
-- Name: series_documento_baja_configEmpresaFiscalId_ambiente_fecha_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "series_documento_baja_configEmpresaFiscalId_ambiente_fecha_key" ON public.series_documento_baja USING btree ("configEmpresaFiscalId", ambiente, fecha);


--
-- Name: series_documento_baja_configEmpresaFiscalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "series_documento_baja_configEmpresaFiscalId_idx" ON public.series_documento_baja USING btree ("configEmpresaFiscalId");


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
-- Name: comprobante_email_logs comprobante_email_logs_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_email_logs
    ADD CONSTRAINT "comprobante_email_logs_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comprobante_envio_logs comprobante_envio_logs_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_envio_logs
    ADD CONSTRAINT "comprobante_envio_logs_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comprobantes comprobantes_comprobanteOrigenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobantes
    ADD CONSTRAINT "comprobantes_comprobanteOrigenId_fkey" FOREIGN KEY ("comprobanteOrigenId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comprobantes comprobantes_ventaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobantes
    ADD CONSTRAINT "comprobantes_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES public.ventas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comunicaciones_baja comunicaciones_baja_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicaciones_baja
    ADD CONSTRAINT "comunicaciones_baja_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: portal_access_logs portal_access_logs_comprobanteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_access_logs
    ADD CONSTRAINT "portal_access_logs_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES public.comprobantes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: series_documento_baja series_documento_baja_configEmpresaFiscalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_documento_baja
    ADD CONSTRAINT "series_documento_baja_configEmpresaFiscalId_fkey" FOREIGN KEY ("configEmpresaFiscalId") REFERENCES public.config_empresa_fiscal(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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

\unrestrict qwv8PG8R3XlhKvhKTie8LbY1743j6HZzeZy9CU10YdbfQXgLzf6sBLtm43z52IP

