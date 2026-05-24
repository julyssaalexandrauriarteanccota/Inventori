import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  CondicionProducto,
  EstadoComercialEquipo,
  EstadoEquipo,
  TipoProducto,
  type EquipoListItem,
  type ProductoListItem,
} from "@erp/shared";

const TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.SERVICIO]: "Servicio",
  [TipoProducto.ACCESORIO]: "Accesorio",
};

const CONDICION_LABELS: Record<CondicionProducto, string> = {
  [CondicionProducto.NUEVO]: "Nuevo",
  [CondicionProducto.SEMINUEVO]: "Seminuevo",
  [CondicionProducto.USADO]: "Usado",
  [CondicionProducto.REACONDICIONADO]: "Reacondicionado",
  [CondicionProducto.RECUPERADO]: "Recuperado",
};

const ESTADO_EQUIPO_LABELS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]: "Activo",
  [EstadoEquipo.EN_REPARACION]: "En reparación",
  [EstadoEquipo.BAJA]: "Dado de baja",
};

const ESTADO_COMERCIAL_LABELS: Record<EstadoComercialEquipo, string> = {
  [EstadoComercialEquipo.DISPONIBLE]: "Disponible",
  [EstadoComercialEquipo.VENDIDO]: "Vendido",
  [EstadoComercialEquipo.ALQUILADO]: "Alquilado",
  [EstadoComercialEquipo.RESERVADO]: "Reservado",
  [EstadoComercialEquipo.EN_REPARACION]: "En reparación",
  [EstadoComercialEquipo.USO_INTERNO]: "Uso interno",
  [EstadoComercialEquipo.BAJA]: "Baja",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
  // ───── Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#4338ca",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 6,
    marginRight: 8,
  },
  brandText: { fontSize: 11, fontWeight: 700, color: "#0f172a" },
  brandSub: { fontSize: 8, color: "#64748b" },
  topRight: { alignItems: "flex-end" },
  docTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docSubtitle: { fontSize: 8, color: "#94a3b8", marginTop: 2 },

  // ───── Hero
  heroRow: { flexDirection: "row", alignItems: "stretch", marginBottom: 10 },
  heroImageBox: {
    width: 118,
    height: 118,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  heroImage: {
    width: 118,
    height: 118,
    objectFit: "contain",
  },
  heroImagePlaceholder: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  heroBody: { flex: 1, marginRight: 10 },
  heroTopLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#4338ca",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pillNeutral: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  pillNeutralText: { fontSize: 8, color: "#475569", fontWeight: 700 },
  productName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.2,
    marginBottom: 4,
  },
  skuLine: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "#1e293b",
    marginBottom: 8,
  },
  heroMetaRow: { flexDirection: "row", flexWrap: "wrap" },
  heroMetaCell: { width: "25%", marginBottom: 4, paddingRight: 6 },
  heroMetaLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  heroMetaValue: { fontSize: 9, color: "#0f172a" },
  heroCodesPanel: {
    width: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#ffffff",
    padding: 8,
  },
  heroCodeLabel: {
    fontSize: 6.5,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  heroBarcodeImg: {
    width: "100%",
    height: 36,
    objectFit: "contain",
  },
  heroCodeCaption: {
    fontSize: 7,
    fontFamily: "Courier",
    color: "#1e293b",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 6,
  },
  heroQrRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  heroQrImg: { width: 48, height: 48, marginRight: 6 },
  heroQrCaption: {
    flex: 1,
    fontSize: 6.5,
    fontFamily: "Courier",
    color: "#334155",
    lineHeight: 1.15,
  },
  heroCodeNoteText: {
    flex: 1,
    fontSize: 7,
    color: "#475569",
    lineHeight: 1.25,
  },
  heroQrBox: {
    width: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heroQrImgSmall: {
    width: 46,
    height: 46,
  },
  heroQrCaptionSmall: {
    fontSize: 6.5,
    fontFamily: "Courier",
    color: "#475569",
    textAlign: "center",
    marginTop: 3,
  },
  heroQrNoteText: {
    fontSize: 6.5,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  bottomBarcodeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginBottom: 6,
  },
  bottomBarcodeBox: {
    width: 170,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  bottomBarcodeImg: {
    width: "100%",
    height: 28,
    objectFit: "contain",
  },
  bottomBarcodeCaption: {
    fontSize: 7,
    fontFamily: "Courier",
    color: "#475569",
    textAlign: "center",
    marginTop: 2,
  },

  // ───── Section
  section: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 10,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4338ca",
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  gridRow: { flexDirection: "row", flexWrap: "wrap" },
  gridCellHalf: { width: "50%", marginBottom: 6, paddingRight: 6 },
  gridCellThird: { width: "33.33%", marginBottom: 6, paddingRight: 6 },
  fieldLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  fieldValue: { fontSize: 10, color: "#0f172a" },
  fieldValueMono: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "#0f172a",
  },

  // ───── Pills / chips
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  chipText: { fontSize: 8, color: "#334155", fontWeight: 700 },
  chipSuccess: { backgroundColor: "#dcfce7" },
  chipSuccessText: { color: "#166534" },
  chipWarn: { backgroundColor: "#fef3c7" },
  chipWarnText: { color: "#854d0e" },
  chipDanger: { backgroundColor: "#fee2e2" },
  chipDangerText: { color: "#991b1b" },

  // ───── Atributos table
  attrRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
  },
  attrRowAlt: { backgroundColor: "#f8fafc" },
  attrKey: {
    width: "40%",
    fontSize: 9,
    fontWeight: 700,
    color: "#475569",
    paddingHorizontal: 6,
  },
  attrVal: {
    width: "60%",
    fontSize: 9,
    color: "#0f172a",
    paddingHorizontal: 6,
  },
  // ───── Descripción
  descText: {
    fontSize: 10,
    color: "#1f2937",
    lineHeight: 1.4,
  },
  descContainer: {
    flexDirection: "column",
  },
  descHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  descSubheader: {
    fontSize: 10,
    fontWeight: 700,
    color: "#334155",
    marginTop: 6,
    marginBottom: 3,
  },
  descParagraph: {
    fontSize: 9.5,
    color: "#334155",
    lineHeight: 1.45,
    marginBottom: 4,
  },
  descBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
    paddingLeft: 4,
  },
  descBulletIndicator: {
    width: 12,
    fontSize: 9.5,
    color: "#4338ca",
    fontWeight: 700,
  },
  descBulletText: {
    flex: 1,
    fontSize: 9.5,
    color: "#334155",
    lineHeight: 1.45,
  },

  // ───── Footer
  footer: {
    position: "absolute",
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return `S/ ${Number(value).toFixed(2)}`;
}

