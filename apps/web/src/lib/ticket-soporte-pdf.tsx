"use client";

import { pdf } from "@react-pdf/renderer";
import type { ConfigEmpresaPayload, TicketDetalle } from "@erp/shared";
import QRCode from "qrcode";

import { TicketSoportePDF } from "@/components/pdf/ticket-soporte-pdf";

/**
 * Generates the tracking URL for a given ticket.
 */
function getTrackingUrl(codigo: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}/ticket?codigo=${codigo}`;
}

/**
 * Generates the QR code data URL for a ticket.
 */
async function generateQrCode(codigo: string, primaryColor?: string | null): Promise<string> {
  const url = getTrackingUrl(codigo);
  try {
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
 */
export async function generateTicketSoporteBlobUrl(
  ticket: TicketDetalle,
  empresa?: ConfigEmpresaPayload | null,
): Promise<string> {
  const qrCodeUrl = await generateQrCode(ticket.codigo, empresa?.colorPrimario);
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
