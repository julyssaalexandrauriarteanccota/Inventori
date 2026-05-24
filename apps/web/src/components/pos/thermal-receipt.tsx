"use client";

/**
 * Representación impresa SUNAT (boleta / factura electrónica) en
 * formato ticket 80mm y A4. Renderiza HTML autocontenido que se
 * imprime desde una ventana emergente (`window.open` + `window.print`).
 *
 * Cumple los campos obligatorios de la representación impresa SUNAT:
 * - Datos del emisor: logo, razón social, nombre comercial, RUC,
 *   dirección fiscal, ubigeo, código de establecimiento y régimen.
 * - Datos del receptor: tipo y número de documento, razón social y
 *   dirección (en factura).
 * - Detalle por línea con unidad SUNAT, valor unitario e importe.
 * - Totales por tipo de operación (gravadas, exoneradas, inafectas,
 *   gratuitas), IGV, total y total en letras.
 * - Forma de pago (CONTADO/CRÉDITO).
 * - QR y hash del XML firmado cuando el comprobante ya fue aceptado.
 * - Pie de impresión configurable + leyenda obligatoria
 *   "Representación impresa del comprobante electrónico."
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Printer, X } from "lucide-react";
import type { FormatoImpresionDocumento } from "@erp/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { numeroALetras } from "@/lib/numero-a-letras";

export interface ThermalReceiptItem {
  sku?: string | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  /** Código SUNAT de unidad de medida (e.g. `NIU`, `ZZ`). Default `NIU`. */
  unidad?: string;
}

export interface ThermalReceiptData {
  empresa: {
    /** Razón social legal (cabecera SUNAT obligatoria). */
    nombre: string;
    /** Nombre comercial opcional, se muestra sobre la razón social. */
    nombreComercial?: string;
    ruc?: string;
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
    codigoEstablecimiento?: string;
    regimenTributario?: string;
    telefono?: string;
    email?: string;
    web?: string;
    /** URL absoluta del logo (PNG/JPG/SVG) para la cabecera. */
    logoUrl?: string;
  };
  comprobante: {
    tipo: "BOLETA" | "FACTURA" | "VENTA" | string;
    serie?: string;
    numero?: string;
    fecha: string; // ISO
    estado?: string;
    esComprobanteElectronico?: boolean;
    /** Leyenda exacta SUNAT (override opcional). */
    leyendaTipo?: string;
  };
  cliente: {
    nombre: string;
    docTipo?: string;
    docNumero?: string;
    direccion?: string;
  };
  items: ThermalReceiptItem[];
  totales: {
    /** Operaciones gravadas (sin IGV). */
    opGravadas?: number;
    opExoneradas?: number;
    opInafectas?: number;
    opGratuitas?: number;
    /** Subtotal (sin IGV) — compatibilidad con versiones previas. */
    subtotal: number;
    igv: number;
    total: number;
    moneda?: string;
    /** Si no se provee, se calcula desde `total` y `moneda`. */
    totalEnLetras?: string;
  };
  pago?: {
    metodo?: string;
    referencia?: string;
    formaPago?: "CONTADO" | "CREDITO" | string;
    recibido?: number;
    vuelto?: number;
  };
  ventaNumero?: string;
  /** Pie configurable del emisor (mensaje al comprador). */
  pieImpresion?: string;
  /** Payload del QR SUNAT cuando ya hay comprobante aceptado. */
  qrPayload?: string;
  /** Hash (digestValue) del XML firmado. */
  hashFirma?: string;
  /** URL del QR ya renderizado (img src). Opcional, override del cliente. */
  qrImageUrl?: string;
}

const MONEDA_LITERAL: Record<string, string> = {
  PEN: "SOLES",
  USD: "DOLARES AMERICANOS",
  EUR: "EUROS",
};

const formatPEN = (v: number, moneda = "PEN") =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(v ?? 0);

const parseDateAndParts = (iso: string) => {
  if (!iso) return { date: "", time: "" };

  // Case 1: "DD/MM/YYYY, HH:MM [a.m./p.m.]" or similar with comma
  if (iso.includes(",")) {
    const parts = iso.split(",");
    const datePart = parts[0].trim();
    const timePart = parts[1]?.trim() || "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
      return { date: datePart, time: timePart };
    }
  }

  // Case 2: "DD/MM/YYYY HH:MM:SS" or similar space-separated format
  const spaceParts = iso.trim().split(/\s+/);
  if (spaceParts.length >= 2) {
    const datePart = spaceParts[0];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart) || /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const timePart = spaceParts.slice(1).join(" ");
      return {
        date: datePart.includes("-") ? datePart.split("-").reverse().join("/") : datePart,
        time: timePart,
      };
    }
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: iso, time: iso };
  }

  const dateStr = d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeStr = d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return { date: dateStr, time: timeStr };
};

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFechaCorta = (iso: string) => {
  return parseDateAndParts(iso).date;
};

