import { redirect } from "next/navigation";

export default function ReporteSoporteRedirect() {
  redirect("/reportes?tab=soporte");
}
