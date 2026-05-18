// Inventori — products module (4 categories) with image upload + multi-preview
const { Icon, Avatar } = window.IV;
const { Sidebar, Topbar } = window;

const CATS = [
  { id: "Equipo", label: "Equipos", desc: "Activos físicos serializables", icon: "printer", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", n: 248 },
  { id: "Repuesto", label: "Repuestos", desc: "Piezas para soporte y reparación", icon: "tools", color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)", n: 1832 },
  { id: "Insumo", label: "Insumos", desc: "Materiales consumibles", icon: "ink", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", n: 712 },
  { id: "Accesorio", label: "Accesorios", desc: "Complementos comerciales", icon: "package", color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)", n: 396 },
];

const PRODUCTS = [
  { sku: "EQ-3170", name: "EcoTank Pro M3170", cat: "Equipo", price: 489, stock: 12, brand: "Epson", icon: "printer", serial: true, status: "Activo" },
  { sku: "EQ-M404", name: "LaserJet M404n", cat: "Equipo", price: 329, stock: 5, brand: "HP", icon: "printer", serial: true, status: "Activo" },
  { sku: "EQ-DC50", name: "DocuCentre SC2022", cat: "Equipo", price: 1280, stock: 3, brand: "Xerox", icon: "copier", serial: true, status: "Activo" },
  { sku: "RP-FUSR", name: "Fusor Kit 220V", cat: "Repuesto", price: 156, stock: 8, brand: "Brother", icon: "tools", status: "Activo" },
  { sku: "RP-RLLR", name: "Rodillo de papel", cat: "Repuesto", price: 28, stock: 24, brand: "Genérico", icon: "tools", status: "Activo" },
  { sku: "RP-SCAN", name: "ADF Scanner Assy", cat: "Repuesto", price: 218, stock: 4, brand: "HP", icon: "tools", status: "Bajo stock" },
  { sku: "IN-CF58", name: "Tóner CF258A negro", cat: "Insumo", price: 84, stock: 47, brand: "HP", icon: "ink", status: "Activo" },
  { sku: "IN-T030", name: "Cilindro DR-2300", cat: "Insumo", price: 62, stock: 2, brand: "Brother", icon: "ink", status: "Crítico" },
  { sku: "IN-PA80", name: "Papel bond 80g x500", cat: "Insumo", price: 9, stock: 1240, brand: "Xerox", icon: "ink", status: "Activo" },
  { sku: "AC-B550", name: "Bandeja extra 550", cat: "Accesorio", price: 92, stock: 14, brand: "HP", icon: "package", status: "Activo" },
  { sku: "AC-USB3", name: "Cable USB B 3m", cat: "Accesorio", price: 12, stock: 86, brand: "Genérico", icon: "package", status: "Activo" },
];

const ProductsScreen = () => {
  const [activeCat, setActiveCat] = React.useState("all");
  const [view, setView] = React.useState("grid");
  const [showForm, setShowForm] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  const filtered = activeCat === "all" ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCat);

  return (
    <div className="iv" style={{ width: 1400, minHeight: 940, background: "var(--bg)", display: "flex", position: "relative" }}>
      <Sidebar active="products"/>
      <main style={{ flex: 1, padding: "28px 32px", overflow: "auto" }}>
        <Topbar
          title="Productos"
          subtitle="Catálogo unificado · 3,188 SKUs · Última sync hace 4 min."
          action={
            <>
              <button className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
                <Icon name="upload" size={14}/> Importar
              </button>
              <button className="btn btn-accent" onClick={() => setShowForm(true)}>
                <Icon name="plus" size={14}/> Nuevo producto
              </button>
            </>
          }
        />

        {/* Category cards */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className="card" style={{
                padding: 18, textAlign: "left",
                borderColor: activeCat === c.id ? c.color : "var(--line)",
                position: "relative", overflow: "hidden", transition: "all .18s",
              }}>
              <div style={{
                position: "absolute", right: -10, top: -10, width: 80, height: 80, borderRadius: "50%",
                background: c.soft, opacity: activeCat === c.id ? 1 : 0.5, transition: "opacity .2s",
              }}/>
              <div className="icon-tile" style={{ background: c.soft, color: c.color, marginBottom: 12, position: "relative" }}>
                <Icon name={c.icon} size={18}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, position: "relative" }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8, position: "relative" }}>{c.desc}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, position: "relative" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600 }}>{c.n}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>SKUs</span>
              </div>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div className="seg seg-accent">
            <button className={activeCat === "all" ? "is-on" : ""} onClick={() => setActiveCat("all")}>Todos</button>
            {CATS.map(c => (
              <button key={c.id} className={activeCat === c.id ? "is-on" : ""} onClick={() => setActiveCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost" style={{ padding: "10px 12px", fontSize: 12 }}>
            <Icon name="filter" size={14}/> Filtros
          </button>
          <div className="seg">
            <button className={view === "grid" ? "is-on" : ""} onClick={() => setView("grid")}><Icon name="grid" size={14}/></button>
            <button className={view === "list" ? "is-on" : ""} onClick={() => setView("list")}><Icon name="list" size={14}/></button>
          </div>
        </div>

        {/* List of products */}
        {view === "grid" ? (
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {filtered.map(p => {
              const cat = CATS.find(c => c.id === p.cat);
              const stColor = p.status === "Crítico" ? "var(--bad)" : p.status === "Bajo stock" ? "var(--warn)" : "var(--good)";
              const stSoft  = p.status === "Crítico" ? "var(--bad-soft)" : p.status === "Bajo stock" ? "var(--warn-soft)" : "var(--good-soft)";
              return (
                <div key={p.sku} className="card" onClick={() => setSelected(p)} style={{
                  padding: 14, cursor: "pointer", transition: "all .18s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <div style={{
                    height: 130, borderRadius: 14, background: cat.soft,
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative", overflow: "hidden",
                  }}>
                    <Icon name={p.icon} size={56} color={cat.color} stroke={1.4}/>
                    <span className="pill" style={{ position: "absolute", top: 8, left: 8, fontSize: 10, background: "var(--surface)", color: cat.color }}>
                      {p.cat}
                    </span>
                    <span className="pill" style={{ position: "absolute", top: 8, right: 8, fontSize: 10, background: stSoft, color: stColor }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: stColor }}/> {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>{p.sku}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>${p.price}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.stock} en stock</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>SKU</th><th>Producto</th><th>Categoría</th><th>Marca</th>
                  <th>Stock</th><th>Precio</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const cat = CATS.find(c => c.id === p.cat);
                  const stColor = p.status === "Crítico" ? "var(--bad)" : p.status === "Bajo stock" ? "var(--warn)" : "var(--good)";
                  const stSoft  = p.status === "Crítico" ? "var(--bad-soft)" : p.status === "Bajo stock" ? "var(--warn-soft)" : "var(--good-soft)";
                  return (
                    <tr key={p.sku} onClick={() => setSelected(p)} style={{ cursor: "pointer" }}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{p.sku}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="icon-tile" style={{ background: cat.soft, color: cat.color, width: 32, height: 32 }}>
                            <Icon name={p.icon} size={14}/>
                          </div>
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                        </div>
                      </td>
                      <td><span className="pill" style={{ background: cat.soft, color: cat.color }}>{p.cat}</span></td>
                      <td style={{ color: "var(--ink-2)" }}>{p.brand}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.stock}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>${p.price}</td>
                      <td>
                        <span className="pill" style={{ background: stSoft, color: stColor }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: stColor }}/> {p.status}
                        </span>
                      </td>
                      <td><Icon name="arrow" size={14} color="var(--ink-3)"/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && <ProductForm onClose={() => setShowForm(false)}/>}
      {selected && <ProductDetail product={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
};

// ─── Product creation/edit form (with image upload + multi preview) ───
const ProductForm = ({ onClose }) => {
  const [cat, setCat] = React.useState("Equipo");
  const [images, setImages] = React.useState([
    { id: 1, color: "var(--cat-equipo-soft)", icon: "printer" },
    { id: 2, color: "var(--accent-soft)", icon: "image" },
    { id: 3, color: "var(--cat-insumo-soft)", icon: "image" },
  ]);
  const [primary, setPrimary] = React.useState(1);
  const [dragOver, setDragOver] = React.useState(false);

  const palette = ["var(--cat-equipo-soft)","var(--cat-insumo-soft)","var(--cat-repuesto-soft)","var(--cat-accesorio-soft)","var(--accent-soft)","var(--accent-2-soft)"];
  const addImage = () => {
    const id = Date.now();
    const color = palette[Math.floor(Math.random() * palette.length)];
    setImages(prev => [...prev, { id, color, icon: "image" }]);
  };
  const removeImage = (id) => {
    setImages(prev => prev.filter(i => i.id !== id));
    if (primary === id && images.length > 1) setPrimary(images[0].id);
  };

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(29,27,22,.45)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      animation: "ivFade .25s both",
    }} onClick={onClose}>
      <div className="iv card anim-pop" onClick={e => e.stopPropagation()} style={{
        width: 880, maxHeight: "90vh", padding: 0, overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 20 }}>Nuevo producto</h2>
            <p style={{ fontSize: 12, marginTop: 2 }}>Completa los datos para registrarlo en tu catálogo.</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 10, borderRadius: 10 }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <div className="scroll" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 0, overflow: "auto" }}>
          {/* Left — image management */}
          <div style={{ padding: 24, borderRight: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <label className="field-label">Imágenes ({images.length})</label>

            {/* Drop zone with primary preview */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addImage(); }}
              style={{
                height: 220, borderRadius: 18, position: "relative",
                background: images.find(i => i.id === primary)?.color || "var(--surface-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: dragOver ? "2px dashed var(--accent)" : "2px dashed transparent",
                transition: "all .15s", overflow: "hidden", marginBottom: 12,
              }}
            >
              <Icon name={images.find(i => i.id === primary)?.icon || "image"} size={84} color="var(--ink-2)" stroke={1.2}/>
              {dragOver && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(255,255,255,.7)",
                  backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 6, color: "var(--accent)",
                }}>
                  <Icon name="upload" size={28}/>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Suelta aquí para subir</span>
                </div>
              )}
              <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "var(--surface)", fontSize: 10 }}>
                <Icon name="image" size={11}/> Imagen principal
              </span>
            </div>

            {/* Thumbnail row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
              {images.map(img => (
                <div key={img.id} onClick={() => setPrimary(img.id)} style={{
                  aspectRatio: "1 / 1", borderRadius: 12, position: "relative", cursor: "pointer",
                  background: img.color, display: "flex", alignItems: "center", justifyContent: "center",
                  border: primary === img.id ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "all .15s",
                }}>
                  <Icon name={img.icon} size={26} color="var(--ink-2)"/>
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
              <Icon name="upload" size={14}/> Subir imágenes (PNG, JPG, WEBP)
            </button>
            <p style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 8, textAlign: "center" }}>
              Hasta 8 imágenes · 5MB c/u · Recomendado 1200×1200
            </p>
          </div>

          {/* Right — form fields */}
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="field-label">Categoría</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {CATS.map(c => (
                  <button key={c.id} onClick={() => setCat(c.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
                    background: cat === c.id ? c.soft : "var(--surface-2)",
                    border: "1px solid " + (cat === c.id ? c.color : "var(--line)"),
                    color: "var(--ink)", textAlign: "left", transition: "all .15s",
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: c.soft, color: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={c.icon} size={14}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.label}</div>
                      <div style={{ fontSize: 10, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Nombre</label>
              <input className="input" placeholder="Ej. EcoTank Pro M3170 multifuncional"/>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="field-label">SKU</label>
                <input className="input" placeholder="EQ-3170"/>
              </div>
              <div>
                <label className="field-label">Marca</label>
                <input className="input" placeholder="Epson, HP, Brother…"/>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label className="field-label">Precio venta</label>
                <input className="input" placeholder="$ 0.00"/>
              </div>
              <div>
                <label className="field-label">Costo</label>
                <input className="input" placeholder="$ 0.00"/>
              </div>
              <div>
                <label className="field-label">IVA</label>
                <select className="input"><option>16%</option><option>0%</option><option>Exento</option></select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="field-label">Stock inicial</label>
                <input className="input" placeholder="0"/>
              </div>
              <div>
                <label className="field-label">Stock mínimo</label>
                <input className="input" placeholder="5"/>
              </div>
            </div>

            {/* Conditional: serial only for Equipo */}
            {cat === "Equipo" && (
              <div className="anim-fade" style={{ padding: 12, background: "var(--cat-equipo-soft)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="hash" size={16} color="var(--cat-equipo)"/>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>Activo serializable</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 11 }}>Cada unidad llevará un número de serie único.</div>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked style={{ display: "none" }}/>
                  <span style={{ width: 30, height: 18, background: "var(--cat-equipo)", borderRadius: 9, position: "relative", transition: "all .15s" }}>
                    <span style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#fff" }}/>
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="field-label">Descripción</label>
              <textarea className="input" rows="3" placeholder="Características, dimensiones, contenido de la caja…" style={{ resize: "none", lineHeight: 1.4 }}/>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-soft">Guardar borrador</button>
          <button className="btn btn-accent">
            <Icon name="check" size={14}/> Crear producto
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Product detail drawer ───
const ProductDetail = ({ product, onClose }) => {
  const cat = CATS.find(c => c.id === product.cat);
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(29,27,22,.45)", zIndex: 40,
      display: "flex", justifyContent: "flex-end", animation: "ivFade .2s both",
    }} onClick={onClose}>
      <div className="iv anim-fade" onClick={e => e.stopPropagation()} style={{
        width: 480, height: "100%", background: "var(--bg)",
        borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column",
        animation: "ivFade .25s cubic-bezier(.2,.7,.3,1) both",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="pill" style={{ background: cat.soft, color: cat.color }}>{product.cat}</div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 8 }}><Icon name="x" size={14}/></button>
        </div>
        <div className="scroll" style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          <div style={{ height: 220, borderRadius: 16, background: cat.soft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name={product.icon} size={88} color={cat.color} stroke={1.2}/>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{product.sku}</div>
          <h2 style={{ fontSize: 22, marginTop: 4, marginBottom: 14 }}>{product.name}</h2>
          <div style={{ display: "flex", gap: 22, marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>Precio</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600 }}>${product.price}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>Stock</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600 }}>{product.stock}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>Marca</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, marginTop: 4 }}>{product.brand}</div>
            </div>
          </div>

          <h3 style={{ fontSize: 13, marginBottom: 10 }}>Movimientos recientes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { t: "Venta #OT-3492", d: "Hoy 11:24", n: -1, c: "var(--bad)" },
              { t: "Recepción almacén", d: "Ayer 16:08", n: +12, c: "var(--good)" },
              { t: "Venta #OT-3477", d: "5 may", n: -2, c: "var(--bad)" },
              { t: "Ajuste inventario", d: "3 may", n: +1, c: "var(--info)" },
            ].map((m, i) => (
              <div key={i} className="card-soft" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.t}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.d}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: m.c }}>{m.n > 0 ? "+" : ""}{m.n}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }}><Icon name="edit" size={14}/> Editar</button>
          <button className="btn btn-accent" style={{ flex: 1, justifyContent: "center" }}><Icon name="cart" size={14}/> Vender</button>
        </div>
      </div>
    </div>
  );
};

window.ProductsScreen = ProductsScreen;
window.ProductForm = ProductForm;
