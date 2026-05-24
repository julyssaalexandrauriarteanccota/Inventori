"use client";

import { useMemo, useState } from "react";

import { getApiAssetUrlCandidates } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProductoThumbnailProps {
  src?: string | null;
  alt: string;
  /** Texto corto a mostrar como fallback (típicamente el SKU). */
  fallback: string;
  /** Tamaño del cuadro en px o "full" para ocupar todo el contenedor. Default 44 (table). */
  size?: number | "full";
  className?: string;
  imgClassName?: string;
  rounded?: "md" | "lg" | "xl" | "2xl";
}

/**
 * Miniatura cuadrada para productos. Usa la imagen principal si existe,
 * de lo contrario muestra un degradado con las iniciales del SKU.
 */
export function ProductoThumbnail({
  src,
  alt,
  fallback,
  size = 44,
  className,
  imgClassName,
  rounded = "lg",
}: ProductoThumbnailProps) {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const candidates = useMemo(() => (src ? getApiAssetUrlCandidates(src) : []), [src]);
  const currentSrc = candidates[attemptIndex];
  const showImage = !!currentSrc;
  const initials = fallback.slice(0, 4).toUpperCase();
  const radius = {
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
  }[rounded];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-border/60 bg-muted/40",
        radius,
        className,
      )}
      style={
        size === "full"
          ? { width: "100%", height: "100%" }
          : { width: size, height: size }
      }
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => setAttemptIndex((idx) => idx + 1)}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-linear-to-br from-blue-500 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 font-bold uppercase tracking-wide text-white",
            size === "full" ? "text-sm" : "text-[10px]"
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
