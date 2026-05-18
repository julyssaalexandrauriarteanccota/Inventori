"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TipoDocumento } from "@erp/shared";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ComprobantesTable } from "./_components/comprobantes-table";
import { ComunicacionesBajaTable } from "./_components/comunicaciones-baja-table";
import { PorEmitirTable } from "./_components/por-emitir-table";

type ComprobantesTab =
  | "por-emitir"
  | "facturas"
  | "boletas"
  | "notas-credito"
  | "notas-debito"
  | "bajas";

const TAB_VALUES: readonly ComprobantesTab[] = [
  "por-emitir",
  "facturas",
  "boletas",
  "notas-credito",
  "notas-debito",
  "bajas",
] as const;

const DEFAULT_TAB: ComprobantesTab = "por-emitir";

function isComprobantesTab(value: string | null): value is ComprobantesTab {
  return !!value && (TAB_VALUES as readonly string[]).includes(value);
}

export default function ComprobantesHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = useMemo<ComprobantesTab>(() => {
    const raw = searchParams.get("tab");
    return isComprobantesTab(raw) ? raw : DEFAULT_TAB;
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_TAB) {
        next.delete("tab");
      } else {
        next.set("tab", value);
      }
      const query = next.toString();
      router.replace(query ? `/comprobantes?${query}` : "/comprobantes");
    },
    [router, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
      <TabsList className="grid w-full grid-cols-2 rounded-2xl lg:grid-cols-6">
        <TabsTrigger value="por-emitir">Por emitir</TabsTrigger>
        <TabsTrigger value="facturas">Facturas</TabsTrigger>
        <TabsTrigger value="boletas">Boletas</TabsTrigger>
        <TabsTrigger value="notas-credito">Notas de crédito</TabsTrigger>
        <TabsTrigger value="notas-debito">Notas de débito</TabsTrigger>
        <TabsTrigger value="bajas">Comunicaciones de baja</TabsTrigger>
      </TabsList>

      <TabsContent value="por-emitir" className="mt-4">
        <PorEmitirTable />
      </TabsContent>
      <TabsContent value="facturas" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.FACTURA} />
      </TabsContent>
      <TabsContent value="boletas" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.BOLETA} />
      </TabsContent>
      <TabsContent value="notas-credito" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.NOTA_CREDITO} />
      </TabsContent>
      <TabsContent value="notas-debito" className="mt-4">
        <ComprobantesTable tipo={TipoDocumento.NOTA_DEBITO} />
      </TabsContent>
      <TabsContent value="bajas" className="mt-4">
        <ComunicacionesBajaTable />
      </TabsContent>
    </Tabs>
  );
}
