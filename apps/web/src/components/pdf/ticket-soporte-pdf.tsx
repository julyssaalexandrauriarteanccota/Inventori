"use client";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  ConfigEmpresaPayload,
  TicketDetalle,
  TicketDetalleEntry,
} from "@erp/shared";
import { getApiAssetUrl } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────────────────
const FALLBACK_PRIMARY = "#0F766E";
const FALLBACK_SECONDARY = "#0F172A";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(value: number | string | null | undefined) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}

function fmtDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clienteNombre(ticket: TicketDetalle) {
  const cliente = ticket.cliente;
  if (!cliente) return "-";
  return (
    cliente.razonSocial ||
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
    "-"
  );
}

function equipoNombre(ticket: TicketDetalle) {
  if (ticket.equipo) {
    return [
      ticket.equipo.producto?.nombre,
      ticket.equipo.numeroSerie,
      ticket.equipo.producto?.modeloCatalogo?.nombre,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (ticket.clienteEquipo) {
    return [
      ticket.clienteEquipo.nombre,
      ticket.clienteEquipo.marca,
      ticket.clienteEquipo.modelo,
      ticket.clienteEquipo.numeroSerie,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  return "Sin equipo asociado";
}

function detalleTotal(row: TicketDetalleEntry) {
  return Number(row.cantidad) * Number(row.precioUnitario);
}

function rowsTotal(rows: TicketDetalleEntry[]) {
  return rows.reduce((sum, row) => {
    if (row.cubiertoGarantia) return sum;
    return sum + detalleTotal(row);
  }, 0);
}

function isUsableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.startsWith("data:")) return true;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  return false;
}

function resolveImage(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isUsableImageUrl(value)) return value;
  if (typeof window === "undefined") return null;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return null;
  }
}

// ── Styles factory ───────────────────────────────────────────────────────────
function buildStyles(primary: string, secondary: string) {
  return StyleSheet.create({
    page: {
      paddingTop: 32,
      paddingBottom: 48,
      paddingHorizontal: 32,
      fontFamily: "Helvetica",
      fontSize: 9.5,
      color: "#0F172A",
      lineHeight: 1.35,
    },
    headerBar: {
      height: 4,
      backgroundColor: primary,
      marginBottom: 14,
      borderRadius: 2,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 18,
    },
    brandRow: { flexDirection: "row", gap: 12, alignItems: "center" },
    logoBox: {
      width: 64,
      height: 64,
      backgroundColor: "#F8FAFC",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    logoImg: { width: "100%", height: "100%", objectFit: "contain" },
    logoFallback: { fontSize: 11, fontWeight: "bold", color: secondary },
    brandTitle: { fontSize: 14, fontWeight: "bold", color: secondary },
    brandSub: { fontSize: 8.5, color: "#475569", marginTop: 1 },
    brandMeta: { fontSize: 8.5, color: "#475569", marginTop: 1 },
    docMeta: { alignItems: "flex-end" },
    docBox: {
      borderWidth: 1.5,
      borderColor: primary,
      padding: 10,
      minWidth: 180,
      textAlign: "center",
      borderRadius: 4,
    },
    docTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: primary,
      marginBottom: 4,
    },
    docNumber: {
      fontSize: 12,
      fontWeight: 700,
      color: secondary,
      marginBottom: 4,
    },
    docLine: {
      fontSize: 8.5,
      color: "#475569",
      marginTop: 1,
    },
    sectionTitle: {
      fontSize: 9,
      fontWeight: "bold",
      color: primary,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 4,
      marginTop: 14,
    },
    twoCol: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 14,
    },
    card: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 6,
      padding: 10,
      backgroundColor: "#FAFAFA",
    },
    cardTitle: {
      fontSize: 8.5,
      fontWeight: "bold",
      color: "#475569",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    cardName: { fontSize: 11, fontWeight: "bold", color: secondary },
    cardLine: { fontSize: 9, color: "#334155", marginTop: 1 },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: "50%",
      paddingRight: 8,
      marginBottom: 7,
    },
    label: {
      color: "#64748B",
      fontSize: 7.5,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    value: {
      fontSize: 9,
      color: "#111827",
    },
    paragraph: {
      lineHeight: 1.45,
      fontSize: 9,
    },
    table: {
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 6,
      overflow: "hidden",
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: secondary,
      color: "#FFFFFF",
      paddingVertical: 6,
      paddingHorizontal: 6,
      fontSize: 8.5,
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    tableRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
      paddingVertical: 6,
      paddingHorizontal: 6,
      alignItems: "center",
    },
    colName: {
      width: "55%",
      paddingRight: 4,
    },
    colQty: {
      width: "15%",
      textAlign: "right",
      paddingRight: 4,
    },
    colPrice: {
      width: "15%",
      textAlign: "right",
      paddingRight: 4,
    },
    colTotal: {
      width: "15%",
      textAlign: "right",
      fontWeight: "bold",
    },
    th: {
      fontSize: 8,
      fontWeight: "bold",
    },
    totalsWrap: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
      alignItems: "flex-start",
    },
    qrContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "50%",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 6,
      padding: 8,
      backgroundColor: "#F8FAFC",
    },
    qrImage: {
      width: 50,
      height: 50,
    },
    qrTextContainer: {
      flex: 1,
    },
    qrTitle: {
      fontSize: 8,
      fontWeight: "bold",
      color: primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    qrLabel: {
      fontSize: 7,
      color: "#64748B",
      marginTop: 2,
      lineHeight: 1.3,
    },
    totalsBox: {
      width: "45%",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 6,
      padding: 10,
    },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2,
      fontSize: 9.5,
    },
    totalsLabel: { color: "#475569" },
    totalsGrand: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
      paddingTop: 6,
      marginTop: 4,
      fontSize: 12,
      fontWeight: "bold",
      color: primary,
    },
    footer: {
      position: "absolute",
      bottom: 22,
      left: 32,
      right: 32,
      borderTopWidth: 1,
      borderTopColor: "#E2E8F0",
      paddingTop: 6,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 7.5,
      color: "#94A3B8",
    },
  });
}

