import { getApiAssetUrlCandidates } from "@/lib/api";

export function sanitizeProductCodeValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

/**
 * Intenta descargar una imagen del API y devolverla como dataURL para
 * incrustarla de forma confiable en el PDF (react-pdf <Image>) sin sufrir
 * problemas de CORS o de URLs relativas. Devuelve null si no se puede.
 */
export async function fetchAssetAsDataUrl(
  path?: string | null,
): Promise<string | null> {
  const normalized = sanitizeProductCodeValue(path);
  if (!normalized) return null;

  if (/^data:/i.test(normalized)) return normalized;

  const candidates = getApiAssetUrlCandidates(normalized);
  if (!candidates.length) return null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { credentials: "omit", cache: "force-cache" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return dataUrl;
    } catch {
      // probar siguiente candidato
    }
  }

  return null;
}

export async function fetchFirstAssetAsDataUrl(
  paths: Array<string | null | undefined>,
): Promise<string | null> {
  const uniquePaths = Array.from(
    new Set(paths.map(sanitizeProductCodeValue).filter(Boolean)),
  ) as string[];

  for (const path of uniquePaths) {
    const dataUrl = await fetchAssetAsDataUrl(path);
    if (dataUrl) {
      return dataUrl;
    }
  }

  return null;
}

export function resolveProductCodeValues({
  sku,
  barcodeValue,
  qrValue,
  showQr = true,
}: {
  sku?: string | null;
  barcodeValue?: string | null;
  qrValue?: string | null;
  showQr?: boolean;
}) {
  const normalizedSku = sanitizeProductCodeValue(sku);

  return {
    barcodeValue:
      sanitizeProductCodeValue(barcodeValue) ?? normalizedSku ?? null,
    qrValue: showQr
      ? sanitizeProductCodeValue(qrValue) ??
        (normalizedSku ? `PRD:${normalizedSku}` : null)
      : null,
  };
}

export async function generateBarcodeDataUrl(value: string) {
  const normalized = sanitizeProductCodeValue(value);

  if (!normalized) {
    throw new Error("No se pudo resolver el código de barras.");
  }

  if (typeof document === "undefined") {
    throw new Error("La generación de etiquetas requiere un navegador.");
  }

  const { default: jsBarcode } = await import("jsbarcode");
  const canvas = document.createElement("canvas");

  jsBarcode(canvas, normalized, {
    format: "CODE128",
    displayValue: false,
    background: "#ffffff",
    lineColor: "#111827",
    margin: 8,
    height: 72,
    width: 2,
  });

  return canvas.toDataURL("image/png");
}

export async function generateQrDataUrl(value: string) {
  const normalized = sanitizeProductCodeValue(value);

  if (!normalized) {
    throw new Error("No se pudo resolver el código QR.");
  }

  const qrcode = await import("qrcode");

  return qrcode.toDataURL(normalized, {
    margin: 1,
    width: 256,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}