function formatNumber(value: number | null | undefined, fractionDigits = 0) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(fractionDigits);
}

function formatDate(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatTiempoEstimado(min: number | null | undefined) {
  if (min === null || min === undefined || !Number.isFinite(Number(min))) return "—";
  const total = Math.max(0, Math.round(Number(min)));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function descriptionHtmlToLines(value: string) {
  if (!/<\/?[a-z][\s\S]*>/i.test(value)) return value.split(/\r?\n/);

  if (typeof document === "undefined") {
    return value
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|h2|h3|h4|blockquote|li)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<hr\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split(/\r?\n/);
  }

  const template = document.createElement("template");
  template.innerHTML = value;
  const lines: string[] = [];
  const pushText = (text: string, prefix = "") => {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized) lines.push(`${prefix}${normalized}`);
  };

  template.content.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? "");
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tagName = element.tagName;

    if (tagName === "UL" || tagName === "OL") {
      Array.from(element.children).forEach((child, index) => {
        pushText(
          child.textContent ?? "",
          tagName === "OL" ? `${index + 1}. ` : "- ",
        );
      });
      return;
    }

    if (tagName === "HR") {
      lines.push("");
      return;
    }

    pushText(element.textContent ?? "");
  });

  return lines;
}

function renderFormattedDescription(text: string) {
  if (!text) return null;

  const lines = descriptionHtmlToLines(text);
  const elements: React.ReactNode[] = [];

  // Helper to remove emojis that Helvetica font cannot render (prevents visual corruption)
  const cleanEmojis = (str: string) => {
    return str
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F9FF}]/gu, "")
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
      .trim();
  };

  // Helper to check if a line originally started with an emoji (to treat as heading)
  const originallyHadEmoji = (str: string) => {
    return /^[^\w\s]*([\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F9FF}]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF])/u.test(str);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedRaw = rawLine.trim();
    if (!trimmedRaw) {
      // Empty line acts as paragraph spacer
      elements.push(<View key={`space-${i}`} style={{ height: 6 }} />);
      continue;
    }

    const hasEmojiStart = originallyHadEmoji(trimmedRaw);
    const cleanedLine = cleanEmojis(trimmedRaw);
    if (!cleanedLine) continue;

    // Check for markdown headers
    const headerMatch = cleanedLine.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const headerText = headerMatch[2].trim();
      elements.push(
        <Text key={`header-${i}`} style={styles.descHeader}>
          {headerText}
        </Text>
      );
      continue;
    }

    // Treat as subheading if it ends with colon or originally started with an emoji icon and is short
    const isSubheading = (cleanedLine.endsWith(":") && cleanedLine.length < 50) || (hasEmojiStart && cleanedLine.length < 50);
    if (isSubheading) {
      // Remove trailing colon for headings if we want a cleaner look
      const headingText = cleanedLine.endsWith(":") ? cleanedLine.slice(0, -1).trim() : cleanedLine;
      elements.push(
        <Text key={`subheader-${i}`} style={styles.descSubheader}>
          {headingText}
        </Text>
      );
      continue;
    }

    // Check list matches
    const bulletMatch = cleanedLine.match(/^([-\*•\+])\s*(.*)$/);
    const numberMatch = cleanedLine.match(/^(\d+[\.\)])\s*(.*)$/);

    if (bulletMatch) {
      const content = bulletMatch[2].trim();
      const inlineBoldMatch = content.match(/^([^:]+):\s*(.*)$/);

      if (inlineBoldMatch && inlineBoldMatch[1].length < 35 && inlineBoldMatch[2].length > 0) {
        const boldPart = inlineBoldMatch[1].trim();
        const normalPart = inlineBoldMatch[2].trim();
        elements.push(
          <View key={`bullet-${i}`} style={styles.descBulletRow}>
            <Text style={styles.descBulletIndicator}>•</Text>
            <Text style={styles.descBulletText}>
              <Text style={{ fontWeight: 700 }}>{boldPart}:</Text> {normalPart}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View key={`bullet-${i}`} style={styles.descBulletRow}>
            <Text style={styles.descBulletIndicator}>•</Text>
            <Text style={styles.descBulletText}>{content}</Text>
          </View>
        );
      }
    } else if (numberMatch) {
      const numPrefix = numberMatch[1];
      const content = numberMatch[2].trim();
      const inlineBoldMatch = content.match(/^([^:]+):\s*(.*)$/);

      if (inlineBoldMatch && inlineBoldMatch[1].length < 35 && inlineBoldMatch[2].length > 0) {
        const boldPart = inlineBoldMatch[1].trim();
        const normalPart = inlineBoldMatch[2].trim();
        elements.push(
          <View key={`num-${i}`} style={styles.descBulletRow}>
            <Text style={styles.descBulletIndicator}>{numPrefix}</Text>
            <Text style={styles.descBulletText}>
              <Text style={{ fontWeight: 700 }}>{boldPart}:</Text> {normalPart}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View key={`num-${i}`} style={styles.descBulletRow}>
            <Text style={styles.descBulletIndicator}>{numPrefix}</Text>
            <Text style={styles.descBulletText}>{content}</Text>
          </View>
        );
      }
    } else {
      // Normal paragraph line. Check for colon-bold pattern
      const inlineBoldMatch = cleanedLine.match(/^([^:]+):\s*(.*)$/);
      if (inlineBoldMatch && inlineBoldMatch[1].length < 35 && inlineBoldMatch[2].length > 0) {
        const boldPart = inlineBoldMatch[1].trim();
        const normalPart = inlineBoldMatch[2].trim();
        elements.push(
          <Text key={`para-bold-${i}`} style={styles.descParagraph}>
            <Text style={{ fontWeight: 700 }}>{boldPart}:</Text> {normalPart}
          </Text>
        );
      } else {
        elements.push(
          <Text key={`para-${i}`} style={styles.descParagraph}>
            {cleanedLine}
          </Text>
        );
      }
    }
  }

  return <View style={styles.descContainer}>{elements}</View>;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={mono ? styles.fieldValueMono : styles.fieldValue}>{value}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export type EtiquetaProductoPdfDocumentProps = {
  producto: ProductoListItem;
  barcodeValue: string;
  qrValue?: string | null;
  barcodeDataUrl: string;
  qrDataUrl?: string | null;
  imageDataUrl?: string | null;
  empresa?: { nombre?: string | null; ruc?: string | null } | null;
  /**
   * Si se pasa un equipo, la etiqueta se enriquece con la información de la
   * unidad física (serie, QR físico, ubicación, cliente, contadores, etc.).
   */
  equipo?: EquipoListItem | null;
  /**
   * Última lectura SNMP (manual o automática) del equipo. Si se pasa, la PDF
   * muestra una sección con páginas, niveles de tóner, fusor y errores.
   */
  ultimaLectura?: {
    timestamp?: string | null;
    paginasTotales?: number | null;
    nivelTonerNegro?: number | null;
    nivelTonerCian?: number | null;
    nivelTonerMagenta?: number | null;
    nivelTonerAmarillo?: number | null;
    estadoFusor?: string | null;
    erroresActivos?: string[] | null;
  } | null;
};