function DetailRows({
  rows,
  styles,
}: {
  rows: TicketDetalleEntry[];
  styles: ReturnType<typeof buildStyles>;
}) {
  if (!rows.length) {
    return <Text style={{ color: "#94A3B8", fontSize: 9 }}>Sin registros asociados.</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.colName, styles.th]}>Detalle</Text>
        <Text style={[styles.colQty, styles.th]}>Cant.</Text>
        <Text style={[styles.colPrice, styles.th]}>Precio</Text>
        <Text style={[styles.colTotal, styles.th]}>Total</Text>
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.tableRow} wrap={false}>
          <Text style={styles.colName}>
            {row.producto?.nombre ?? "-"}
            {row.cubiertoGarantia ? " (cubierto por garantía)" : ""}
          </Text>
          <Text style={styles.colQty}>{row.cantidad}</Text>
          <Text style={styles.colPrice}>
            {row.cubiertoGarantia ? "S/ 0.00" : fmtMoney(row.precioUnitario)}
          </Text>
          <Text style={styles.colTotal}>
            {row.cubiertoGarantia ? "S/ 0.00" : fmtMoney(detalleTotal(row))}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface TicketSoportePDFProps {
  ticket: TicketDetalle;
  empresa?: ConfigEmpresaPayload | null;
  qrCodeUrl?: string;
}

