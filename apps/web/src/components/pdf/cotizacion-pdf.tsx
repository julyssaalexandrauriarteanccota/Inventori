"use client";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ConfigEmpresaPayload } from "@erp/shared";
import { getApiAssetUrl } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
export interface CotizacionPdfDetalle {
  id: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  equipoSerie?: string | null;
  producto?: {
    id: string;
    sku: string;
    nombre: string;
    descripcion?: string | null;
    imagen?: string | null;
    mesesGarantia?: number | null;
    garantiaMaxCopias?: number | null;
    marca?: { nombre: string } | null;
    modeloCatalogo?: { nombre: string } | null;
    atributos?: any | null;
  } | null;
}

export interface CotizacionPdfData {
  numero: string;
  createdAt?: string | null;
  validoHasta?: string | null;
  notas?: string | null;
  subtotal: number;
  descuento: number;
  igv: number;
  total: number;
  cliente: {
    nombre?: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
    ruc?: string | null;
    dni?: string | null;
    email?: string | null;
    telefono?: string | null;
    celular?: string | null;
    direccion?: string | null;
    distrito?: string | null;
    provincia?: string | null;
    departamento?: string | null;
  };
  usuario?: {
    nombre: string;
    apellido?: string | null;
    email?: string | null;
  } | null;
  detalles: CotizacionPdfDetalle[];
}

