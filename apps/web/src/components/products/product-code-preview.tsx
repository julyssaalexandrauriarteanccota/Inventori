"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Barcode, QrCode } from "lucide-react";

import { resolveProductCodeValues } from "@/lib/product-code-utils";
import { cn } from "@/lib/utils";

function BarcodeSvgPreview({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    if (!svgRef.current) {
      return;
    }

    setHasError(false);
    void import("jsbarcode")
      .then((module) => {
        if (!active || !svgRef.current) {
          return;
        }

        const jsBarcode = module.default;
        jsBarcode(svgRef.current, value, {
          format: "CODE128",
          displayValue: true,
          background: "#ffffff",
          lineColor: "#111827",
          fontOptions: "bold",
          fontSize: 13,
          margin: 10,
          height: 48,
          width: 1.5,
        });
      })
      .catch(() => {
        if (active) {
          setHasError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (hasError) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        No se pudo generar el código de barras.
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className={cn(
        "h-18 w-full overflow-visible rounded-xl bg-white px-2 py-1",
        className,
      )}
      aria-label={`Código de barras ${value}`}
    />
  );
}

function QrImagePreview({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setDataUrl(null);
    setHasError(false);

    void import("qrcode")
      .then(async (module) => {
        const nextUrl = await module.toDataURL(value, {
          margin: 1,
          width: 192,
          color: {
            dark: "#111827",
            light: "#ffffff",
          },
        });

        if (active) {
          setDataUrl(nextUrl);
        }
      })
      .catch(() => {
        if (active) {
          setHasError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (hasError) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        No se pudo generar el QR.
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={cn(
          "size-28 animate-pulse rounded-xl bg-muted/70",
          className,
        )}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`Código QR ${value}`}
      className={cn(
        "size-28 rounded-xl border border-slate-200 bg-white p-2 shadow-sm",
        className,
      )}
    />
  );
}

export function ProductCodePreview({
  sku,
  barcodeValue,
  qrValue,
  className,
  compact = false,
  showQr = true,
}: {
  sku?: string | null;
  barcodeValue?: string | null;
  qrValue?: string | null;
  className?: string;
  compact?: boolean;
  showQr?: boolean;
}) {
  const { barcodeValue: effectiveBarcode, qrValue: effectiveQr } = useMemo(
    () =>
      resolveProductCodeValues({
        sku,
        barcodeValue,
        qrValue,
        showQr,
      }),
    [barcodeValue, qrValue, showQr, sku],
  );

  if (!effectiveBarcode && !effectiveQr) {
    return null;
  }

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      {effectiveBarcode ? (
        <div className="rounded-2xl border border-border/60 bg-card/95 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/12 dark:bg-sky-400/16 dark:text-sky-100 dark:ring-sky-400/18">
              <Barcode className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Código de barras
              </p>
              {!compact ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {effectiveBarcode}
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
            <BarcodeSvgPreview value={effectiveBarcode} />
          </div>
        </div>
      ) : null}

      {effectiveQr ? (
        <div className="rounded-2xl border border-border/60 bg-card/95 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/12 dark:bg-emerald-400/16 dark:text-emerald-100 dark:ring-emerald-400/18">
              <QrCode className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Código QR</p>
              {!compact ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {effectiveQr}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-center rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <QrImagePreview value={effectiveQr} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
