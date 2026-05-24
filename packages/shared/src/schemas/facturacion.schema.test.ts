import { describe, expect, it } from "vitest";

import { AmbienteSunat } from "../enums/ambiente-sunat.enum";
import { EstadoComprobante } from "../enums/estado-comprobante.enum";
import { TipoAfectacionIgv } from "../enums/tipo-afectacion-igv.enum";
import { TipoDocumento } from "../enums/documento-tipo.enum";
import { TipoFiscalProducto } from "../enums/tipo-fiscal-producto.enum";
import {
  certificadoDigitalSchema,
  clienteValidacionSunatSchema,
  comprobanteDetalleSchema,
  comprobanteDocumentoResponseSchema,
  comprobantesPaginatedResponseSchema,
  configEmpresaFiscalSchema,
  emitirComprobanteSchema,
  empresaSedeFiscalSchema,
  productoFiscalConfigSchema,
  serieDocumentoSchema,
  sunatDirectConfigStatusSchema,
} from "./facturacion.schema";

describe("facturacion schemas", () => {
  it("valida configuración fiscal no sensible de empresa", () => {
    const parsed = configEmpresaFiscalSchema.parse({
      ruc: "20123456789",
      razonSocial: "Empresa Demo SAC",
      nombreComercial: "Empresa Demo",
      direccionFiscal: "Av. Fiscal 123",
      ubigeoFiscal: "150101",
      codigoEstablecimiento: "0000",
      correoSee: "facturacion@example.com",
      regimenTributario: "MYPE Tributario",
      formatoImpresionDefault: "A4",
      ambienteDefault: AmbienteSunat.BETA,
      pieImpresion: "Gracias por su compra",
    });

    expect(parsed.ruc).toBe("20123456789");
    expect(parsed.codigoEstablecimiento).toBe("0000");
  });

  it("valida sedes fiscales SUNAT directas", () => {
    const parsed = empresaSedeFiscalSchema.parse({
      configEmpresaFiscalId: "77777777-7777-4777-8777-000000000001",
      nombre: "Sede principal",
      codigoEstablecimientoSunat: "0000",
      direccion: "Av. Fiscal 123",
      ubigeo: "150101",
      activo: true,
    });

    expect(parsed.codigoEstablecimientoSunat).toBe("0000");
  });

  it("valida series documentales futuras separadas de ConfigEmpresa", () => {
    const parsed = serieDocumentoSchema.parse({
      configEmpresaFiscalId: "77777777-7777-4777-8777-000000000001",
      sedeFiscalId: "88888888-8888-4888-8888-000000000001",
      tipo: TipoDocumento.FACTURA,
      serie: "F001",
      correlativoActual: 120,
      codigoEstablecimiento: "0000",
      ambiente: AmbienteSunat.BETA,
      descripcion: "Facturas sede principal",
      activo: true,
    });

    expect(parsed.serie).toBe("F001");
    expect(parsed.correlativoActual).toBe(120);
    expect(parsed.ambiente).toBe(AmbienteSunat.BETA);

    const withDefault = serieDocumentoSchema.parse({
      tipo: TipoDocumento.BOLETA,
      serie: "B001",
      correlativoActual: 0,
    });

    expect(withDefault.codigoEstablecimiento).toBe("0000");
  });

  it("valida metadata segura de certificado digital", () => {
    const parsed = certificadoDigitalSchema.parse({
      configEmpresaFiscalId: "77777777-7777-4777-8777-000000000001",
      nombre: "Certificado principal",
      storageProvider: "LOCAL_PRIVATE",
      storageKey: "fiscal-certificates/certificado.enc",
      fingerprintSha256: "abc123",
      validoDesde: null,
      validoHasta: null,
      activo: true,
      revokedAt: null,
    });

    expect(parsed.storageProvider).toBe("LOCAL_PRIVATE");
  });

  it("valida validaciones SUNAT de clientes con RUC, DNI o sin documento", () => {
    const ruc = clienteValidacionSunatSchema.parse({
      tipoDocumentoSunat: "6",
      numeroDocumento: "20123456789",
      proveedor: "SUNAT_PADRON_LOCAL",
      estado: "ACTIVO",
      condicionDomicilio: "HABIDO",
      ubigeo: "150131",
      departamento: "LIMA",
      provincia: "LIMA",
      distrito: "SAN ISIDRO",
    });
    const dni = clienteValidacionSunatSchema.parse({
      tipoDocumentoSunat: "1",
      numeroDocumento: "12345678",
      estado: "PENDIENTE",
    });
    const sinDocumento = clienteValidacionSunatSchema.parse({
      tipoDocumentoSunat: "0",
      numeroDocumento: "00000000",
      estado: "PENDIENTE",
    });

    expect(ruc.estado).toBe("ACTIVO");
    expect(ruc.proveedor).toBe("SUNAT_PADRON_LOCAL");
    expect(ruc.ubigeo).toBe("150131");
    expect(dni.tipoDocumentoSunat).toBe("1");
    expect(sinDocumento.tipoDocumentoSunat).toBe("0");
  });

  it("rechaza validaciones SUNAT de cliente con documento no soportado", () => {
    expect(() =>
      clienteValidacionSunatSchema.parse({
        tipoDocumentoSunat: "7",
        numeroDocumento: "P123456",
        estado: "VALIDO",
      }),
    ).toThrow();

    expect(() =>
      clienteValidacionSunatSchema.parse({
        tipoDocumentoSunat: "1",
        numeroDocumento: "1234",
        estado: "VALIDO",
      }),
    ).toThrow();

    expect(() =>
      clienteValidacionSunatSchema.parse({
        tipoDocumentoSunat: "1",
        numeroDocumento: "00000000",
        estado: "VALIDO",
      }),
    ).toThrow();

    expect(() =>
      clienteValidacionSunatSchema.parse({
        tipoDocumentoSunat: "0",
        numeroDocumento: "12345678",
        estado: "VALIDO",
      }),
    ).toThrow();
  });

  it("valida estado seguro de configuración SUNAT directa", () => {
    const parsed = sunatDirectConfigStatusSchema.parse({
      ambienteDefault: AmbienteSunat.BETA,
      tieneCertificadoActivo: true,
      certificadoActivo: {
        id: "99999999-9999-4999-8999-000000000001",
        nombre: "Certificado principal",
        fingerprintSha256: "abc123",
        validoDesde: null,
        validoHasta: null,
        activo: true,
      },
      sedesActivas: 1,
      seriesActivas: 2,
    });

    expect(parsed.tieneCertificadoActivo).toBe(true);
  });

  it("valida detalle fiscal congelable de comprobante", () => {
    const parsed = comprobanteDetalleSchema.parse({
      item: 1,
      productoId: "44444444-4444-4444-8444-000000000001",
      codigoInterno: "SKU-001",
      descripcion: "Equipo portátil empresarial",
      unidadSunat: "NIU",
      tipoFiscalProducto: TipoFiscalProducto.BIEN,
      tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
      cantidad: 2,
      valorUnitario: 100,
      precioUnitario: 118,
      descuento: 0,
      baseImponible: 200,
      igv: 36,
      total: 236,
      metadataFiscal: { afectacion: "gravada" },
    });

    expect(parsed.tipoFiscalProducto).toBe(TipoFiscalProducto.BIEN);
    expect(parsed.tipoAfectacionIgv).toBe(
      TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
    );
  });

  it("valida configuración fiscal futura de producto", () => {
    const parsed = productoFiscalConfigSchema.parse({
      productoId: "55555555-5555-4555-8555-000000000001",
      tipoFiscalProducto: TipoFiscalProducto.SERVICIO,
      unidadSunat: "ZZ",
      tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
      descripcionFiscal: "Servicio de soporte técnico",
      codigoProductoSunat: "81111811",
      aplicaIcbper: false,
      activo: true,
    });

    expect(parsed.tipoFiscalProducto).toBe(TipoFiscalProducto.SERVICIO);
  });

  it("valida resultado futuro de validación SUNAT de cliente", () => {
    const parsed = clienteValidacionSunatSchema.parse({
      clienteId: "66666666-6666-4666-8666-000000000001",
      tipoDocumentoSunat: "6",
      numeroDocumento: "20123456789",
      nombreNormalizado: "CLIENTE DEMO SAC",
      proveedor: "DECOLECTA",
      direccionFiscal: "Av. Cliente 456",
      ubigeo: "150101",
      departamento: "LIMA",
      provincia: "LIMA",
      distrito: "LIMA",
      estado: "ACTIVO",
      condicionDomicilio: "HABIDO",
      ultimaValidacionAt: "2026-05-01T00:00:00.000Z",
    });

    expect(parsed.estado).toBe("ACTIVO");
    expect(parsed.proveedor).toBe("DECOLECTA");
    expect(parsed.distrito).toBe("LIMA");
  });

  it("valida payload de emision", () => {
    const parsed = emitirComprobanteSchema.parse({
      ventaId: "11111111-1111-4111-8111-000000000001",
      tipo: TipoDocumento.FACTURA,
    });

    expect(parsed.tipo).toBe(TipoDocumento.FACTURA);
  });

  it("valida respuesta paginada de comprobantes", () => {
    const parsed = comprobantesPaginatedResponseSchema.parse({
      data: [
        {
          id: "22222222-2222-4222-8222-000000000001",
          numero: "F001-00000001",
          tipo: TipoDocumento.FACTURA,
          estado: EstadoComprobante.PENDIENTE_ENVIO,
          fechaEmision: "2026-04-06T00:00:00.000Z",
          clienteNombre: "Cliente SAC",
          clienteDocNum: "20123456789",
          subtotal: 100,
          igv: 18,
          total: 118,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        timestamp: "2026-04-06T00:00:00.000Z",
      },
    });

    expect(parsed.data[0].estado).toBe(EstadoComprobante.PENDIENTE_ENVIO);
  });

  it("valida respuesta de documento soporte", () => {
    const parsed = comprobanteDocumentoResponseSchema.parse({
      data: {
        id: "33333333-3333-4333-8333-000000000001",
        numero: "F001-00000001",
        estado: EstadoComprobante.ACEPTADO,
        hashSunat: "HASH-123",
        xmlUrl: "https://example.com/xml",
        cdrUrl: "https://example.com/cdr",
        pdfUrl: null,
      },
      meta: {
        timestamp: "2026-04-06T00:00:00.000Z",
      },
    });

    expect(parsed.data.hashSunat).toBe("HASH-123");
  });
});
