import { redirect } from "next/navigation";

export default function NotasCreditoRedirect() {
  redirect("/comprobantes?tab=notas-credito");
}
