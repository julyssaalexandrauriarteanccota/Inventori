import { redirect } from "next/navigation";

export default function NotasDebitoRedirect() {
  redirect("/comprobantes?tab=notas-debito");
}