// ── Constants ────────────────────────────────────────────────────────────────
const FALLBACK_PRIMARY = "#EA580C";
const FALLBACK_SECONDARY = "#0F172A";
const PLACEHOLDER_PRODUCT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
       <rect width='64' height='64' rx='8' fill='#F1F5F9'/>
       <path d='M16 44l10-12 8 9 6-7 8 10' stroke='#94A3B8' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/>
       <circle cx='24' cy='22' r='4' fill='#94A3B8'/>
     </svg>`,
  );

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(v: number) {
  return `S/ ${Number(v ?? 0).toFixed(2)}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAtributos(atributos: any): Array<{ clave: string; valor: string }> {
  if (!atributos) return [];
  if (Array.isArray(atributos)) return atributos;
  if (typeof atributos === "string") {
    try {
      const parsed = JSON.parse(atributos);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function getClienteNombre(c: CotizacionPdfData["cliente"]) {
  if (c.razonSocial) return c.razonSocial;
  return [c.nombre, c.apellido].filter(Boolean).join(" ") || "—";
}

function getClienteDocumento(c: CotizacionPdfData["cliente"]) {
  if (c.ruc) return `RUC ${c.ruc}`;
  if (c.dni) return `DNI ${c.dni}`;
  return null;
}

function getClienteUbicacion(c: CotizacionPdfData["cliente"]) {
  return (
    [c.distrito, c.provincia, c.departamento]
      .filter(Boolean)
      .join(", ") ||
    c.direccion ||
    null
  );
}

function uniqueText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    const cleaned = value?.trim();
    if (!cleaned) return false;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  // Relative path — convert to absolute using current origin.
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
    docBadge: {
      backgroundColor: primary,
      color: "#FFFFFF",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      fontSize: 11,
      fontWeight: "bold",
      letterSpacing: 1.2,
    },
    docNumber: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "bold",
      color: secondary,
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
    productSection: {
      marginTop: 14,
      marginBottom: 14,
    },
    equipmentMainCard: {
      flexDirection: "row",
      gap: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 14,
      backgroundColor: "#FAFAFA",
      marginBottom: 14,
    },
    equipmentImgBox: {
      width: 100,
      height: 100,
      backgroundColor: "#FFFFFF",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    equipmentImg: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
    },
    equipmentInfo: {
      flex: 1,
      justifyContent: "center",
    },
    equipmentName: {
      fontSize: 12,
      fontWeight: "bold",
      color: secondary,
      marginBottom: 6,
    },
    equipmentMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
    },
    equipmentBadge: {
      backgroundColor: "#F1F5F9",
      color: "#475569",
      fontSize: 7.5,
      fontWeight: "bold",
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    equipmentPriceRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      fontSize: 8.5,
    },
    equipmentPriceLabel: {
      color: "#475569",
      marginRight: 4,
    },
    equipmentPriceValue: {
      fontWeight: "bold",
      color: primary,
    },
    descBlock: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 12,
      backgroundColor: "#FFFFFF",
    },
    descTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    descTitle: {
      fontSize: 9.5,
      fontWeight: "bold",
      color: primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    descText: {
      fontSize: 8.5,
      color: "#334155",
      lineHeight: 1.4,
    },
    specsBlock: {
      marginTop: 12,
    },
    specsTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    specsTitle: {
      fontSize: 9.5,
      fontWeight: "bold",
      color: primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    specsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    specCard: {
      width: "48%",
      marginBottom: 8,
    },
    specLabel: {
      fontSize: 8,
      fontWeight: "bold",
      color: "#475569",
      marginBottom: 3,
    },
    specValueBox: {
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: "#FFFFFF",
      fontSize: 8.5,
      color: "#0F172A",
    },
    productName: { fontWeight: "bold", color: secondary, fontSize: 9.5 },
    productMeta: { fontSize: 8, color: "#64748B", marginTop: 1 },
    productDesc: {
      fontSize: 8.5,
      color: "#334155",
      marginTop: 4,
      lineHeight: 1.4,
    },
    attributesContainer: {
      marginTop: 6,
      borderLeftWidth: 1.5,
      borderLeftColor: primary,
      paddingLeft: 6,
      gap: 2,
    },
    attributeRow: {
      flexDirection: "row",
      alignItems: "center",
      fontSize: 7.5,
      color: "#475569",
    },
    attributeKey: {
      fontWeight: "bold",
      color: secondary,
      marginRight: 3,
    },
    attributeValue: {
      color: "#475569",
    },
    totalsWrap: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
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
    notesBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 6,
      padding: 10,
      backgroundColor: "#FFFBEB",
    },
    notesTitle: {
      fontSize: 8.5,
      fontWeight: "bold",
      color: "#92400E",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 3,
    },
    notesText: { fontSize: 9, color: "#3F3F46", lineHeight: 1.4 },
    conditionsTitle: {
      marginTop: 14,
      fontSize: 9,
      fontWeight: "bold",
      color: secondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    conditionItem: {
      fontSize: 8.5,
      color: "#475569",
      marginBottom: 2,
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

// ── Component ────────────────────────────────────────────────────────────────
interface CotizacionPDFProps {
  data: CotizacionPdfData;
  empresa: ConfigEmpresaPayload;
  igvPercent?: number; // default 18
}

export function CotizacionPDF({
  data,
  empresa,
  igvPercent = 18,
}: CotizacionPDFProps) {
  const primary = empresa.colorPrimario || FALLBACK_PRIMARY;
  const secondary = empresa.colorSecundario || FALLBACK_SECONDARY;
  const styles = buildStyles(primary, secondary);

  const logo = empresa.logo ? getApiAssetUrl(empresa.logo) : null;
  const empresaContacto = uniqueText([
    empresa.telefonoVentas,
    empresa.whatsapp,
    empresa.telefono,
  ]).join(" · ");
  const empresaEmail = empresa.emailVentas || empresa.email;
  const empresaWeb = empresa.website;

  const docName = empresa.nombreComercial || empresa.razonSocial || "Empresa";
  const clienteNombre = getClienteNombre(data.cliente);
  const clienteDoc = getClienteDocumento(data.cliente);
  const clienteUbicacion = getClienteUbicacion(data.cliente);
  const clienteContacto = uniqueText([
    data.cliente.celular,
    data.cliente.telefono,
  ]).join(" · ");

  const vendedor = data.usuario
    ? `${data.usuario.nombre} ${data.usuario.apellido ?? ""}`.trim()
    : null;

  return (
    <Document
      title={`Cotización ${data.numero}`}
      author={docName}
      subject={`Cotización para ${clienteNombre}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} />

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              {logo ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={logo} style={styles.logoImg} />
              ) : (
                <Text style={styles.logoFallback}>
                  {(empresa.nombreComercial || empresa.razonSocial || "ERP")
                    .slice(0, 3)
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.brandTitle}>{docName}</Text>
              {empresa.razonSocial && empresa.nombreComercial && (
                <Text style={styles.brandSub}>{empresa.razonSocial}</Text>
              )}
              {empresa.ruc && (
                <Text style={styles.brandMeta}>RUC {empresa.ruc}</Text>
              )}
              {empresa.direccion && (
                <Text style={styles.brandMeta}>{empresa.direccion}</Text>
              )}
              {(empresaContacto || empresaEmail) && (
                <Text style={styles.brandMeta}>
                  {[empresaContacto, empresaEmail]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
              {empresaWeb && (
                <Text style={styles.brandMeta}>{empresaWeb}</Text>
              )}
            </View>
          </View>

          <View style={styles.docMeta}>
            <Text style={styles.docBadge}>COTIZACIÓN</Text>
            <Text style={styles.docNumber}>N° {data.numero}</Text>
            <Text style={styles.docLine}>
              Emitida: {fmtDate(data.createdAt)}
            </Text>
            {data.validoHasta ? (
              <Text style={styles.docLine}>
                Válida hasta: {fmtDate(data.validoHasta)}
              </Text>
            ) : null}
            {vendedor && (
              <Text style={styles.docLine}>Atendido por: {vendedor}</Text>
            )}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cliente</Text>
            <Text style={styles.cardName}>{clienteNombre}</Text>
            {clienteDoc && (
              <Text style={styles.cardLine}>{clienteDoc}</Text>
            )}
            {data.cliente.direccion && (
              <Text style={styles.cardLine}>{data.cliente.direccion}</Text>
            )}
            {clienteUbicacion && data.cliente.direccion !== clienteUbicacion && (
              <Text style={styles.cardLine}>{clienteUbicacion}</Text>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contacto</Text>
            {data.cliente.email ? (
              <Text style={styles.cardLine}>Email: {data.cliente.email}</Text>
            ) : null}
            {clienteContacto ? (
              <Text style={styles.cardLine}>Tel.: {clienteContacto}</Text>
            ) : null}
            {!data.cliente.email && !clienteContacto && (
              <Text style={styles.cardLine}>Sin datos de contacto</Text>
            )}
          </View>
        </View>

        {(() => {
          const item = data.detalles[0];
          if (!item) return null;
          
          const productoImg = item.producto?.imagen ? getApiAssetUrl(item.producto.imagen) : PLACEHOLDER_PRODUCT;
          const meta: string[] = [];
          if (item.producto?.sku) meta.push(`SKU ${item.producto.sku}`);
          if (item.producto?.marca?.nombre) meta.push(item.producto.marca.nombre);
          if (item.producto?.modeloCatalogo?.nombre) meta.push(item.producto.modeloCatalogo.nombre);
          if (item.equipoSerie) meta.push(`Serie ${item.equipoSerie}`);
          if (item.producto?.mesesGarantia) meta.push(`Garantía ${item.producto.mesesGarantia} m.`);
          if (item.producto?.garantiaMaxCopias) {
            meta.push(`${item.producto.garantiaMaxCopias.toLocaleString("es-PE")} copias`);
          }

          const attrs = parseAtributos(item.producto?.atributos);

          return (
            <View style={styles.productSection}>
              <Text style={styles.sectionTitle}>Equipo Cotizado</Text>

              <View style={styles.equipmentMainCard}>
                {productoImg && (
                  <View style={styles.equipmentImgBox}>
                    <Image src={productoImg} style={styles.equipmentImg} />
                  </View>
                )}
                <View style={styles.equipmentInfo}>
                  <Text style={styles.equipmentName}>
                    {item.producto?.nombre || "Producto Cotizado"}
                  </Text>
                  
                  {meta.length > 0 && (
                    <View style={styles.equipmentMetaRow}>
                      {meta.map((m, mIdx) => (
                        <Text key={mIdx} style={styles.equipmentBadge}>{m}</Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.equipmentPriceRow}>
                    <Text style={styles.equipmentPriceLabel}>Precio Unitario:</Text>
                    <Text style={styles.equipmentPriceValue}>{fmtMoney(item.precioUnitario)}</Text>
                  </View>
                  {item.descuento > 0 && (
                    <View style={styles.equipmentPriceRow}>
                      <Text style={styles.equipmentPriceLabel}>Descuento Aplicado:</Text>
                      <Text style={[styles.equipmentPriceValue, { color: "#DC2626" }]}>-{fmtMoney(item.descuento)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {item.producto?.descripcion && (
                <View style={styles.descBlock}>
                  <View style={styles.descTitleRow}>
                    <Text style={styles.descTitle}>Descripción Comercial</Text>
                  </View>
                  <Text style={styles.descText}>
                    {stripHtml(item.producto.descripcion)}
                  </Text>
                </View>
              )}

              {attrs.length > 0 && (
                <View style={styles.specsBlock}>
                  <View style={styles.specsTitleRow}>
                    <Text style={styles.specsTitle}>Ficha Técnica</Text>
                  </View>
                  <View style={styles.specsGrid}>
                    {attrs.map((attr, aIdx) => (
                      <View key={aIdx} style={styles.specCard}>
                        <Text style={styles.specLabel}>{attr.clave}</Text>
                        <View style={styles.specValueBox}>
                          <Text style={{ fontSize: 8.5 }}>{attr.valor}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text>{fmtMoney(data.subtotal)}</Text>
            </View>
            {data.descuento > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descuento</Text>
                <Text>-{fmtMoney(data.descuento)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGV ({igvPercent}%)</Text>
              <Text>{fmtMoney(data.igv)}</Text>
            </View>
            <View style={styles.totalsGrand}>
              <Text>TOTAL</Text>
              <Text>{fmtMoney(data.total)}</Text>
            </View>
          </View>
        </View>

        {data.notas?.trim() ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Observaciones</Text>
            <Text style={styles.notesText}>{data.notas.trim()}</Text>
          </View>
        ) : null}

        <Text style={styles.conditionsTitle}>Condiciones</Text>
        <Text style={styles.conditionItem}>
          • Precios expresados en soles (S/), incluyen IGV ({igvPercent}%).
        </Text>
        <Text style={styles.conditionItem}>
          {data.validoHasta
            ? `• Cotización válida hasta ${fmtDate(data.validoHasta)}; sujeta a disponibilidad de stock.`
            : "• Cotización sujeta a disponibilidad de stock al momento de la compra."}
        </Text>
        <Text style={styles.conditionItem}>
          • La garantía aplica desde la entrega del equipo, por los meses o
          número de copias indicado, lo que ocurra primero.
        </Text>
        <Text style={styles.conditionItem}>
          • Para confirmar el pedido responda este documento o contáctenos por
          los medios oficiales.
        </Text>

        <View style={styles.footer} fixed>
          <Text>
            {docName}
            {empresa.slogan ? ` — ${empresa.slogan}` : ""}
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