export function TicketSoportePDF({
  ticket,
  empresa,
  qrCodeUrl,
}: TicketSoportePDFProps) {
  const primary = empresa?.colorPrimario || FALLBACK_PRIMARY;
  const secondary = empresa?.colorSecundario || FALLBACK_SECONDARY;
  const styles = buildStyles(primary, secondary);

  const logo = empresa?.logo ? getApiAssetUrl(empresa.logo) : null;
  const detalles = ticket.detalles ?? ticket.repuestos ?? [];
  const servicios = detalles.filter((row) => row.producto?.tipo === "SERVICIO");
  const repuestos = detalles.filter((row) => row.producto?.tipo !== "SERVICIO");

  // Prioritize calculated totals from row details if they sum > 0, otherwise fallback to database fields
  const calculatedManoObra = rowsTotal(servicios);
  const calculatedRepuestos = rowsTotal(repuestos);

  const manoObra = calculatedManoObra > 0 ? calculatedManoObra : Number(ticket.montoManoObra ?? 0);
  const repuestosTotal = calculatedRepuestos > 0 ? calculatedRepuestos : Number(ticket.montoRepuestos ?? 0);
  const total = (calculatedManoObra > 0 || calculatedRepuestos > 0)
    ? (manoObra + repuestosTotal)
    : Number(ticket.montoTotal ?? 0);
  const docName =
    empresa?.nombreComercial || empresa?.razonSocial || "Inventori ERP";

  // Support-oriented phone and email with fallback to general
  const soportePhone = empresa?.telefonoSoporte || empresa?.telefono;
  const soporteEmail = empresa?.emailSoporte || empresa?.email;
  const empresaWeb = empresa?.website;

  return (
    <Document
      title={`Ticket de Soporte ${ticket.codigo}`}
      author={docName}
      subject={`Resumen de servicio técnico ${ticket.codigo}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} />

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              {logo ? (
                <Image src={logo} style={styles.logoImg} />
              ) : (
                <Text style={styles.logoFallback}>
                  {docName.slice(0, 3).toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.brandTitle}>{docName}</Text>
              {empresa?.razonSocial && empresa?.nombreComercial && (
                <Text style={styles.brandSub}>{empresa.razonSocial}</Text>
              )}
              {empresa?.ruc && (
                <Text style={styles.brandMeta}>RUC {empresa.ruc}</Text>
              )}
              {empresa?.direccion && (
                <Text style={styles.brandMeta}>{empresa.direccion}</Text>
              )}
              {(soportePhone || soporteEmail) && (
                <Text style={styles.brandMeta}>
                  {[
                    soportePhone ? `Telf. Soporte: ${soportePhone}` : "",
                    soporteEmail ? `Email: ${soporteEmail}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
              {empresaWeb && (
                <Text style={styles.brandMeta}>{empresaWeb}</Text>
              )}
            </View>
          </View>

          <View style={styles.docBox}>
            <Text style={styles.docTitle}>ORDEN DE SERVICIO</Text>
            <Text style={styles.docNumber}>{ticket.codigo}</Text>
            <Text style={styles.docLine}>
              Estado: {ticket.estado.replace(/_/g, " ")}
            </Text>
            <Text style={styles.docLine}>
              Recepción: {fmtDateTime(ticket.fechaRecepcion)}
            </Text>
            {ticket.fechaCierre && (
              <Text style={styles.docLine}>
                Cierre: {fmtDateTime(ticket.fechaCierre)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cliente y Equipo</Text>
            <Text style={styles.cardName}>{clienteNombre(ticket)}</Text>
            <Text style={styles.cardLine}>Equipo: {equipoNombre(ticket)}</Text>
            {(ticket.cliente as any)?.direccion && (
              <Text style={styles.cardLine}>Dirección: {(ticket.cliente as any).direccion}</Text>
            )}
            {ticket.tipoServicio && (
              <Text style={styles.cardLine}>Servicio: {ticket.tipoServicio}</Text>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Técnico Asignado</Text>
            <Text style={styles.cardName}>
              {ticket.tecnico?.nombre
                ? `${ticket.tecnico.nombre} ${(ticket.tecnico as any).apellido ?? ""}`.trim()
                : "Sin asignar"}
            </Text>
            {(ticket.tecnico as any)?.email && (
              <Text style={styles.cardLine}>Email: {(ticket.tecnico as any).email}</Text>
            )}
            {ticket.fechaPromesa && (
              <Text style={styles.cardLine}>
                Fecha Promesa: {fmtDateTime(ticket.fechaPromesa)}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.card, { marginBottom: 14 }]}>
          <Text style={styles.cardTitle}>Problema y Solución</Text>
          <Text style={styles.cardName}>{ticket.titulo}</Text>
          <Text style={[styles.cardLine, styles.paragraph, { marginTop: 4 }]}>
            {ticket.descripcion}
          </Text>
          {ticket.fallaReportada ? (
            <Text style={[styles.cardLine, styles.paragraph, { marginTop: 4 }]}>
              Falla diagnosticada: {ticket.fallaReportada}
            </Text>
          ) : null}
          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
            }}
          >
            <Text style={[styles.cardTitle, { color: primary }]}>
              Solución Aplicada
            </Text>
            <Text style={[styles.cardLine, styles.paragraph]}>
              {ticket.solucion || "Diagnóstico y mantenimiento en proceso."}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Servicios Realizados</Text>
        <DetailRows rows={servicios} styles={styles} />

        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionTitle}>Repuestos Utilizados</Text>
          <DetailRows rows={repuestos} styles={styles} />
        </View>

        <View style={styles.totalsWrap}>
          {qrCodeUrl ? (
            <View style={styles.qrContainer}>
              <Image src={qrCodeUrl} style={styles.qrImage} />
              <View style={styles.qrTextContainer}>
                <Text style={styles.qrTitle}>Seguimiento en Línea</Text>
                <Text style={styles.qrLabel}>
                  Escanee el código QR para revisar el estado en tiempo real y detalles del servicio técnico desde nuestro portal público.
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ width: "50%" }} />
          )}

          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Mano de Obra</Text>
              <Text>{fmtMoney(manoObra)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Repuestos</Text>
              <Text>{fmtMoney(repuestosTotal)}</Text>
            </View>
            <View style={styles.totalsGrand}>
              <Text>TOTAL</Text>
              <Text>{fmtMoney(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {docName} — Gracias por confiar en nuestro servicio técnico oficial.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
