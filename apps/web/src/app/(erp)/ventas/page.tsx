"use client";

import { useState } from "react";
import {
  History,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpenCajaDialog } from "@/components/caja/open-caja-dialog";
import { useMiAperturaActiva } from "@/hooks/use-caja";

import { HistorialVentasWorkspace } from "../pos/historial/page";

export default function VentasHubPage() {
  const router = useRouter();
  const { data: aperturaResp, isLoading } = useMiAperturaActiva();
  const apertura = aperturaResp?.data ?? null;
  const cajaAbierta = !!apertura;
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ventas"
        description="Gestiona ventas, comprobantes y emisión fiscal"
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
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          No tienes un turno de caja abierto. Abre una caja para habilitar las
          ventas. Si no existe ninguna, créala desde{" "}
          <strong>Configuración → Cajas</strong>.
        </div>
      )}

      <Tabs defaultValue="historial" className="flex flex-col gap-3">
        <TabsList>
          <TabsTrigger value="historial" className="gap-2">
            <History className="size-4" /> Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-0">
          <HistorialVentasWorkspace showCreateButton={false} />
        </TabsContent>
      </Tabs>

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
