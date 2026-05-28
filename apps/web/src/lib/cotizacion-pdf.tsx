"use client";

import type { ConfigEmpresaPayload } from "@erp/shared";

import type { CotizacionPdfData } from "@/components/pdf/cotizacion-pdf";

// @react-pdf/renderer pesa varios cientos de KB; lo cargamos sólo al generar el PDF
// para que las páginas que importan estos helpers no incluyan el bundle inicial.
async function buildCotizacionBlob(
  data: CotizacionPdfData,
  empresa: ConfigEmpresaPayload,
  igvPercent: number,
): Promise<Blob> {
  const [{ pdf }, { CotizacionPDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/cotizacion-pdf"),
  ]);

  return pdf(
    <CotizacionPDF data={data} empresa={empresa} igvPercent={igvPercent} />,
  ).toBlob();
}

export async function generateCotizacionPdfBlobUrl(
  data: CotizacionPdfData,
  empresa: ConfigEmpresaPayload,
  igvPercent = 18,
): Promise<string> {
  const blob = await buildCotizacionBlob(data, empresa, igvPercent);
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
