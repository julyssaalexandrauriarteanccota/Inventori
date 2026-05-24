import { IGV_RATE } from "@/lib/pos-navigation";

const IGV_FACTOR = 1 + IGV_RATE;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function lineTotalInclIgv(
  cantidad: number,
  precioUnitarioInclIgv: number,
  descuentoInclIgv = 0,
) {
  return roundMoney(
    Math.max(0, cantidad * precioUnitarioInclIgv - descuentoInclIgv),
  );
}

export function splitIncludedIgv(totalInclIgv: number) {
  const total = roundMoney(Math.max(0, totalInclIgv));
  const subtotal = roundMoney(total / IGV_FACTOR);
  const igv = roundMoney(total - subtotal);

  return { subtotal, igv, total };
}
