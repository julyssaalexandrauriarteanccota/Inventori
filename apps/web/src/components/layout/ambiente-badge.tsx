"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { AmbienteSunat } from "@erp/shared";

import { useConfigFiscal } from "@/hooks/use-facturacion";
import { cn } from "@/lib/utils";

/**
 * Badge global que muestra el ambiente SUNAT activo (BETA / PRODUCCIÓN).
 *
 * - **BETA**: tonalidad violeta suave, label `BETA`. Indica que las emisiones
 *   van al endpoint de pruebas (no genera obligaciones tributarias).
 * - **PRODUCCIÓN**: tonalidad ámbar/roja muy visible, label `PRODUCCIÓN`.
 *   Necesario para que el operador sepa que cualquier emisión es real
 *   y compromete a la empresa frente a SUNAT.
 *
 * Se monta en el topbar del ERP shell (visible en TODAS las rutas) y se
 * puede reusar en headers de páginas críticas (hub de comprobantes, detalle).
 */
interface AmbienteBadgeProps {
  className?: string;
  /** Variante compacta para topbar (menos padding, sin label largo). */
  compact?: boolean;
}

export function AmbienteBadge({ className, compact }: AmbienteBadgeProps) {
  const configQ = useConfigFiscal();
  const config = configQ.data?.data;

  // Mientras se carga la config no mostramos nada (evita flash de "BETA"
  // antes de saber el ambiente real).
  if (configQ.isLoading || !config) return null;

  const ambiente = config.ambienteDefault;
  if (!ambiente) return null;

  const isProd = ambiente === AmbienteSunat.PRODUCCION;

  return (
    <div
      role="status"
      aria-label={`Ambiente SUNAT actual: ${isProd ? "Producción" : "Beta"}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        "transition-colors select-none",
        compact ? "h-7 px-2 text-[10px]" : "h-8 px-3 text-xs",
        isProd
          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-950/30 dark:text-violet-300",
        className,
      )}
    >
      {isProd ? (
        <ShieldAlert className={compact ? "size-3" : "size-3.5"} />
      ) : (
        <ShieldCheck className={compact ? "size-3" : "size-3.5"} />
      )}
      <span>{isProd ? "Producción" : "Beta"}</span>
    </div>
  );
}
