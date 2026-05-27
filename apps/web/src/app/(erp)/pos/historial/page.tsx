"use client";

import { TopbarActions } from "@/components/layout/topbar-actions";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { HistorialVentasWorkspace } from "./historial-ventas-workspace";

export default function HistorialPage() {
  return (
    <>
      <TopbarActions>
        <RealtimeStatus />
      </TopbarActions>
      <HistorialVentasWorkspace />
    </>
  );
}
