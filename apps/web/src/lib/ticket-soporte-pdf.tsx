"use client";

import type { ConfigEmpresaPayload, TicketDetalle } from "@erp/shared";

/**
 * Generates the tracking URL for a given ticket.
 */
function getTrackingUrl(codigo: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}/ticket?codigo=${codigo}`;
}

/**
 * Generates the QR code data URL for a ticket.
 * Carga `qrcode` dinámicamente para no incluirlo en el bundle inicial.
 */
async function generateQrCode(codigo: string, primaryColor?: string | null): Promise<string> {
  const url = getTrackingUrl(codigo);
  try {
    const { default: QRCode } = await import("qrcode");
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 120,
      color: {
        dark: primaryColor || "#0F766E", // match brand primary color
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR Code for ticket PDF", err);
    return "";
  }
}

/**
 * Generates a local preview Blob URL for the ticket PDF.
 * Tanto `@react-pdf/renderer` como el componente de PDF se cargan dinámicamente
 * para reducir el bundle de las páginas que sólo enlazan a estas funciones.
 */
export async function generateTicketSoporteBlobUrl(
  ticket: TicketDetalle,
  empresa?: ConfigEmpresaPayload | null,
): Promise<string> {
  const [qrCodeUrl, { pdf }, { TicketSoportePDF }] = await Promise.all([
    generateQrCode(ticket.codigo, empresa?.colorPrimario),
    import("@react-pdf/renderer"),
    import("@/components/pdf/ticket-soporte-pdf"),
  ]);
  const blob = await pdf(
    <TicketSoportePDF ticket={ticket} empresa={empresa} qrCodeUrl={qrCodeUrl} />,
  ).toBlob();
  return URL.createObjectURL(blob);
}

/**
 * Generates and triggers download of the ticket PDF.
 */
export async function downloadTicketSoportePdf(
  ticket: TicketDetalle,
  empresa?: ConfigEmpresaPayload | null,
) {
  const url = await generateTicketSoporteBlobUrl(ticket, empresa);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ticket-${ticket.codigo}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
