import { describe, expect, it } from "vitest";

import { TipoCliente } from "../enums/tipo-cliente.enum";
import { TipoProducto } from "../enums/tipo-producto.enum";
import {
  clienteFiltersSchema,
  clienteFormSchema,
  clientesPaginatedResponseSchema,
  productoFiltersSchema,
  productoFormSchema,
} from "./master-data.schema";

describe("master data schemas", () => {
  it("valida cliente natural", () => {
    const parsed = clienteFormSchema.parse({
      tipo: TipoCliente.NATURAL,
      nombre: "Juan",
      apellido: "Perez",
      dni: "12345678",
      latitud: -15.8402,
      longitud: -70.0219,
    });

    expect(parsed.tipo).toBe(TipoCliente.NATURAL);
    expect(parsed.latitud).toBe(-15.8402);
  });

  it("rechaza DNI reservado para publico general del sistema", () => {
    expect(() =>
      clienteFormSchema.parse({
        tipo: TipoCliente.NATURAL,
        nombre: "Publico",
        apellido: "General",
        dni: "00000000",
      }),
    ).toThrow();
  });

  it("rechaza empresa sin RUC valido", () => {
    expect(() =>
      clienteFormSchema.parse({
        tipo: TipoCliente.EMPRESA,
        razonSocial: "Empresa SAC",
        ruc: "30123456789",
      }),
    ).toThrow();
  });

  it("expone mensajes de validacion de cliente en espanol", () => {
    const result = clienteFormSchema.safeParse({
      tipo: TipoCliente.NATURAL,
      nombre: "",
      apellido: "",
      dni: "123",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("El nombre es obligatorio");
    expect(messages).toContain("El apellido es obligatorio");
    expect(messages).toContain("El DNI debe tener 8 digitos");
  });

  it("valida filtros de producto con booleanos reales", () => {
    const parsed = productoFiltersSchema.parse({
      page: 1,
      limit: 20,
      esConsumible: false,
      tieneNumeroSerie: true,
    });

    expect(parsed.esConsumible).toBe(false);
    expect(parsed.tieneNumeroSerie).toBe(true);
  });

  it("valida payload de producto", () => {
    const parsed = productoFormSchema.parse({
      sku: "KM-BZ-001",
      nombre: "Bizhub C258",
      categoriaId: "11111111-1111-1111-1111-111111111111",
      unidadMedidaId: "22222222-2222-2222-2222-222222222222",
      precioCompra: 100,
      precioVenta: 150,
      precioMinimo: 120,
    });

    expect(parsed.sku).toBe("KM-BZ-001");
  });

  it("rechaza servicio con stock mínimo o inventario", () => {
    expect(() =>
      productoFormSchema.parse({
        tipo: TipoProducto.SERVICIO,
        nombre: "Diagnóstico técnico",
        categoriaId: "11111111-1111-1111-1111-111111111111",
        unidadMedidaId: "22222222-2222-2222-2222-222222222222",
        precioCompra: 0,
        precioVenta: 80,
        precioMinimo: 80,
        stockMinimo: 1,
        manejaInventario: true,
      }),
    ).toThrow();
  });

  it("rechaza repuesto marcado como serializado o consumible", () => {
    expect(() =>
      productoFormSchema.parse({
        tipo: TipoProducto.REPUESTO,
        nombre: "Rodillo de arrastre",
        categoriaId: "11111111-1111-1111-1111-111111111111",
        unidadMedidaId: "22222222-2222-2222-2222-222222222222",
        precioCompra: 20,
        precioVenta: 35,
        precioMinimo: 30,
        tieneNumeroSerie: true,
        esConsumible: true,
      }),
    ).toThrow();
  });

  it("valida respuesta paginada de clientes", () => {
    const parsed = clientesPaginatedResponseSchema.parse({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          tipo: TipoCliente.NATURAL,
          nombre: "Juan",
          apellido: "Perez",
          dni: "12345678",
          razonSocial: null,
          ruc: null,
          email: null,
          telefono: null,
          celular: null,
          direccion: null,
          distrito: null,
          provincia: null,
          departamento: null,
          referencia: null,
          notas: null,
          latitud: null,
          longitud: null,
          activo: true,
          createdAt: "2026-04-06T00:00:00.000Z",
          updatedAt: "2026-04-06T00:00:00.000Z",
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        timestamp: "2026-04-06T00:00:00.000Z",
      },
    });

    expect(parsed.data).toHaveLength(1);
  });

  it("acepta filtros de cliente con tipo", () => {
    const parsed = clienteFiltersSchema.parse({
      search: "juan",
      tipo: TipoCliente.NATURAL,
    });

    expect(parsed.tipo).toBe(TipoCliente.NATURAL);
  });
});