export function EtiquetaProductoPdfDocument({
  producto,
  barcodeValue,
  qrValue,
  barcodeDataUrl,
  qrDataUrl,
  imageDataUrl,
  empresa,
  equipo,
  ultimaLectura,
}: EtiquetaProductoPdfDocumentProps) {
  const tipo = producto.tipo;
  const isServicio = tipo === TipoProducto.SERVICIO;
  const isEquipoLike = tipo === TipoProducto.EQUIPO || producto.tieneNumeroSerie;
  const isStockable = !isServicio && producto.manejaInventario;
  const modeloNombre = producto.modeloCatalogo?.nombre ?? producto.modelo ?? null;
  const unidadLabel = producto.unidadMedida
    ? `${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`
    : "—";
  const qrCaption = equipo?.codigoQr ?? qrValue ?? null;
  const hasQrImage = Boolean(qrDataUrl && qrCaption);

  const atributos = producto.atributos
    ? Object.entries(producto.atributos).filter(
        ([, v]) => v !== null && v !== undefined && String(v).trim() !== "",
      )
    : [];

  const empresaNombre = empresa?.nombre?.trim() || "Inventori ERP";
  const brandInitial = empresaNombre.charAt(0).toUpperCase();

  const docTitle = equipo
    ? `Etiqueta de equipo · ${equipo.numeroSerie}`
    : `Etiqueta de ${TIPO_LABELS[tipo].toLowerCase()}`;

  return (
    <Document
      title={`Etiqueta ${producto.sku}${equipo ? ` · ${equipo.numeroSerie}` : ""}`}
      author={empresaNombre}
      subject="Etiqueta / hoja técnica"
    >
      <Page size="A4" style={styles.page}>
        {/* ─── Top bar */}
        <View style={styles.topBar} fixed>
          <View style={styles.brandBlock}>
            <Text style={styles.brandMark}>{brandInitial}</Text>
            <View>
              <Text style={styles.brandText}>{empresaNombre}</Text>
              {empresa?.ruc ? (
                <Text style={styles.brandSub}>RUC {empresa.ruc}</Text>
              ) : (
                <Text style={styles.brandSub}>Hoja técnica de catálogo</Text>
              )}
            </View>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.docTitle}>{docTitle}</Text>
            <Text style={styles.docSubtitle}>
              Generado el {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* ─── Hero */}
        <View style={styles.heroRow}>
          <View style={styles.heroImageBox}>
            {imageDataUrl ? (
              <Image src={imageDataUrl} style={styles.heroImage} />
            ) : (
              <Text style={styles.heroImagePlaceholder}>Sin imagen</Text>
            )}
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroTopLine}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{TIPO_LABELS[tipo]}</Text>
              </View>
              {producto.condicion ? (
                <View style={styles.pillNeutral}>
                  <Text style={styles.pillNeutralText}>
                    {CONDICION_LABELS[producto.condicion]}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.productName}>{producto.nombre}</Text>
            <Text style={styles.skuLine}>
              SKU {producto.sku}
              {modeloNombre ? `   ·   Modelo ${modeloNombre}` : ""}
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaCell}>
                <Text style={styles.heroMetaLabel}>Marca</Text>
                <Text style={styles.heroMetaValue}>
                  {producto.marca?.nombre ?? "—"}
                </Text>
              </View>
              <View style={styles.heroMetaCell}>
                <Text style={styles.heroMetaLabel}>Unidad</Text>
                <Text style={styles.heroMetaValue}>{unidadLabel}</Text>
              </View>
              <View style={styles.heroMetaCell}>
                <Text style={styles.heroMetaLabel}>Precio venta</Text>
                <Text style={styles.heroMetaValue}>
                  {formatCurrency(producto.precioVenta)}
                </Text>
              </View>
              <View style={styles.heroMetaCell}>
                <Text style={styles.heroMetaLabel}>
                  {isServicio ? "Duración" : "Stock"}
                </Text>
                <Text style={styles.heroMetaValue}>
                  {isServicio
                    ? formatTiempoEstimado(producto.tiempoEstimadoMin)
                    : isStockable
                      ? `${formatNumber(producto.stockActual)} ${producto.unidadMedida?.codigo ?? ""}`.trim()
                      : "—"}
                </Text>
              </View>
            </View>
          </View>

          {hasQrImage ? (
            <View style={styles.heroQrBox}>
              <Text style={styles.heroCodeLabel}>QR</Text>
              <Image src={qrDataUrl as string} style={styles.heroQrImgSmall} />
              <Text style={styles.heroQrCaptionSmall}>
                {qrCaption}
              </Text>
            </View>
          ) : (
            <View style={styles.heroQrBox}>
              <Text style={styles.heroCodeLabel}>QR</Text>
              <Text style={styles.heroQrNoteText}>
                {isEquipoLike ? "QR físico\nequipos" : "Sin QR"}
              </Text>
            </View>
          )}
        </View>

        {/* ─── Equipo (si aplica) */}
        {equipo ? (
          <Section title="Unidad física (equipo)">
            <View style={styles.gridRow}>
              <View style={styles.gridCellThird}>
                <Field label="N° de serie" value={equipo.numeroSerie} mono />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Estado operativo"
                  value={ESTADO_EQUIPO_LABELS[equipo.estado] ?? "—"}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Estado comercial"
                  value={
                    ESTADO_COMERCIAL_LABELS[equipo.estadoComercial] ?? "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Almacén"
                  value={equipo.almacen?.nombre ?? "—"}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Ubicación"
                  value={equipo.ubicacion ?? "—"}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Procedencia"
                  value={equipo.procedencia ?? "—"}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Fecha de ingreso"
                  value={formatDate(equipo.fechaIngreso)}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field label="Firmware" value={equipo.firmware ?? "—"} />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Cliente actual"
                  value={
                    equipo.clienteActual
                      ? equipo.clienteActual.razonSocial ??
                        ([equipo.clienteActual.nombre, equipo.clienteActual.apellido]
                          .filter(Boolean)
                          .join(" ") ||
                          "—")
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="QR físico"
                  value={equipo.codigoQr ?? "—"}
                  mono
                />
              </View>
            </View>
            {equipo.observacionEstado ? (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.fieldLabel}>Observación de estado</Text>
                <Text style={styles.descText}>{equipo.observacionEstado}</Text>
              </View>
            ) : null}
            {equipo.notas ? (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.fieldLabel}>Notas</Text>
                <Text style={styles.descText}>{equipo.notas}</Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {/* ─── Contadores (si aplica) */}
        {equipo ? (
          <Section title="Contadores e inventario">
            <View style={styles.gridRow}>
              <View style={styles.gridCellThird}>
                <Field
                  label="Contador inicial"
                  value={formatNumber(equipo.contadorInicial)}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Contador actual"
                  value={formatNumber(equipo.contadorActual)}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Diferencia"
                  value={
                    equipo.contadorInicial != null &&
                    equipo.contadorActual != null
                      ? formatNumber(
                          (equipo.contadorActual ?? 0) -
                            (equipo.contadorInicial ?? 0),
                        )
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Unidad medida"
                  value={unidadLabel}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Aporta al stock"
                  value={producto.manejaInventario ? "Sí" : "No"}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Stock actual del producto"
                  value={
                    producto.stockActual != null
                      ? `${formatNumber(producto.stockActual)} ${producto.unidadMedida?.codigo ?? ""}`.trim()
                      : "—"
                  }
                />
              </View>
            </View>
          </Section>
        ) : null}

        {/* ─── Última lectura SNMP (si aplica) */}
        {equipo && ultimaLectura ? (
          <Section title="Última lectura SNMP">
            <View style={styles.gridRow}>
              <View style={styles.gridCellThird}>
                <Field
                  label="Fecha"
                  value={
                    ultimaLectura.timestamp
                      ? formatDate(ultimaLectura.timestamp)
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Páginas totales"
                  value={
                    ultimaLectura.paginasTotales != null
                      ? formatNumber(ultimaLectura.paginasTotales)
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Estado fusor"
                  value={ultimaLectura.estadoFusor ?? "—"}
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Tóner negro"
                  value={
                    ultimaLectura.nivelTonerNegro != null
                      ? `${ultimaLectura.nivelTonerNegro}%`
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Tóner cian"
                  value={
                    ultimaLectura.nivelTonerCian != null
                      ? `${ultimaLectura.nivelTonerCian}%`
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Tóner magenta"
                  value={
                    ultimaLectura.nivelTonerMagenta != null
                      ? `${ultimaLectura.nivelTonerMagenta}%`
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Tóner amarillo"
                  value={
                    ultimaLectura.nivelTonerAmarillo != null
                      ? `${ultimaLectura.nivelTonerAmarillo}%`
                      : "—"
                  }
                />
              </View>
            </View>
            {ultimaLectura.erroresActivos &&
            ultimaLectura.erroresActivos.length > 0 ? (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.fieldLabel}>Errores activos</Text>
                <Text style={styles.descText}>
                  {ultimaLectura.erroresActivos.join(" · ")}
                </Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {/* ─── Clasificación */}
        <Section title="Clasificación">
          <View style={styles.gridRow}>
            <View style={styles.gridCellThird}>
              <Field
                label="Categoría"
                value={producto.categoria?.padre?.nombre ?? producto.categoria?.nombre ?? "—"}
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Subcategoría"
                value={producto.categoria?.padre ? producto.categoria.nombre : "—"}
              />
            </View>
          </View>
        </Section>

        {/* ─── Atributos */}
        {atributos.length > 0 ? (
          <Section title="Atributos / especificaciones">
            <View>
              {atributos.map(([key, value], idx) => (
                <View
                  key={key}
                  style={
                    idx % 2 === 1
                      ? [styles.attrRow, styles.attrRowAlt]
                      : styles.attrRow
                  }
                >
                  <Text style={styles.attrKey}>{key}</Text>
                  <Text style={styles.attrVal}>{String(value)}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* ─── Descripción */}
        {producto.descripcion?.trim() ? (
          <Section title="Descripción">
            {renderFormattedDescription(producto.descripcion)}
          </Section>
        ) : null}

        {/* ─── Código de barras al final en una esquina */}
        <View style={styles.bottomBarcodeRow} wrap={false}>
          <View style={styles.bottomBarcodeBox}>
            <Text style={styles.heroCodeLabel}>Código de barras</Text>
            <Image src={barcodeDataUrl} style={styles.bottomBarcodeImg} />
            <Text style={styles.bottomBarcodeCaption}>{barcodeValue}</Text>
          </View>
        </View>

        {/* ─── Footer */}
        <View style={styles.footer} fixed>
          <Text>{empresaNombre} · Hoja técnica generada por Inventori</Text>
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
