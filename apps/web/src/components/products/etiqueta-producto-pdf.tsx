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
  heroRow: { flexDirection: "row", marginBottom: 12 },
  heroImageBox: {
    width: 140,
    height: 140,
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
    width: 140,
    height: 140,
    objectFit: "contain",
  },
  heroImagePlaceholder: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  heroBody: { flex: 1 },
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
    fontSize: 18,
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
  heroMetaCell: { width: "50%", marginBottom: 4, paddingRight: 6 },
  heroMetaLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  heroMetaValue: { fontSize: 9, color: "#0f172a" },

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
  emptyHint: { fontSize: 9, color: "#94a3b8", fontStyle: "italic" },

  // ───── Descripción
  descText: {
    fontSize: 10,
    color: "#1f2937",
    lineHeight: 1.4,
  },

  // ───── Códigos
  codesRow: { flexDirection: "row" },
  codeCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 10,
  },
  codeCardSpacer: { marginRight: 10 },
  codeLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  barcodeImg: { width: "100%", height: 64, objectFit: "contain" },
  qrImg: { width: 90, height: 90, alignSelf: "center" },
  codeCaption: {
    fontSize: 9,
    fontFamily: "Courier",
    color: "#1e293b",
    textAlign: "center",
    marginTop: 4,
  },
  codeNoteText: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.35,
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

  const stockBelow =
    isStockable && producto.stockActual <= producto.stockMinimo;
  const stockHealthy = isStockable && !stockBelow;

  const atributos = producto.atributos
    ? Object.entries(producto.atributos).filter(
        ([, v]) => v !== null && v !== undefined && String(v).trim() !== "",
      )
    : [];

  const empresaNombre = empresa?.nombre?.trim() || "Inventori ERP";
  const brandInitial = empresaNombre.charAt(0).toUpperCase();

  const flagChips: { label: string; tone?: "success" | "warn" | "danger" }[] = [];
  if (producto.manejaInventario && !isServicio)
    flagChips.push({ label: "Maneja inventario", tone: "success" });
  if (producto.tieneNumeroSerie)
    flagChips.push({ label: "Serializado", tone: "warn" });
  if (producto.esConsumible) flagChips.push({ label: "Consumible" });
  if (producto.requiereRepuestos)
    flagChips.push({ label: "Requiere repuestos" });
  if (isServicio) flagChips.push({ label: "Servicio (no inventario)" });
  if (!producto.activo) flagChips.push({ label: "Inactivo", tone: "danger" });

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
              {producto.categoria?.nombre ? (
                <View style={styles.pillNeutral}>
                  <Text style={styles.pillNeutralText}>
                    {producto.categoria.nombre}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.productName}>{producto.nombre}</Text>
            <Text style={styles.skuLine}>
              SKU {producto.sku}
              {producto.modelo ? `   ·   Modelo ${producto.modelo}` : ""}
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
                <Text style={styles.heroMetaValue}>
                  {producto.unidadMedida
                    ? `${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`
                    : "—"}
                </Text>
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
                  value={
                    producto.unidadMedida
                      ? `${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`
                      : "—"
                  }
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

        {/* ─── Identificación */}
        <Section title="Identificación">
          <View style={styles.gridRow}>
            <View style={styles.gridCellThird}>
              <Field label="SKU" value={producto.sku} mono />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Código de barras"
                value={producto.codigoBarras ?? barcodeValue}
                mono
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Código QR"
                value={
                  isEquipoLike
                    ? "Por unidad física"
                    : producto.codigoQr ?? qrValue ?? "—"
                }
                mono
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field label="Tipo" value={TIPO_LABELS[tipo]} />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Categoría"
                value={producto.categoria?.nombre ?? "—"}
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Marca"
                value={producto.marca?.nombre ?? "—"}
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Modelo"
                value={
                  producto.modeloCatalogo?.nombre ?? producto.modelo ?? "—"
                }
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Condición"
                value={
                  producto.condicion
                    ? CONDICION_LABELS[producto.condicion]
                    : "—"
                }
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Unidad de medida"
                value={
                  producto.unidadMedida
                    ? `${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`
                    : "—"
                }
              />
            </View>
          </View>
        </Section>

        {/* ─── Comercial */}
        <Section title="Información comercial">
          <View style={styles.gridRow}>
            <View style={styles.gridCellThird}>
              <Field
                label="Precio de venta"
                value={formatCurrency(producto.precioVenta)}
              />
            </View>
            <View style={styles.gridCellThird}>
              <Field
                label="Estado del catálogo"
                value={producto.activo ? "Activo" : "Inactivo"}
              />
            </View>
            {isServicio ? (
              <View style={styles.gridCellThird}>
                <Field
                  label="Duración estimada"
                  value={formatTiempoEstimado(producto.tiempoEstimadoMin)}
                />
              </View>
            ) : null}
          </View>
        </Section>

        {/* ─── Inventario / servicio */}
        {isServicio ? null : (
          <Section title="Inventario">
            <View style={styles.gridRow}>
              <View style={styles.gridCellThird}>
                <Field
                  label="Stock actual"
                  value={
                    isStockable
                      ? `${formatNumber(producto.stockActual)} ${producto.unidadMedida?.codigo ?? ""}`.trim()
                      : "No aplica"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Stock mínimo"
                  value={
                    isStockable
                      ? `${formatNumber(producto.stockMinimo)} ${producto.unidadMedida?.codigo ?? ""}`.trim()
                      : "—"
                  }
                />
              </View>
              <View style={styles.gridCellThird}>
                <Field
                  label="Estado de stock"
                  value={
                    !isStockable
                      ? "—"
                      : stockBelow
                        ? "Bajo o agotado"
                        : "Saludable"
                  }
                />
              </View>
            </View>
            <View style={[styles.chipRow, { marginTop: 6 }]}>
              {flagChips.map((chip, idx) => {
                const toneStyle =
                  chip.tone === "success"
                    ? styles.chipSuccess
                    : chip.tone === "warn"
                      ? styles.chipWarn
                      : chip.tone === "danger"
                        ? styles.chipDanger
                        : null;
                const toneText =
                  chip.tone === "success"
                    ? styles.chipSuccessText
                    : chip.tone === "warn"
                      ? styles.chipWarnText
                      : chip.tone === "danger"
                        ? styles.chipDangerText
                        : null;
                return (
                  <View
                    key={`${chip.label}-${idx}`}
                    style={toneStyle ? [styles.chip, toneStyle] : styles.chip}
                  >
                    <Text style={toneText ? [styles.chipText, toneText] : styles.chipText}>
                      {chip.label}
                    </Text>
                  </View>
                );
              })}
              {stockHealthy ? (
                <View style={[styles.chip, styles.chipSuccess]}>
                  <Text style={[styles.chipText, styles.chipSuccessText]}>
                    Stock saludable
                  </Text>
                </View>
              ) : null}
              {stockBelow ? (
                <View style={[styles.chip, styles.chipDanger]}>
                  <Text style={[styles.chipText, styles.chipDangerText]}>
                    Stock bajo
                  </Text>
                </View>
              ) : null}
            </View>
          </Section>
        )}

        {/* ─── Atributos */}
        <Section title="Atributos / especificaciones">
          {atributos.length === 0 ? (
            <Text style={styles.emptyHint}>Sin atributos registrados.</Text>
          ) : (
            <View>
              {atributos.map(([key, value], idx) => (
                <View
                  key={key}
                  style={
                    idx % 2 === 1 ? [styles.attrRow, styles.attrRowAlt] : styles.attrRow
                  }
                >
                  <Text style={styles.attrKey}>{key}</Text>
                  <Text style={styles.attrVal}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* ─── Descripción */}
        {producto.descripcion?.trim() ? (
          <Section title="Descripción">
            <Text style={styles.descText}>{producto.descripcion}</Text>
          </Section>
        ) : null}

        {/* ─── Códigos */}
        <Section title="Códigos para escaneo">
          <View style={styles.codesRow}>
            <View style={[styles.codeCard, styles.codeCardSpacer]}>
              <Text style={styles.codeLabel}>Code 128</Text>
              <Image src={barcodeDataUrl} style={styles.barcodeImg} />
              <Text style={styles.codeCaption}>{barcodeValue}</Text>
            </View>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>QR</Text>
              {equipo && equipo.codigoQr && qrDataUrl ? (
                <>
                  <Image src={qrDataUrl} style={styles.qrImg} />
                  <Text style={styles.codeCaption}>{equipo.codigoQr}</Text>
                </>
              ) : qrDataUrl && qrValue ? (
                <>
                  <Image src={qrDataUrl} style={styles.qrImg} />
                  <Text style={styles.codeCaption}>{qrValue}</Text>
                </>
              ) : (
                <Text style={styles.codeNoteText}>
                  {isEquipoLike
                    ? "El QR operativo se imprime por unidad física desde el módulo de equipos."
                    : "Sin QR configurado para este producto."}
                </Text>
              )}
            </View>
          </View>
        </Section>

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
