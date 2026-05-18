import { describe, expect, it } from "vitest";

import {
  AmbienteSunat,
  EstadoTicket,
  RolUsuario,
  TipoAfectacionIgv,
  TipoDocumento,
  TipoFiscalProducto,
  TipoMovimiento,
} from "./index";

describe("@erp/shared", () => {
  it("expone exactamente los 3 roles permitidos por el sistema", () => {
    expect(Object.values(RolUsuario)).toEqual([
      "ADMIN",
      "ENCARGADO",
      "TECNICO",
    ]);
  });

  it("mantiene los tipos de documento soportados por SUNAT", () => {
    expect(Object.values(TipoDocumento)).toEqual([
      "FACTURA",
      "BOLETA",
      "NOTA_CREDITO",
      "NOTA_DEBITO",
    ]);
  });

  it("expone tipos fiscales base para productos y servicios", () => {
    expect(Object.values(TipoFiscalProducto)).toEqual(["BIEN", "SERVICIO"]);
  });

  it("expone ambientes SUNAT para emisión directa", () => {
    expect(Object.values(AmbienteSunat)).toEqual(["BETA", "PRODUCCION"]);
  });

  it("expone afectaciones IGV base para contratos fiscales", () => {
    expect(Object.values(TipoAfectacionIgv)).toEqual([
      "GRAVADO_OPERACION_ONEROSA",
      "EXONERADO_OPERACION_ONEROSA",
      "INAFECTO_OPERACION_ONEROSA",
      "EXPORTACION",
    ]);
  });

  it("mantiene el catalogo base de movimientos de inventario", () => {
    expect(Object.values(TipoMovimiento)).toEqual([
      "COMPRA_RECIBIDA",
      "VENTA",
      "CONSUMO_SOPORTE",
      "DEVOLUCION_CLIENTE",
      "DEVOLUCION_PROVEEDOR",
      "AJUSTE_POSITIVO",
      "AJUSTE_NEGATIVO",
      "TRANSFERENCIA",
      "BAJA_DANO",
    ]);
  });

  it("expone los estados esperados para el flujo de tickets", () => {
    expect(Object.values(EstadoTicket)).toEqual([
      "ABIERTO",
      "EN_PROCESO",
      "EN_ESPERA",
      "CERRADO",
      "CANCELADO",
    ]);
  });
});
