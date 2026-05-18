import { redirect } from "next/navigation";

export default function BoletasRedirect() {
  redirect("/comprobantes?tab=boletas");
}
