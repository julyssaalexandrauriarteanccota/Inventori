import { TipoProducto, type ProductoListItem } from "@erp/shared";

export const TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipos",
  [TipoProducto.REPUESTO]: "Repuestos",
  [TipoProducto.INSUMO]: "Insumos",
  [TipoProducto.SERVICIO]: "Servicios",
  [TipoProducto.ACCESORIO]: "Accesorios",
};

export function formatCurrency(value: number | string | null | undefined) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(amount) ? `S/ ${amount.toFixed(2)}` : "S/ —";
}

export function formatDecimal(value: number | string | null | undefined) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(amount) ? amount.toFixed(2) : "—";
}

export function getProductoMargenPct(
  producto: Pick<ProductoListItem, "precioCompra" | "precioVenta">,
): number | null {
  const compra = Number(producto.precioCompra);
  const venta = Number(producto.precioVenta);
  if (!Number.isFinite(compra) || !Number.isFinite(venta) || compra <= 0) {
    return null;
  }
  return ((venta - compra) / compra) * 100;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function getProductoRuleLabels(producto: ProductoListItem) {
  const labels: string[] = [];

  if (producto.tipo === TipoProducto.SERVICIO) {
    labels.push("No inventario");
  } else if (producto.manejaInventario) {
    labels.push("Inventario");
  }

  if (producto.tieneNumeroSerie) labels.push("Serializado");
  if (producto.esConsumible) labels.push("Consumible");
  if (producto.requiereRepuestos) labels.push("Req. repuestos");

  return labels;
}

export function buildProductosCsvRows(rows: ProductoListItem[]) {
  const headers = [
    "SKU",
    "Tipo",
    "Nombre",
    "Modelo",
    "Categoría",
    "Marca",
    "Unidad",
    "Precio Compra",
    "Precio Venta",
    "Precio Mínimo",
    "Stock actual",
    "Stock mínimo alerta",
    "Reglas",
    "Estado",
  ];

  const lines = rows.map((producto) =>
    [
      producto.sku,
      TIPO_LABELS[producto.tipo],
      producto.nombre,
      producto.modelo ?? "",
      producto.categoria?.nombre ?? "",
      producto.marca?.nombre ?? "",
      producto.unidadMedida
        ? `${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`
        : "",
      formatDecimal(producto.precioCompra),
      formatDecimal(producto.precioVenta),
      formatDecimal(producto.precioMinimo),
      producto.tipo === TipoProducto.SERVICIO ? "" : producto.stockActual,
      producto.tipo === TipoProducto.SERVICIO ? "" : producto.stockMinimo,
      getProductoRuleLabels(producto).join(" | "),
      producto.activo ? "Activo" : "Inactivo",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}
