"use client";

import { useState } from "react";
import { Loader2, ShoppingCart, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TopbarActions } from "@/components/layout/topbar-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenCajaDialog } from "@/components/caja/open-caja-dialog";
import { useMiAperturaActiva } from "@/hooks/use-caja";
import { RealtimeStatus } from "@/components/layout/realtime-status";

import { HistorialVentasWorkspace } from "../pos/historial/historial-ventas-workspace";

export default function VentasHubPage() {
  const router = useRouter();
  const { data: aperturaResp, isLoading } = useMiAperturaActiva();
  const apertura = aperturaResp?.data ?? null;
  const cajaAbierta = !!apertura;
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="relative flex flex-col gap-6 w-full min-w-0 sm:flex-1 sm:min-h-0">
      {/* Decorative backing glows — coordinated with stat-card palette */}
      <div className="pointer-events-none absolute -z-10 bg-emerald-400/8 dark:bg-emerald-500/8 blur-[140px] top-0 left-1/4 size-[420px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-indigo-400/6 dark:bg-indigo-500/6 blur-[130px] top-32 right-1/4 size-[360px] rounded-full" />
      <div className="pointer-events-none absolute -z-10 bg-amber-400/5 dark:bg-amber-500/5 blur-[150px] bottom-1/4 right-12 size-[380px] rounded-full" />
      <TopbarActions>
        <RealtimeStatus />
        <CajaStatus
          isLoading={isLoading}
          cajaAbierta={cajaAbierta}
          cajaNombre={apertura?.caja?.nombre}
          onOpen={() => setOpenModal(true)}
        />
        <Button
          size="sm"
          onClick={() => router.push("/pos")}
          disabled={!cajaAbierta}
          className="erp-page-primary-cta gap-2 rounded-xl h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
        >
          <ShoppingCart className="size-4" />
          <span className="hidden sm:inline">Nueva venta</span>
          <span className="sm:hidden">POS</span>
        </Button>
      </TopbarActions>
      <h1 className="sr-only">Ventas</h1>

      {!cajaAbierta && !isLoading && (
        <div className="rounded-xl border border-[oklch(0.86_0.05_75)] bg-[oklch(0.96_0.02_75)] px-3 py-2 text-xs text-[oklch(0.38_0.08_75)] dark:border-[oklch(0.25_0.05_75)] dark:bg-[oklch(0.16_0.03_75)] dark:text-[oklch(0.78_0.08_75)] font-medium">
          No tienes un turno de caja abierto. Abre una caja para habilitar las
          ventas. Si no existe ninguna, créala desde{" "}
          <strong>Configuración → Cajas</strong>.
        </div>
      )}

      <HistorialVentasWorkspace showCreateButton={false} />

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
