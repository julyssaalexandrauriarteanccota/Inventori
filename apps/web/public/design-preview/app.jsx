// Inventori — main app: design canvas wiring + tweaks panel for theme/colors
const { LandingPage, DashboardScreen, SalesQuickScreen, SalesDetailScreen, ProductsScreen, ProductForm, InvoiceScreen } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "color": "orange",
  "density": "regular"
}/*EDITMODE-END*/;

// Apply theme + color globally to body so all artboards inherit.
const applyTheme = (dark, color) => {
  document.body.dataset.theme = dark ? "dark" : "light";
  document.body.dataset.color = color;
};

const App = () => {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    applyTheme(t.dark, t.color);
  }, [t.dark, t.color]);

  return (
    <>
      <window.DesignCanvas title="Inventori" subtitle="Pública + gestión · Tema claro/oscuro · 4 paletas">
        <window.DCSection id="public" title="Público" subtitle="Página pública para clientes">
          <window.DCArtboard id="landing" label="Landing · Inventori" width={1280} height={1640}>
            <LandingPage/>
          </window.DCArtboard>
        </window.DCSection>

        <window.DCSection id="management" title="Panel de gestión" subtitle="Dashboard, ventas, productos y facturación">
          <window.DCArtboard id="dashboard" label="Dashboard" width={1400} height={940}>
            <DashboardScreen/>
          </window.DCArtboard>
          <window.DCArtboard id="sales-quick" label="Venta rápida (POS)" width={1400} height={940}>
            <SalesQuickScreen/>
          </window.DCArtboard>
          <window.DCArtboard id="sales-detail" label="Venta detallada" width={1400} height={1020}>
            <SalesDetailScreen/>
          </window.DCArtboard>
        </window.DCSection>

        <window.DCSection id="catalog" title="Productos" subtitle="4 categorías + carga de imágenes con multi-preview">
          <window.DCArtboard id="products" label="Catálogo de productos" width={1400} height={1080}>
            <ProductsScreen/>
          </window.DCArtboard>
          <window.DCArtboard id="product-upload" label="Nuevo producto · multi-imagen" width={920} height={760}>
            <div className="iv" style={{
              width: 920, height: 760, background: "var(--bg)",
              padding: 24, display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              {/* Render the form inline (no overlay) so it shows as an artboard */}
              <InlineProductForm/>
            </div>
          </window.DCArtboard>
        </window.DCSection>

        <window.DCSection id="billing" title="Facturación electrónica" subtitle="Emisión, timbrado SAT/CFDI 4.0, envío al cliente">
          <window.DCArtboard id="invoice" label="Facturación · timbrado" width={1400} height={1280}>
            <InvoiceScreen/>
          </window.DCArtboard>
        </window.DCSection>
      </window.DesignCanvas>

      <window.TweaksPanel title="Tweaks · Inventori">
        <window.TweakSection label="Apariencia"/>
        <window.TweakToggle label="Modo oscuro" value={t.dark} onChange={v => setTweak("dark", v)}/>
        <window.TweakSection label="Color de marca"/>
        <window.TweakColor
          label="Acento"
          value={
            t.color === "orange" ? "#ff6b35" :
            t.color === "mint"   ? "#00b894" :
            t.color === "violet" ? "#6c5ce7" : "#4f7cff"
          }
          options={["#ff6b35", "#00b894", "#6c5ce7", "#4f7cff"]}
          onChange={(hex) => {
            const map = { "#ff6b35": "orange", "#00b894": "mint", "#6c5ce7": "violet", "#4f7cff": "indigo" };
            setTweak("color", map[hex] || "orange");
          }}
        />
      </window.TweaksPanel>
    </>
  );
};

// Inline version of the product form (no backdrop) for the canvas artboard
const InlineProductForm = () => {
  const { Icon } = window.IV;
  const [cat, setCat] = React.useState("Equipo");
  const [images, setImages] = React.useState([
    { id: 1, color: "var(--cat-equipo-soft)", icon: "printer" },
    { id: 2, color: "var(--accent-soft)", icon: "image" },
    { id: 3, color: "var(--cat-insumo-soft)", icon: "image" },
    { id: 4, color: "var(--cat-accesorio-soft)", icon: "image" },
  ]);
  const [primary, setPrimary] = React.useState(1);
  const [dragOver, setDragOver] = React.useState(false);
  const palette = ["var(--cat-equipo-soft)","var(--cat-insumo-soft)","var(--cat-repuesto-soft)","var(--cat-accesorio-soft)","var(--accent-soft)","var(--accent-2-soft)"];
  const icons = ["image","printer","ink","tools","package"];
  const addImage = () => {
    const id = Date.now();
    setImages(prev => [...prev, {
      id,
      color: palette[Math.floor(Math.random() * palette.length)],
      icon: icons[Math.floor(Math.random() * icons.length)],
    }]);
  };
  const removeImage = (id) => setImages(prev => prev.filter(i => i.id !== id));

  const CATS_LOCAL = [
    { id: "Equipo", label: "Equipos", desc: "Activos serializables", icon: "printer", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)" },
    { id: "Repuesto", label: "Repuestos", desc: "Piezas y componentes", icon: "tools", color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)" },
    { id: "Insumo", label: "Insumos", desc: "Consumibles", icon: "ink", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)" },
    { id: "Accesorio", label: "Accesorios", desc: "Complementos", icon: "package", color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)" },
  ];

  return (
    <div className="card" style={{ width: "100%", height: "100%", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Nuevo producto</h2>
          <p style={{ fontSize: 12, marginTop: 2 }}>Carga múltiple de imágenes con preview en vivo.</p>
        </div>
        <button className="btn btn-ghost" style={{ padding: 8, borderRadius: 10 }}>
          <Icon name="x" size={16}/>
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", flex: 1, minHeight: 0 }}>
        <div style={{ padding: 22, borderRight: "1px solid var(--line)", background: "var(--surface-2)", overflow: "auto" }}>
          <label className="field-label">Imágenes ({images.length})</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addImage(); }}
            style={{
              height: 200, borderRadius: 16, position: "relative",
              background: images.find(i => i.id === primary)?.color || "var(--surface-3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: dragOver ? "2px dashed var(--accent)" : "2px dashed transparent",
              transition: "all .15s", overflow: "hidden", marginBottom: 12,
            }}>
            <Icon name={images.find(i => i.id === primary)?.icon || "image"} size={76} color="var(--ink-2)" stroke={1.2}/>
            {dragOver && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.7)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--accent)" }}>
                <Icon name="upload" size={28}/>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Suelta aquí para subir</span>
              </div>
            )}
            <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "var(--surface)", fontSize: 10 }}>
              <Icon name="image" size={11}/> Principal
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
            {images.map(img => (
              <div key={img.id} onClick={() => setPrimary(img.id)} style={{
                aspectRatio: "1 / 1", borderRadius: 12, position: "relative", cursor: "pointer",
                background: img.color, display: "flex", alignItems: "center", justifyContent: "center",
                border: primary === img.id ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all .15s",
              }}>
                <Icon name={img.icon} size={24} color="var(--ink-2)"/>
                <button onClick={e => { e.stopPropagation(); removeImage(img.id); }} style={{
                  position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%",
                  background: "rgba(29,27,22,.7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name="x" size={10}/>
                </button>
              </div>
            ))}
            <button onClick={addImage} style={{
              aspectRatio: "1 / 1", borderRadius: 12, border: "1.5px dashed var(--line-2)",
              color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface)",
            }}>
              <Icon name="plus" size={20}/>
            </button>
          </div>

          <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 12, borderStyle: "dashed", borderColor: "var(--line-2)" }} onClick={addImage}>
            <Icon name="upload" size={14}/> Subir imágenes
          </button>
          <p style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 8, textAlign: "center" }}>
            Hasta 8 imágenes · 5MB c/u
          </p>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
          <div>
            <label className="field-label">Categoría</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {CATS_LOCAL.map(c => (
                <button key={c.id} onClick={() => setCat(c.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12,
                  background: cat === c.id ? c.soft : "var(--surface-2)",
                  border: "1px solid " + (cat === c.id ? c.color : "var(--line)"),
                  color: "var(--ink)", textAlign: "left",
                }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: c.soft, color: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={c.icon} size={13}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div><label className="field-label">Nombre</label><input className="input" placeholder="EcoTank Pro M3170"/></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="field-label">SKU</label><input className="input" placeholder="EQ-3170"/></div>
            <div><label className="field-label">Marca</label><input className="input" placeholder="Epson"/></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div><label className="field-label">Precio</label><input className="input" placeholder="$ 0.00"/></div>
            <div><label className="field-label">Stock</label><input className="input" placeholder="0"/></div>
            <div><label className="field-label">Mín.</label><input className="input" placeholder="5"/></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
            <button className="btn btn-soft" style={{ flex: 1, justifyContent: "center" }}>Borrador</button>
            <button className="btn btn-accent" style={{ flex: 1, justifyContent: "center" }}>
              <Icon name="check" size={14}/> Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.App = App;
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
