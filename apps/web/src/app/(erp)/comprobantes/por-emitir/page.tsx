import { redirect } from "next/navigation";

export default function PorEmitirRedirect() {
  redirect("/comprobantes?tab=por-emitir");
}
