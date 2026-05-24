"use client";

import { useState } from "react";
import {
  Loader2,
  ScrollText,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenCajaDialog } from "@/components/caja/open-caja-dialog";
import { useMiAperturaActiva } from "@/hooks/use-caja";
import { usePageAutoRefresh } from "@/hooks/use-page-auto-refresh";
import { PageAutoRefreshControl } from "@/components/layout/page-auto-refresh-control";

import { HistorialVentasWorkspace } from "../pos/historial/page";

export default function VentasHubPage() {
  const router = useRouter();
  const { data: aperturaResp, isLoading } = useMiAperturaActiva();
  const apertura = aperturaResp?.data ?? null;
  const cajaAbierta = !!apertura;
  const [openModal, setOpenModal] = useState(false);

  const autoRefresh = usePageAutoRefresh({
    scope: "ventas",
    toastLabel: "Ventas",
    manualToastMessage: "Lista actualizada",
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <PageHeader
        title="Ventas"
        description={<PageAutoRefreshControl autoRefresh={autoRefresh} />}
        hideTitleVisually
        actions={
          <>
            <Button
              size="sm"
              onClick={() => router.push("/pos")}
              disabled={!cajaAbierta}
              className="erp-page-primary-cta gap-2 rounded-xl"
            >
              <ShoppingCart className="size-4" /> Nueva venta
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/ventas/cotizaciones")}
              className="gap-2 rounded-xl"
            >
              <ScrollText className="size-4" /> Cotizaciones
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/comprobantes/por-emitir")}
              className="gap-2 rounded-xl"
            >
              <Receipt className="size-4" /> Comprobantes
            </Button>
            <CajaStatus
              isLoading={isLoading}
              cajaAbierta={cajaAbierta}
              cajaNombre={apertura?.caja?.nombre}
              onOpen={() => setOpenModal(true)}
            />
          </>
        }
      />

      {!cajaAbierta && !isLoading && (
        <div className="rounded-xl border border-[oklch(0.86_0.05_75)] bg-[oklch(0.96_0.02_75)] px-3 py-2 text-xs text-[oklch(0.38_0.08_75)] dark:border-[oklch(0.25_0.05_75)] dark:bg-[oklch(0.16_0.03_75)] dark:text-[oklch(0.78_0.08_75)] font-medium">
          No tienes un turno de caja abierto. Abre una caja para habilitar las
          ventas. Si no existe ninguna, créala desde{" "}
          <strong>Configuración → Cajas</strong>.
        </div>
      )}

      <HistorialVentasWorkspace showCreateButton={false} autoRefresh={autoRefresh} />

      <OpenCajaDialog open={openModal} onOpenChange={setOpenModal} />
    </div>
  );
}

function CajaStatus({
  isLoading,
  cajaAbierta,
  cajaNombre,
  onOpen,
}: {
  isLoading: boolean;
  cajaAbierta: boolean;
  cajaNombre?: string;
  onOpen: () => void;
}) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Verificando…
      </span>
    );
  }
  if (cajaAbierta) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Wallet className="size-3" /> Caja
          {cajaNombre ? `: ${cajaNombre}` : " abierta"}
        </Badge>
        <Button asChild size="sm" variant="outline">
          <Link href="/pos/caja">Gestionar</Link>
        </Button>
      </div>
    );
  }
  return (
    <Button size="sm" onClick={onOpen} className="gap-2">
      <Wallet className="size-4" /> Abrir caja
    </Button>
  );
}
