"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { lineTotalInclIgv, splitIncludedIgv } from "@/lib/pos-pricing";

export type CartLineKind = "PRODUCTO" | "EQUIPO";

export type CartLine = {
  /** id único de línea (uuid local) */
  id: string;
  kind: CartLineKind;
  /** id del producto (siempre obligatorio mientras backend no soporte equipoId en línea) */
  productoId: string;
  /** id del equipo serializado opcional (para trazabilidad) */
  equipoId?: string;
  equipoSerie?: string;
  sku: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  /** descuento absoluto por línea */
  descuento: number;
  /** precio mínimo permitido por backend para el producto */
  precioMinimo?: number;
  /** true cuando el producto necesita número de serie para venderse */
  requiereSerie?: boolean;
  /** stock disponible al momento de agregar (informativo) */
  stockDisponible?: number;
  imagen?: string | null;
  /** Tipo de producto (EQUIPO/SERVICIO/etc). Útil para mostrar contexto en la línea. */
  tipo?: string;
  /** Meses de garantía estándar — solo equipos serializados. */
  mesesGarantia?: number | null;
  /** Tope de copias de la garantía (equipos con contador). */
  garantiaMaxCopias?: number | null;
};

export type CartTotals = {
  subtotal: number;
  igv: number;
  total: number;
  itemsCount: number;
};

export type AddLineInput = Omit<CartLine, "id" | "cantidad" | "descuento"> & {
  cantidad?: number;
  descuento?: number;
};

type CartContextValue = {
  lines: CartLine[];
  totals: CartTotals;
  addLine: (input: AddLineInput) => void;
  setCantidad: (lineId: string, cantidad: number) => void;
  setPrecio: (lineId: string, precio: number) => void;
  setDescuento: (lineId: string, descuento: number) => void;
  setEquipoSerie: (lineId: string, equipoSerie: string) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
  notas: string;
  setNotas: (v: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "pos-cart-v1";

type StoredCart = {
  lines: CartLine[];
  notas: string;
};

function readStoredCart(): StoredCart {
  if (typeof window === "undefined") {
    return { lines: [], notas: "" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lines: [], notas: "" };
    }

    const parsed = JSON.parse(raw) as { lines?: CartLine[]; notas?: string };

    return {
      lines: Array.isArray(parsed.lines)
        ? parsed.lines
            .map(normalizeStoredCartLine)
            .filter((line): line is CartLine => Boolean(line))
        : [],
      notas: typeof parsed.notas === "string" ? parsed.notas : "",
    };
  } catch {
    return { lines: [], notas: "" };
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function calcTotals(lines: CartLine[]): CartTotals {
  const totalInclIgv = lines.reduce(
    (acc, line) =>
      acc +
      lineTotalInclIgv(line.cantidad, line.precioUnitario, line.descuento),
    0,
  );
  const totals = splitIncludedIgv(totalInclIgv);

  return {
    ...totals,
    itemsCount: lines.reduce((acc, l) => acc + l.cantidad, 0),
  };
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toOptionalFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  return toFiniteNumber(value);
}

function normalizeStoredCartLine(value: unknown): CartLine | null {
  if (!value || typeof value !== "object") return null;

  const line = value as Partial<CartLine>;
  if (!line.id || !line.productoId || !line.sku || !line.nombre) return null;

  return {
    id: line.id,
    kind: line.kind === "EQUIPO" ? "EQUIPO" : "PRODUCTO",
    productoId: line.productoId,
    equipoId: line.equipoId,
    equipoSerie: line.equipoSerie,
    sku: line.sku,
    nombre: line.nombre,
    cantidad: Math.max(0, toFiniteNumber(line.cantidad, 1)),
    precioUnitario: Math.max(0, toFiniteNumber(line.precioUnitario)),
    descuento: Math.max(0, toFiniteNumber(line.descuento)),
    precioMinimo: toOptionalFiniteNumber(line.precioMinimo),
    requiereSerie: Boolean(line.requiereSerie),
    stockDisponible: toOptionalFiniteNumber(line.stockDisponible),
    imagen: line.imagen ?? null,
    tipo: line.tipo,
    mesesGarantia: toOptionalFiniteNumber(line.mesesGarantia) ?? null,
    garantiaMaxCopias: toOptionalFiniteNumber(line.garantiaMaxCopias) ?? null,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const initialCart = useMemo(() => readStoredCart(), []);
  const [lines, setLines] = useState<CartLine[]>(initialCart.lines);
  const [notas, setNotas] = useState(initialCart.notas);

  // Persistir cambios.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lines, notas }),
      );
    } catch {
      // ignore
    }
  }, [lines, notas]);

  const addLine = useCallback((input: AddLineInput) => {
    setLines((prev) => {
      // Misma key = mismo productoId + mismo equipoSerie + mismo precio (para no mezclar precios distintos).
      const idx = prev.findIndex(
        (l) =>
          l.productoId === input.productoId &&
          (input.requiereSerie
            ? (l.equipoSerie ?? "") === (input.equipoSerie ?? "")
            : true),
      );
      const cantidad = input.requiereSerie
        ? 1
        : Math.max(0, toFiniteNumber(input.cantidad, 1));
      const descuento = Math.max(0, toFiniteNumber(input.descuento));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          cantidad: next[idx].requiereSerie ? 1 : next[idx].cantidad + cantidad,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: makeId(),
          kind: input.kind,
          productoId: input.productoId,
          equipoId: input.equipoId,
          equipoSerie: input.equipoSerie,
          sku: input.sku,
          nombre: input.nombre,
          cantidad,
          precioUnitario: Math.max(0, toFiniteNumber(input.precioUnitario)),
          descuento,
          precioMinimo: toOptionalFiniteNumber(input.precioMinimo),
          requiereSerie: input.requiereSerie,
          stockDisponible: toOptionalFiniteNumber(input.stockDisponible),
          imagen: input.imagen ?? null,
          tipo: input.tipo,
          mesesGarantia: toOptionalFiniteNumber(input.mesesGarantia) ?? null,
          garantiaMaxCopias:
            toOptionalFiniteNumber(input.garantiaMaxCopias) ?? null,
        },
      ];
    });
  }, []);

  const setCantidad = useCallback((lineId: string, cantidad: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.id === lineId
            ? {
                ...l,
                cantidad: l.requiereSerie
                  ? Math.min(1, Math.max(0, cantidad))
                  : Math.max(0, cantidad),
              }
            : l,
        )
        .filter((l) => l.cantidad > 0),
    );
  }, []);

  const setPrecio = useCallback((lineId: string, precio: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId ? { ...l, precioUnitario: Math.max(0, precio) } : l,
      ),
    );
  }, []);

  const setDescuento = useCallback((lineId: string, descuento: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId ? { ...l, descuento: Math.max(0, descuento) } : l,
      ),
    );
  }, []);

  const setEquipoSerie = useCallback((lineId: string, equipoSerie: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? { ...l, equipoSerie: equipoSerie.trim() || undefined }
          : l,
      ),
    );
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setNotas("");
  }, []);

  const totals = useMemo(() => calcTotals(lines), [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      totals,
      addLine,
      setCantidad,
      setPrecio,
      setDescuento,
      setEquipoSerie,
      removeLine,
      clear,
      notas,
      setNotas,
    }),
    [
      lines,
      totals,
      addLine,
      setCantidad,
      setPrecio,
      setDescuento,
      setEquipoSerie,
      removeLine,
      clear,
      notas,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