const formatHora = (iso: string) => {
  return parseDateAndParts(iso).time;
};

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tipoLeyenda(data: ThermalReceiptData): string {
  if (data.comprobante.leyendaTipo) return data.comprobante.leyendaTipo;
  const tipo = String(data.comprobante.tipo).toUpperCase();
  if (isVentaInterna(data)) return "TICKET INTERNO - NO ES COMPROBANTE FISCAL";
  if (!isComprobanteElectronico(data)) {
    if (tipo.startsWith("FACT")) return "VENTA PENDIENTE DE FACTURA";
    if (tipo.startsWith("BOLE")) return "VENTA PENDIENTE DE BOLETA";
    return "VENTA PENDIENTE DE COMPROBANTE";
  }
  if (tipo.startsWith("FACT")) return "FACTURA ELECTRONICA";
  if (tipo.startsWith("BOLE")) return "BOLETA DE VENTA ELECTRONICA";
  if (tipo.startsWith("NC")) return "NOTA DE CREDITO ELECTRONICA";
  if (tipo.startsWith("ND")) return "NOTA DE DEBITO ELECTRONICA";
  return `${tipo} ELECTRONICA`;
}

function serieNumero(data: ThermalReceiptData): string {
  if (!isComprobanteElectronico(data)) {
    return data.ventaNumero?.trim() || data.comprobante.numero?.trim() || "POR EMITIR";
  }
  const serie = data.comprobante.serie?.trim();
  const numero = data.comprobante.numero?.trim();
  if (serie && numero) {
    return numero.includes("-") ? numero : `${serie}-${numero}`;
  }
  return numero ?? serie ?? "PENDIENTE";
}

function totalEnLetras(data: ThermalReceiptData): string {
  if (data.totales.totalEnLetras) return data.totales.totalEnLetras;
  const moneda = MONEDA_LITERAL[data.totales.moneda ?? "PEN"] ?? "SOLES";
  return numeroALetras(data.totales.total, moneda);
}

function formaPagoLabel(data: ThermalReceiptData): string {
  const forma = data.pago?.formaPago;
  if (!forma) return "CONTADO";
  return String(forma).toUpperCase();
}

