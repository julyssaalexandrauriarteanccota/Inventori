"use client";

import { pdf } from "@react-pdf/renderer";
import type { ConfigEmpresaPayload } from "@erp/shared";

import {
  CotizacionPDF,
  type CotizacionPdfData,
} from "@/components/pdf/cotizacion-pdf";

export async function downloadCotizacionPdf(
  data: CotizacionPdfData,
  empresa: ConfigEmpresaPayload,
  igvPercent = 18,
) {
  const blob = await pdf(
    <CotizacionPDF data={data} empresa={empresa} igvPercent={igvPercent} />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cotizacion-${data.numero}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
