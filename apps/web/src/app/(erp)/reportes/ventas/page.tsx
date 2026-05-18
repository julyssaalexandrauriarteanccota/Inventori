import { redirect } from "next/navigation";

export default function ReporteVentasRedirect() {
  redirect("/reportes?tab=ventas");
}