function qrSrc(data: ThermalReceiptData): string | null {
  if (data.qrImageUrl) return data.qrImageUrl;
  if (!data.qrPayload) return null;
  const encoded = encodeURIComponent(data.qrPayload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encoded}`;
}

const FORMAT_LABELS: Record<FormatoImpresionDocumento, string> = {
  A4: "A4",
  TICKET: "ticket",
  AMBOS: "A4 y ticket",
};

function isComprobanteElectronico(data: ThermalReceiptData): boolean {
  if (typeof data.comprobante.esComprobanteElectronico === "boolean") {
    return data.comprobante.esComprobanteElectronico;
  }
  return Boolean(data.comprobante.numero);
}

function isVentaInterna(data: ThermalReceiptData): boolean {
  return (
    String(data.comprobante.tipo).toUpperCase() === "VENTA_INTERNA" ||
    String(data.comprobante.estado ?? "").toUpperCase() === "INTERNA"
  );
}

function nonFiscalFooter(data: ThermalReceiptData): string {
  if (isVentaInterna(data)) {
    return "Ticket interno. No es comprobante de pago ni documento fiscal.";
  }
  return "Documento interno de venta pendiente de emisión. Emita el comprobante electrónico desde Comprobantes > Por emitir.";
}

function buildTicketMarkup(data: ThermalReceiptData) {
  const moneda = data.totales.moneda ?? "PEN";
  const opGravadas = data.totales.opGravadas ?? data.totales.subtotal;
  const opExoneradas = data.totales.opExoneradas ?? 0;
  const opInafectas = data.totales.opInafectas ?? 0;
  const opGratuitas = data.totales.opGratuitas ?? 0;

  const mapUnidadTicket = (u: string) => {
    const upper = String(u ?? "").toUpperCase().trim();
    if (upper === "NIU") return "UND";
    if (upper === "ZZ") return "SERV";
    return upper || "UND";
  };

  const itemsRows = data.items
    .map((it) => {
      const unidad = it.unidad ?? "NIU";
      const qtyStr = it.cantidad.toFixed(2);
      return `
        <tr>
          <td class="qty">${qtyStr} ${escapeHtml(mapUnidadTicket(unidad))}</td>
          <td class="desc">
            <div class="nombre">${escapeHtml(it.nombre)}</div>
            ${it.sku ? `<div class="sku">${escapeHtml(it.sku)}</div>` : ""}
          </td>
          <td class="amt">${formatPEN(it.total, moneda)}</td>
        </tr>
        <tr class="unit">
          <td></td>
          <td colspan="2">${qtyStr} x ${formatPEN(it.precioUnitario, moneda)}</td>
        </tr>
      `;
    })
    .join("");

  const isFiscal = isComprobanteElectronico(data);
  const qr = isFiscal ? qrSrc(data) : null;

  return `
    <div class="ticket">
      ${
        data.empresa.logoUrl
          ? `<div class="ticket-logo"><img src="${escapeHtml(data.empresa.logoUrl)}" alt="logo" /></div>`
          : ""
      }
      ${
        data.empresa.nombreComercial
          ? `<div class="center"><strong>${escapeHtml(data.empresa.nombreComercial)}</strong></div>`
          : ""
      }
      <h1>${escapeHtml(data.empresa.nombre)}</h1>
      <div class="center small">
        ${(() => {
          const parts = [data.empresa.direccion, data.empresa.distrito, data.empresa.provincia, data.empresa.departamento].filter(Boolean);
          return parts.length ? `${escapeHtml(parts.join(' - '))}<br/>` : '';
        })()}
        ${data.empresa.ubigeo ? `Ubigeo: ${escapeHtml(data.empresa.ubigeo)}<br/>` : ""}
        ${data.empresa.codigoEstablecimiento ? `Cod. estab.: ${escapeHtml(data.empresa.codigoEstablecimiento)}<br/>` : ""}
        ${data.empresa.telefono ? `Tel: ${escapeHtml(data.empresa.telefono)}<br/>` : ""}
        ${data.empresa.email ? `${escapeHtml(data.empresa.email)}<br/>` : ""}
        ${data.empresa.web ? `${escapeHtml(data.empresa.web)}` : ""}
      </div>

      <div class="ticket-box">
        ${data.empresa.ruc ? `<div class="ticket-box-ruc">RUC: ${escapeHtml(data.empresa.ruc)}</div>` : ""}
        <div class="ticket-box-title">${escapeHtml(tipoLeyenda(data)).toUpperCase()}</div>
        <div class="ticket-box-numero">${escapeHtml(serieNumero(data))}</div>
        ${data.comprobante.estado ? `<div class="ticket-box-estado">${escapeHtml(data.comprobante.estado)}</div>` : ""}
      </div>

      <div class="metadata-section small">
        <div class="row-meta"><span class="lbl">Fecha</span><span class="sep">:</span><span class="val">${formatFecha(data.comprobante.fecha)}</span></div>
        ${data.ventaNumero ? `<div class="row-meta"><span class="lbl">Venta</span><span class="sep">:</span><span class="val">${escapeHtml(data.ventaNumero)}</span></div>` : ""}
        <div class="row-meta"><span class="lbl">Forma pago</span><span class="sep">:</span><span class="val">${escapeHtml(formaPagoLabel(data))}</span></div>
        <div class="row-meta"><span class="lbl">Cliente</span><span class="sep">:</span><span class="val"><strong>${escapeHtml(data.cliente.nombre)}</strong></span></div>
        ${data.cliente.docNumero ? `<div class="row-meta"><span class="lbl">${escapeHtml(data.cliente.docTipo ?? "DOC")}</span><span class="sep">:</span><span class="val">${escapeHtml(data.cliente.docNumero)}</span></div>` : ""}
        ${data.cliente.direccion ? `<div class="row-meta"><span class="lbl">Dirección</span><span class="sep">:</span><span class="val">${escapeHtml(data.cliente.direccion)}</span></div>` : ""}
      </div>
      <hr/>
      <table>
        <tbody>${itemsRows}</tbody>
      </table>
      <hr/>
      <div class="totales">
        ${opGravadas > 0 ? `<div class="row"><span>Op. Gravada:</span><span>${formatPEN(opGravadas, moneda)}</span></div>` : ""}
        ${opExoneradas > 0 ? `<div class="row"><span>Op. Exonerada:</span><span>${formatPEN(opExoneradas, moneda)}</span></div>` : ""}
        ${opInafectas > 0 ? `<div class="row"><span>Op. Inafecta:</span><span>${formatPEN(opInafectas, moneda)}</span></div>` : ""}
        ${opGratuitas > 0 ? `<div class="row"><span>Op. Gratuita:</span><span>${formatPEN(opGratuitas, moneda)}</span></div>` : ""}
        <div class="row"><span>IGV (18%):</span><span>${formatPEN(data.totales.igv, moneda)}</span></div>
        <div class="row grand"><span>TOTAL:</span><span>${formatPEN(data.totales.total, moneda)}</span></div>
      </div>
      <div class="small letras">
        <strong>Son:</strong> ${escapeHtml(totalEnLetras(data))}
      </div>
      ${
        data.pago?.metodo
          ? `<hr/><div class="small">
              <div class="row"><span>Pago</span><span>${escapeHtml(data.pago.metodo)}</span></div>
              ${data.pago.referencia ? `<div class="row"><span>Ref</span><span>${escapeHtml(data.pago.referencia)}</span></div>` : ""}
              ${typeof data.pago.recibido === "number" ? `<div class="row"><span>Recibido</span><span>${formatPEN(data.pago.recibido, moneda)}</span></div>` : ""}
              ${typeof data.pago.vuelto === "number" && data.pago.vuelto > 0 ? `<div class="row"><span>Vuelto</span><span>${formatPEN(data.pago.vuelto, moneda)}</span></div>` : ""}
            </div>`
          : ""
      }
      ${
        qr
          ? `<hr/><div class="qr"><img src="${escapeHtml(qr)}" alt="QR SUNAT" /></div>`
          : ""
      }
      ${
        data.hashFirma
          ? `<div class="small center hash">Hash: ${escapeHtml(data.hashFirma)}</div>`
          : ""
      }
      ${
        data.pieImpresion
          ? `<hr/><div class="small center pie">${escapeHtml(data.pieImpresion)}</div>`
          : ""
      }
      <div class="footer">
        ¡Gracias por su compra!<br/>
        <span class="small">${
          isFiscal
            ? "Representación impresa del comprobante electrónico."
            : nonFiscalFooter(data)
        }</span>
        ${data.empresa.regimenTributario ? `<br/><span class="small">${escapeHtml(data.empresa.regimenTributario)}</span>` : ""}
      </div>
    </div>`;
}

function buildA4Markup(data: ThermalReceiptData) {
  const moneda = data.totales.moneda ?? "PEN";
  const opGravadas = data.totales.opGravadas ?? data.totales.subtotal;
  const opExoneradas = data.totales.opExoneradas ?? 0;
  const opInafectas = data.totales.opInafectas ?? 0;
  const opGratuitas = data.totales.opGratuitas ?? 0;

  const isTaxed = (data.totales.igv ?? 0) > 0;
  const divisor = isTaxed ? 1.18 : 1.0;

  const mapUnidad = (u: string) => {
    const upper = String(u ?? "").toUpperCase().trim();
    if (upper === "NIU") return "UNIDAD";
    if (upper === "ZZ") return "UNIDAD";
    return upper || "UNIDAD";
  };

  const itemsRows = data.items
    .map((it) => {
      const unidad = it.unidad ?? "NIU";
      const valorUnitario = (it.precioUnitario / divisor).toFixed(2);
      const totalItem = it.total.toFixed(2);

      return `
        <tr>
          <td class="right">${it.cantidad.toFixed(2)}</td>
          <td class="center">${escapeHtml(mapUnidad(unidad))}</td>
          <td>
            <strong>${escapeHtml(it.nombre)}</strong>
            ${it.sku ? `<br/><span style="color:#666;font-size:11px;">${escapeHtml(it.sku)}</span>` : ""}
          </td>
          <td class="right">${valorUnitario}</td>
          <td class="right">${(0).toFixed(2)}</td>
          <td class="right">${totalItem}</td>
          <td class="right">${(0).toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");

  const isFiscal = isComprobanteElectronico(data);
  const qr = isFiscal ? qrSrc(data) : null;

  return `
    <div class="a4">
      <header class="a4-header">
        <div class="a4-emisor">
          ${
            data.empresa.logoUrl
              ? `<div class="a4-logo"><img src="${escapeHtml(data.empresa.logoUrl)}" alt="logo" /></div>`
              : ""
          }
          <div class="a4-emisor-text">
            ${
              data.empresa.nombreComercial
                ? `<div class="a4-nombre-comercial">${escapeHtml(data.empresa.nombreComercial)}</div>`
                : ""
            }
            <h1>${escapeHtml(data.empresa.nombre)}</h1>
            ${(() => {
              const parts = [data.empresa.direccion, data.empresa.distrito, data.empresa.provincia, data.empresa.departamento].filter(Boolean);
              return parts.length ? `<p>${escapeHtml(parts.join(' - '))}</p>` : '';
            })()}
            <p class="a4-emisor-meta">
              ${data.empresa.ubigeo ? `Ubigeo ${escapeHtml(data.empresa.ubigeo)} ` : ""}
              ${data.empresa.codigoEstablecimiento ? `· Estab. ${escapeHtml(data.empresa.codigoEstablecimiento)} ` : ""}
              ${data.empresa.regimenTributario ? `· ${escapeHtml(data.empresa.regimenTributario)}` : ""}
            </p>
            <p class="a4-emisor-meta">
              ${data.empresa.telefono ? `Tel. ${escapeHtml(data.empresa.telefono)} ` : ""}
              ${data.empresa.email ? `· ${escapeHtml(data.empresa.email)} ` : ""}
              ${data.empresa.web ? `· ${escapeHtml(data.empresa.web)}` : ""}
            </p>
          </div>
        </div>
        <div class="a4-box">
          ${data.empresa.ruc ? `<span class="a4-box-ruc">RUC ${escapeHtml(data.empresa.ruc)}</span>` : ""}
          <strong>${escapeHtml(tipoLeyenda(data))}</strong>
          <span class="a4-box-numero">${escapeHtml(serieNumero(data))}</span>
          ${data.comprobante.estado ? `<span class="a4-box-estado">${escapeHtml(data.comprobante.estado)}</span>` : ""}
        </div>
      </header>
      <section class="a4-sunat-metadata">
        <div class="metadata-col">
          <table class="metadata-grid">
            <tr>
              <td class="lbl">Señor(es)</td>
              <td class="sep">:</td>
              <td class="val"><strong>${escapeHtml(data.cliente.nombre)}</strong></td>
            </tr>
            <tr>
              <td class="lbl">RUC / DNI</td>
              <td class="sep">:</td>
              <td class="val">${data.cliente.docNumero ? `${escapeHtml(data.cliente.docTipo ?? "DOC")} ${escapeHtml(data.cliente.docNumero)}` : "—"}</td>
            </tr>
            <tr>
              <td class="lbl">Dirección</td>
              <td class="sep">:</td>
              <td class="val">${escapeHtml(data.cliente.direccion ?? "—")}</td>
            </tr>
          </table>
        </div>
        <div class="metadata-col">
          <table class="metadata-grid">
            <tr>
              <td class="lbl">Fecha de Emisión</td>
              <td class="sep">:</td>
              <td class="val"><strong>${formatFechaCorta(data.comprobante.fecha)}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Hora</td>
              <td class="sep">:</td>
              <td class="val">${formatHora(data.comprobante.fecha)}</td>
            </tr>
            <tr>
              <td class="lbl">Forma de Pago</td>
              <td class="sep">:</td>
              <td class="val"><strong>${escapeHtml(formaPagoLabel(data))}</strong></td>
            </tr>
            <tr>
              <td class="lbl">Tipo de Moneda</td>
              <td class="sep">:</td>
              <td class="val">${escapeHtml(MONEDA_LITERAL[moneda] ?? moneda)}</td>
            </tr>
          </table>
        </div>
      </section>
      <table class="a4-table">
        <thead>
          <tr>
            <th class="right">Cantidad</th>
            <th class="center">Unidad Medida</th>
            <th>Descripción</th>
            <th class="right">Valor Unitario(*)</th>
            <th class="right">Descuento(*)</th>
            <th class="right">Importe de Venta(**)</th>
            <th class="right">ICBPER</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <section class="a4-first-totals-section">
        <table class="a4-first-totals-table">
          <tr>
            <td class="lbl">Otros Cargos :</td>
            <td class="val">${formatPEN(0, moneda)}</td>
          </tr>
          <tr>
            <td class="lbl">Otros Tributos :</td>
            <td class="val">${formatPEN(0, moneda)}</td>
          </tr>
          <tr>
            <td class="lbl">ICBPER :</td>
            <td class="val"><span class="val-box">${formatPEN(0, moneda)}</span></td>
          </tr>
          <tr>
            <td class="lbl bold">Importe Total :</td>
            <td class="val bold">${formatPEN(data.totales.total, moneda)}</td>
          </tr>
        </table>
      </section>
      <div class="a4-divider-blue"></div>
      <div class="a4-letras-row">
        SON: ${escapeHtml(totalEnLetras(data)).toUpperCase()}
      </div>
      <section class="a4-bottom-totals-area">
        <div class="a4-footnotes">
          <p class="footnote-item">(*) Sin impuestos.</p>
          <p class="footnote-item">(**) Incluye impuestos, de ser Op. Gravada.</p>
        </div>
        <div class="a4-second-totals">
          <table class="a4-second-totals-table">
            <tr>
              <td class="lbl">Op. Gravada :</td>
              <td class="val"><span class="val-box">${formatPEN(opGravadas, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">Op. Exonerada :</td>
              <td class="val"><span class="val-box">${formatPEN(opExoneradas, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">Op. Inafecta :</td>
              <td class="val"><span class="val-box">${formatPEN(opInafectas, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">ISC :</td>
              <td class="val"><span class="val-box">${formatPEN(0, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">IGV :</td>
              <td class="val"><span class="val-box">${formatPEN(data.totales.igv, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">ICBPER :</td>
              <td class="val"><span class="val-box">${formatPEN(0, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">Otros Cargos :</td>
              <td class="val"><span class="val-box">${formatPEN(0, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">Otros Tributos :</td>
              <td class="val"><span class="val-box">${formatPEN(0, moneda)}</span></td>
            </tr>
            <tr>
              <td class="lbl">Monto de Redondeo :</td>
              <td class="val"><span class="val-box">${formatPEN(0, moneda)}</span></td>
            </tr>
            <tr class="grand-row">
              <td class="lbl bold">Importe Total :</td>
              <td class="val bold"><span class="val-box bold-box">${formatPEN(data.totales.total, moneda)}</span></td>
            </tr>
          </table>
        </div>
      </section>
      <section class="a4-pago-row">
        ${
          data.pago?.metodo
            ? `<div class="a4-payment">
                <span><strong>Pago:</strong> ${escapeHtml(data.pago.metodo)}</span>
                ${data.pago.referencia ? `<span>Ref: ${escapeHtml(data.pago.referencia)}</span>` : ""}
                ${typeof data.pago.recibido === "number" ? `<span>Recibido: ${formatPEN(data.pago.recibido, moneda)}</span>` : ""}
                ${typeof data.pago.vuelto === "number" && data.pago.vuelto > 0 ? `<span>Vuelto: ${formatPEN(data.pago.vuelto, moneda)}</span>` : ""}
              </div>`
            : `<div class="a4-payment"><span>Forma de pago: ${escapeHtml(formaPagoLabel(data))}</span></div>`
        }
        ${
          qr
            ? `<div class="a4-qr"><img src="${escapeHtml(qr)}" alt="QR SUNAT" /></div>`
            : ""
        }
      </section>
      ${
        data.hashFirma
          ? `<div class="a4-hash">Hash de firma: <code>${escapeHtml(data.hashFirma)}</code></div>`
          : ""
      }
      ${
        data.pieImpresion
          ? `<div class="a4-pie">${escapeHtml(data.pieImpresion)}</div>`
          : ""
      }
      <footer>${
        isFiscal
          ? "Representación impresa del comprobante electrónico. Consulte la validez en <strong>www.sunat.gob.pe</strong>."
          : nonFiscalFooter(data)
      }</footer>
    </div>`;
}

const SHARED_PRINT_CSS = `
  * { box-sizing: border-box; }
  .center { text-align: center; }
  .right { text-align: right !important; }
  .ticket-logo { display: flex; justify-content: center; margin-bottom: 2mm; }
  .ticket-logo img { max-width: 60mm; max-height: 18mm; object-fit: contain; }
  .ticket { width: 80mm; max-width: 80mm; padding: 4mm 3mm; overflow-wrap: break-word; }
  .ticket, .ticket * { font-family: 'Courier New', ui-monospace, monospace; }
  .ticket h1 { font-size: 13px; text-align: center; margin: 0 0 2mm; letter-spacing: 0.5px; text-transform: uppercase; }
  .ticket .small { font-size: 10px; }
  .ticket .row { display: flex; justify-content: space-between; gap: 6px; }
  .ticket .serie { font-weight: bold; letter-spacing: 1px; }
  .ticket .estado-doc { font-size: 10px; font-weight: 700; }
  .ticket hr { border: none; border-top: 1.5px dashed #000; margin: 2mm 0; height: 0; }
  .ticket-box { border: 1.5px solid #000; padding: 8px; margin: 8px 0; text-align: center; text-transform: uppercase; }
  .ticket-box-ruc { font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px; }
  .ticket-box-title { font-size: 11px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px; }
  .ticket-box-numero { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
  .ticket-box-estado { font-size: 10px; font-weight: bold; margin-top: 4px; }
  .ticket .metadata-section { margin: 8px 0; display: flex; flex-direction: column; gap: 3px; }
  .ticket .row-meta { display: flex; align-items: flex-start; }
  .ticket .row-meta .lbl { width: 22mm; flex-shrink: 0; font-weight: bold; }
  .ticket .row-meta .sep { width: 2mm; flex-shrink: 0; text-align: center; font-weight: bold; }
  .ticket .row-meta .val { flex-grow: 1; word-break: break-word; }
  .ticket table { width: 100%; border-collapse: collapse; }
  .ticket td { padding: 0; vertical-align: top; }
  .ticket td.qty { width: 18mm; white-space: nowrap; font-size: 10px; }
  .ticket td.desc { padding-left: 1mm; }
  .ticket td.amt { width: 23mm; text-align: right; white-space: nowrap; font-size: 10px; }
  .ticket .nombre { font-weight: bold; font-size: 11px; line-height: 1.25; }
  .ticket .sku { font-size: 9px; color: #444; }
  .ticket tr.unit td { font-size: 9px; color: #555; padding-bottom: 1mm; }
  .ticket .totales .row { font-size: 11px; }
  .ticket .totales .grand { font-size: 14px; font-weight: bold; margin-top: 2px; border-top: 1px solid #000; border-bottom: 3px double #000; padding: 3px 0; }
  .ticket .letras { margin-top: 2mm; }
  .ticket .qr { display: flex; justify-content: center; margin: 2mm 0; }
  .ticket .qr img { width: 28mm; height: 28mm; }
  .ticket .hash { word-break: break-all; font-size: 8px; }
  .ticket .pie { font-style: italic; }
  .ticket .footer { text-align: center; margin-top: 3mm; font-size: 10px; }
  .a4 { width: 100%; min-height: 260mm; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; overflow-wrap: break-word; }
  .a4 .center { text-align: center; }
  .a4 .right { text-align: right; }
  .a4-header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 16px; }
  .a4-emisor { display: flex; gap: 16px; align-items: flex-start; }
  .a4-logo { width: 90px; flex-shrink: 0; }
  .a4-logo img { max-width: 90px; max-height: 90px; object-fit: contain; }
  .a4-emisor-text { display: flex; flex-direction: column; gap: 2px; }
  .a4-emisor h1 { margin: 0; font-size: 22px; text-align: left; }
  .a4-nombre-comercial { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
  .a4-emisor-text p { margin: 2px 0; color: #444; font-size: 12px; }
  .a4-emisor-meta { font-size: 11px; color: #555; }
  .a4-box { min-width: 220px; border: 2px solid #111; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 14px; text-align: center; text-transform: uppercase; }
  .a4-box strong { font-size: 14px; letter-spacing: .04em; }
  .a4-box .a4-box-ruc { font-size: 13px; font-weight: 700; }
  .a4-box .a4-box-numero { font-size: 20px; font-weight: 700; }
  .a4-box .a4-box-estado { font-size: 12px; font-weight: 700; }
  .a4-sunat-metadata {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 24px;
    margin: 18px 0;
    padding: 12px 4px;
    border-top: 1.5px solid #000;
    border-bottom: 1.5px solid #000;
  }
  .metadata-col {
    display: flex;
    flex-direction: column;
  }
  .metadata-grid {
    width: 100%;
    border-collapse: collapse;
  }
  .metadata-grid td {
    padding: 3px 0;
    vertical-align: top;
    font-size: 11px;
    line-height: 1.4;
  }
  .metadata-grid td.lbl {
    width: 115px;
    min-width: 115px;
    color: #444;
    font-weight: 500;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: .03em;
  }
  .metadata-grid td.sep {
    width: 15px;
    min-width: 15px;
    text-align: center;
    color: #444;
  }
  .metadata-grid td.val {
    color: #000;
    text-align: left;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  @media (max-width: 768px) {
    .a4-sunat-metadata {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }
  .a4-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .a4-table th, .a4-table td { border-bottom: 1px solid #ddd; padding: 10px 8px; vertical-align: top; }
  .a4-table th { background: #f5f5f5; text-align: left; font-size: 11px; text-transform: uppercase; }
  .a4-table th.center, .a4-table td.center { text-align: center; }
  .a4-table th.right, .a4-table td.right { text-align: right; }
  .a4-table span { color: #666; font-size: 11px; }
  .a4-summary { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 20px; margin-top: 22px; align-items: flex-start; }
  .a4-letras { border: 1px solid #ddd; border-radius: 8px; padding: 12px; min-height: 100%; }
  .a4-letras span { display: block; color: #666; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
  .a4-letras strong { font-size: 13px; line-height: 1.4; }
  .a4-totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 8px 0; font-size: 12px; }
  .a4-totals .grand { border-bottom: 2px solid #111; font-size: 17px; text-transform: uppercase; }
  .a4-pago-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 22px; }
  .a4-payment { display: flex; flex-direction: column; gap: 4px; border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; flex: 1; font-size: 12px; }
  .a4-qr { width: 110px; height: 110px; flex-shrink: 0; }
  .a4-qr img { width: 100%; height: 100%; object-fit: contain; }
  .a4-hash { margin-top: 18px; word-break: break-all; font-size: 10px; color: #555; }
  .a4-hash code { font-family: 'Courier New', monospace; }
  .a4-pie { margin-top: 18px; padding: 10px 14px; border: 1px dashed #999; border-radius: 8px; font-style: italic; font-size: 11px; color: #444; }
  .a4 footer { margin-top: 28px; color: #666; font-size: 11px; text-align: center; }
  .a4-divider-blue { border-top: 3px solid #2563eb; margin: 16px 0 8px 0; width: 100%; }
  .a4-letras-row { text-align: right; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #000; letter-spacing: 0.02em; }
  .a4-first-totals-section { display: flex; justify-content: flex-end; margin-top: 10px; width: 100%; }
  .a4-first-totals-table { width: 280px; border-collapse: collapse; }
  .a4-first-totals-table td { padding: 3px 0; font-size: 11px; vertical-align: middle; }
  .a4-first-totals-table td.lbl { text-align: right; padding-right: 12px; color: #333; }
  .a4-first-totals-table td.val { text-align: right; width: 90px; }
  .a4-first-totals-table td.bold { font-weight: bold; font-size: 12px; }
  .a4-first-totals-table .val-box { display: inline-block; border: 1px solid #777; padding: 2px 6px; min-width: 80px; text-align: right; }
  .a4-bottom-totals-area { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 14px; width: 100%; }
  .a4-footnotes { flex: 1; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
  .a4-footnotes .footnote-item { margin: 0; font-size: 11px; color: #333; }
  .a4-second-totals { width: 320px; display: flex; justify-content: flex-end; }
  .a4-second-totals-table { width: 100%; border-collapse: collapse; }
  .a4-second-totals-table td { padding: 3px 0; font-size: 11px; vertical-align: middle; }
  .a4-second-totals-table td.lbl { text-align: right; padding-right: 12px; color: #333; }
  .a4-second-totals-table td.val { text-align: right; width: 110px; }
  .a4-second-totals-table td.bold { font-weight: bold; font-size: 13px; }
  .a4-second-totals-table .val-box { display: inline-block; border: 1px solid #777; padding: 3px 8px; min-width: 100px; text-align: right; color: #000; }
  .a4-second-totals-table .bold-box { border: 2px solid #000; font-weight: bold; font-size: 13px; padding: 4px 8px; }
`;

function buildStyles(format: FormatoImpresionDocumento) {
  return `
    @page { size: ${format === "TICKET" ? "80mm auto" : "A4"}; margin: ${format === "TICKET" ? "0" : "14mm"}; }
    html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; }
    .page-break { page-break-after: always; height: 1px; }
    ${SHARED_PRINT_CSS}
    @media print { body { width: ${format === "TICKET" ? "80mm" : "auto"}; } }
  `;
}

function buildPreviewStyles() {
  // Reutiliza el CSS de impresión, pero scope-eado a `.receipt-preview` para
  // no contaminar el resto del dashboard.
  const scoped = SHARED_PRINT_CSS.replace(
    /(^|\n)(\s*)(\.[a-zA-Z][^,{\n]*)/g,
    (match, prefix: string, indent: string, selector: string) => {
      const trimmed = selector.trim();
      if (trimmed.startsWith(".receipt-preview")) return match;
      return `${prefix}${indent}.receipt-preview ${trimmed}`;
    },
  );
  return `
    .receipt-preview { color: #000; }
    .receipt-preview .preview-section { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 8px; }
    .receipt-preview .preview-label { width: min(100%, calc(794px * var(--receipt-a4-scale, 1))); color: #334155; font: 600 12px Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: .08em; }
    .receipt-preview .ticket-label { width: 76mm; max-width: 100%; }
    ${scoped}
    .receipt-preview .a4-scale-shell {
      position: relative;
      width: calc(794px * var(--receipt-a4-scale, 1));
      height: calc(1123px * var(--receipt-a4-scale, 1));
      max-width: 100%;
      margin: 0 auto;
      overflow: visible;
    }
    .receipt-preview .a4-scale-shell > .a4 {
      position: absolute;
      left: 50%;
      top: 0;
      width: 794px;
      min-height: 1123px;
      max-width: none;
      padding: 32px;
      transform: translateX(-50%) scale(var(--receipt-a4-scale, 1));
      transform-origin: top center;
      box-shadow: 0 18px 45px rgba(15, 23, 42, .2);
    }
    .receipt-preview .ticket { width: 80mm; max-width: 80mm; }
    @media (max-width: 900px) {
      .receipt-preview .a4-scale-shell { width: 100%; height: auto; min-height: 0; }
      .receipt-preview .a4-scale-shell > .a4 { position: static; width: 100%; min-height: auto; transform: none; }
      .receipt-preview .a4-header { flex-direction: column; }
      .receipt-preview .a4-box { width: 100%; min-width: 0; }
      .receipt-preview .a4-sunat-metadata, .receipt-preview .a4-summary { grid-template-columns: 1fr; }
    }
  `;
}

function buildHtml(data: ThermalReceiptData, format: FormatoImpresionDocumento) {
  const content =
    format === "AMBOS"
      ? `${buildA4Markup(data)}<div class="page-break"></div>${buildTicketMarkup(data)}`
      : format === "A4"
        ? buildA4Markup(data)
        : buildTicketMarkup(data);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo</title>
<style>${buildStyles(format)}</style>
</head>
<body>${content}</body>
</html>`;
}

export function ThermalReceiptDialog({
  open,
  onOpenChange,
  data,
  format = "TICKET",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ThermalReceiptData | null;
  format?: FormatoImpresionDocumento;
}) {
  const [previewFormat, setPreviewFormat] =
    useState<Exclude<FormatoImpresionDocumento, "AMBOS">>("A4");
  const [a4PreviewScale, setA4PreviewScale] = useState(1);
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const visiblePreviewFormat = format === "AMBOS" ? previewFormat : format;

  useEffect(() => {
    if (!open || !data || visiblePreviewFormat !== "A4") {
      return;
    }

    const pane = previewPaneRef.current;
    if (!pane) return;

    const fitA4 = () => {
      const pageWidth = 794;
      const pageHeight = 1123;
      const availableWidth = Math.max(1, pane.clientWidth - 24);
      const availableHeight = Math.max(1, pane.clientHeight - 24);
      const nextScale = Math.min(
        1,
        availableWidth / pageWidth,
        availableHeight / pageHeight,
      );
      setA4PreviewScale(Math.max(0.3, Math.floor(nextScale * 100) / 100));
    };

    fitA4();
    const frame = window.requestAnimationFrame(fitA4);
    const observer = new ResizeObserver(fitA4);
    observer.observe(pane);
    window.addEventListener("resize", fitA4);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", fitA4);
    };
  }, [data, open, visiblePreviewFormat]);

  const previewHtml = useMemo(() => {
    if (!data) return "";
    if (format === "AMBOS") {
      return `<style>${buildPreviewStyles()}</style>
        <div class="receipt-preview">
          ${
            visiblePreviewFormat === "A4"
              ? `<section class="preview-section"><div class="preview-label">Vista A4 completa</div><div class="a4-scale-shell">${buildA4Markup(data)}</div></section>`
              : `<section class="preview-section"><div class="preview-label ticket-label">Vista ticket 80mm</div>${buildTicketMarkup(data)}</section>`
          }
        </div>`;
    }
    return `<style>${buildPreviewStyles()}</style><div class="receipt-preview">${visiblePreviewFormat === "A4" ? `<div class="a4-scale-shell">${buildA4Markup(data)}</div>` : buildTicketMarkup(data)}</div>`;
  }, [data, format, visiblePreviewFormat]);

  const openPrintWindow = (
    printData: ThermalReceiptData,
    printFormat: FormatoImpresionDocumento,
    delay = 150,
  ) => {
    const width = printFormat === "TICKET" ? 420 : 980;
    const printWindow = window.open("", "_blank", `width=${width},height=720`);
    if (!printWindow) return false;
    printWindow.document.open();
    printWindow.document.write(buildHtml(printData, printFormat));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), delay);
    return true;
  };

  const handlePrint = () => {
    if (!data) return;

    if (format === "AMBOS") {
      openPrintWindow(data, "A4", 150);
      openPrintWindow(data, "TICKET", 650);
      return;
    }

    openPrintWindow(data, format);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[96dvh] max-h-[96dvh] w-[96vw] max-w-[1100px] flex-col overflow-hidden p-0 sm:max-w-[1100px]">
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-3">
          <div className="flex flex-col gap-3 pr-7 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle>Vista previa de impresión</DialogTitle>
            {format === "AMBOS" ? (
              <div className="flex rounded-xl border border-border/70 bg-muted/50 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewFormat === "A4" ? "secondary" : "ghost"}
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => setPreviewFormat("A4")}
                >
                  A4
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewFormat === "TICKET" ? "secondary" : "ghost"}
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => setPreviewFormat("TICKET")}
                >
                  Ticket
                </Button>
              </div>
            ) : null}
          </div>
        </DialogHeader>
        <div
          ref={previewPaneRef}
          className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 dark:bg-slate-950/60"
        >
          <div
            className="mx-auto max-w-full text-black [&_.a4]:mx-auto [&_.a4]:bg-white [&_.ticket]:mx-auto [&_.ticket]:bg-white [&_.ticket]:shadow-xl"
            style={
              {
                "--receipt-a4-scale": String(a4PreviewScale),
              } as CSSProperties
            }
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-5 py-3 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X className="size-4" /> Cerrar
          </Button>
          <Button onClick={handlePrint} type="button">
            <Printer className="size-4" /> Imprimir {FORMAT_LABELS[format]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
