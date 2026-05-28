import { describe, expect, it } from "vitest";

import { explainSunatRejectMessage } from "./sunat-errors";

describe("explainSunatRejectMessage", () => {
  it("retorna null si el mensaje es vacío o nullish", () => {
    expect(explainSunatRejectMessage(null)).toBeNull();
    expect(explainSunatRejectMessage("")).toBeNull();
    expect(explainSunatRejectMessage("   ")).toBeNull();
  });

  it("detecta credenciales SOL inválidas (102)", () => {
    const r = explainSunatRejectMessage("Código 0102: usuario o clave incorrectos");
    expect(r).not.toBeNull();
    expect(r?.severidad).toBe("config");
    expect(r?.motivo).toMatch(/clave SOL/i);
  });

  it("detecta RUC dado de baja (1032)", () => {
    const r = explainSunatRejectMessage("Error 1032: el RUC del emisor ha sido dado de baja");
    expect(r?.severidad).toBe("config");
    expect(r?.motivo).toMatch(/dado de baja/i);
  });

  it("detecta no autorizado a emitir (1033)", () => {
    const r = explainSunatRejectMessage("1033 No autorizado a emitir factura electronica");
    expect(r?.severidad).toBe("config");
  });

  it("detecta documento duplicado (2017)", () => {
    const r = explainSunatRejectMessage("Código 2017: ya existe el comprobante");
    expect(r?.severidad).toBe("datos");
    expect(r?.motivo).toMatch(/duplicado|ya fue registrado/i);
  });

  it("detecta plazo NC vencido (4332)", () => {
    const r = explainSunatRejectMessage("4332 plazo para enviar la nota de credito vencido");
    expect(r?.severidad).toBe("datos");
    expect(r?.motivo).toMatch(/plazo/i);
  });

  it("detecta IGV mal calculado (3208)", () => {
    const r = explainSunatRejectMessage("3208 IGV no coincide con la base imponible");
    expect(r?.severidad).toBe("datos");
  });

  it("detecta unidad de medida UND inválida", () => {
    const r = explainSunatRejectMessage(
      "Element '...unitCode' has invalid value 'UND'",
    );
    expect(r?.severidad).toBe("datos");
    expect(r?.motivo).toMatch(/NIU|ZZ/);
  });

  it("detecta XML no parseable (técnico)", () => {
    const r = explainSunatRejectMessage(
      "No se puede leer (parsear) el archivo XML",
    );
    expect(r?.severidad).toBe("tecnico");
  });

  it("detecta timeout (técnico)", () => {
    const r = explainSunatRejectMessage("Request failed: ETIMEDOUT");
    expect(r?.severidad).toBe("tecnico");
  });

  it("retorna null si no hay coincidencia", () => {
    expect(
      explainSunatRejectMessage("mensaje no documentado XYZ"),
    ).toBeNull();
  });
});
