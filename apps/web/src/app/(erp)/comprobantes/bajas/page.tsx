import { redirect } from "next/navigation";

export default function BajasRedirect() {
  redirect("/comprobantes?tab=bajas");
}
