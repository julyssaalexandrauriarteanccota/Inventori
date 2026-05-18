import { redirect } from "next/navigation";

export default function FacturasRedirect() {
  redirect("/comprobantes?tab=facturas");
}
