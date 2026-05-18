import { redirect } from "next/navigation";

export default function ReporteInventarioRedirect() {
  redirect("/reportes?tab=inventario");
}
