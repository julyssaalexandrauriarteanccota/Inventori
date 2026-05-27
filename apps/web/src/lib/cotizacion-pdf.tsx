"use client";

import { pdf } from "@react-pdf/renderer";
import type { ConfigEmpresaPayload } from "@erp/shared";

import {
  CotizacionPDF,
  type CotizacionPdfData,
} from "@/components/pdf/cotizacion-pdf";

export async function generateCotizacionPdfBlobUrl(
  data: CotizacionPdfData,
  empresa: ConfigEmpresaPayload,
  igvPercent = 18,
): Promise<string> {
  const blob = await pdf(
    <CotizacionPDF data={data} empresa={empresa} igvPercent={igvPercent} />,
  ).toBlob();
  return URL.createObjectURL(blob);
}

export async function downloadCotizacionPdf(
  data: CotizacionPdfData,
  empresa: ConfigEmpresaPayload,
  igvPercent = 18,
) {
  const url = await generateCotizacionPdfBlobUrl(data, empresa, igvPercent);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cotizacion-${data.numero}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
