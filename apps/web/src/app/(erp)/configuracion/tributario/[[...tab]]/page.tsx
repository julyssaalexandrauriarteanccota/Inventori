import type { Metadata } from "next";

import { FiscalSettingsContent } from "@/components/settings/fiscal-settings-content";

export const metadata: Metadata = {
  title: "Configuración tributaria",
};

type TributarioTab =
  | "config"
  | "series"
  | "certificado"
  | "credenciales-sol"
  | "reglas"
  | "validaciones"
  | "feriados";

const TAB_MAP: Record<string, TributarioTab> = {
  "datos-fiscales": "config",
  series: "series",
  certificado: "certificado",
  "credenciales-sol": "credenciales-sol",
  validaciones: "reglas",
  feriados: "feriados",
};

export default async function ConfiguracionTributariaPage({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const { tab } = await params;
  const initialTab = TAB_MAP[tab?.[0] ?? "datos-fiscales"] ?? "config";

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col rounded-2xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <FiscalSettingsContent initialTab={initialTab} />
    </div>
  );
}
