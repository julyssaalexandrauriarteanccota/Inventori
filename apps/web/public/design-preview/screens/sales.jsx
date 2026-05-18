// Inventori — sales screens (quick + detailed)
const { Icon, Avatar } = window.IV;
const { Sidebar, Topbar } = window;

// Catalog data shared across screens
const CATALOG = [
  { sku: "EQ-3170", name: "EcoTank Pro M3170", cat: "Equipo", icon: "printer", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", price: 489, stock: 12 },
  { sku: "EQ-M404", name: "LaserJet M404n", cat: "Equipo", icon: "printer", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", price: 329, stock: 5 },
  { sku: "IN-CF58", name: "Tóner CF258A", cat: "Insumo", icon: "ink", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", price: 84, stock: 47 },
  { sku: "IN-T030", name: "Cilindro DR-2300", cat: "Insumo", icon: "ink", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", price: 62, stock: 2 },
  { sku: "RP-FUSR", name: "Fusor Kit 220V", cat: "Repuesto", icon: "tools", color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)", price: 156, stock: 8 },
  { sku: "RP-RLLR", name: "Rodillo de papel", cat: "Repuesto", icon: "tools", color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)", price: 28, stock: 24 },
  { sku: "AC-B550", name: "Bandeja extra 550", cat: "Accesorio", icon: "package", color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)", price: 92, stock: 14 },
  { sku: "AC-USB3", name: "Cable USB B 3m", cat: "Accesorio", icon: "package", color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)", price: 12, stock: 86 },
];

// Quick sale screen — POS-style
const SalesQuickScreen = () => {
  const [cart, setCart] = React.useState([
    { sku: "EQ-3170", qty: 1 },
    { sku: "IN-CF58", qty: 4 },
  ]);
  const [filter, setFilter] = React.useState("all");
  const [pulseSku, setPulseSku] = React.useState(null);

  const filtered = filter === "all" ? CATALOG : CATALOG.filter(p => p.cat === filter);
  const cartItems = cart.map(c => ({ ...CATALOG.find(p => p.sku === c.sku), qty: c.qty }));
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const addToCart = (sku) => {
    setCart(prev => {
      const found = prev.find(c => c.sku === sku);
      if (found) return prev.map(c => c.sku === sku ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { sku, qty: 1 }];
    });
    setPulseSku(sku);
    setTimeout(() => setPulseSku(null), 350);
  };
  const updateQty = (sku, delta) => {
    setCart(prev => prev
      .map(c => c.sku === sku ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0));
  };
  const removeFromCart = (sku) => setCart(prev => prev.filter(c => c.sku !== sku));

  return (
    <div className="iv" style={{ width: 1400, minHeight: 940, background: "var(--bg)", display: "flex" }}>
      <Sidebar active="sales-quick"/>
      <main style={{ flex: 1, padding: "28px 32px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar
          title="Venta rápida"
          subtitle="Punto de venta · Caja 02 · Mariana Reyes"
          action={
            <>
              <button className="btn btn-ghost" style={{ padding: "11px 14px", fontSize: 12 }}>
                <Icon name="barcode" size={16}/> Escanear
              </button>
              <button className="btn btn-ghost" style={{ padding: "11px 14px", fontSize: 12 }}>
                <Icon name="user" size={16}/> Cliente
              </button>
            </>
          }
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, flex: 1, minHeight: 0 }}>
          {/* Catalog */}
          <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>Catálogo</h3>
              <div className="seg seg-accent">
                {[
                  { id: "all", label: "Todo" },
                  { id: "Equipo", label: "Equipos" },
                  { id: "Repuesto", label: "Repuestos" },
                  { id: "Insumo", label: "Insumos" },
                  { id: "Accesorio", label: "Accesorios" },
                ].map(f => (
                  <button key={f.id} className={filter === f.id ? "is-on" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>
                ))}
              </div>
            </div>

            <div className="scroll" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, overflow: "auto", paddingRight: 4 }}>
              {filtered.map(p => {
                const isPulse = pulseSku === p.sku;
                return (
                  <button key={p.sku} onClick={() => addToCart(p.sku)} style={{
                    textAlign: "left", padding: 12,
                    background: "var(--surface-2)", borderRadius: 16, border: "1px solid var(--line)",
                    transition: "all .15s",
                    transform: isPulse ? "scale(.96)" : "scale(1)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line)"}>
                    <div style={{
                      height: 84, borderRadius: 10, background: p.soft,
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, position: "relative", overflow: "hidden",
                    }}>
                      <Icon name={p.icon} size={36} color={p.color} stroke={1.4}/>
                      <span className="pill" style={{ position: "absolute", top: 6, right: 6, fontSize: 9, padding: "3px 7px", background: "var(--surface)", color: p.color }}>{p.cat}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>{p.sku} · {p.stock} disp.</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>${p.price}</span>
                      <span style={{ width: 24, height: 24, borderRadius: 8, background: "var(--accent)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="plus" size={14}/>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart */}
          <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>Carrito · {cartItems.length}</h3>
              <button style={{ fontSize: 12, color: "var(--ink-3)" }}>Limpiar</button>
            </div>

            <div className="scroll" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "auto", paddingRight: 4, minHeight: 0 }}>
              {cartItems.map(it => (
                <div key={it.sku} className="anim-fade" style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 12,
                  background: "var(--surface-2)", borderRadius: 14,
                }}>
                  <div className="icon-tile" style={{ background: it.soft, color: it.color, width: 38, height: 38 }}>
                    <Icon name={it.icon} size={18}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{it.sku} · ${it.price}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--surface)", borderRadius: 999, padding: 3, border: "1px solid var(--line)" }}>
                    <button onClick={() => updateQty(it.sku, -1)} style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)" }}>
                      <Icon name="minus" size={12}/>
                    </button>
                    <span style={{ minWidth: 18, textAlign: "center", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 600 }}>{it.qty}</span>
                    <button onClick={() => updateQty(it.sku, 1)} style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", color: "var(--bg)" }}>
                      <Icon name="plus" size={12}/>
                    </button>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 70, textAlign: "right" }}>
                    ${(it.price * it.qty).toFixed(0)}
                  </div>
                  <button onClick={() => removeFromCart(it.sku)} style={{ width: 22, height: 22, color: "var(--ink-3)" }}>
                    <Icon name="x" size={14}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Totals + payment */}
            <div style={{ marginTop: 14, padding: 16, background: "var(--surface-2)", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>
                <span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums" }}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>
                <span>IVA 16%</span><span style={{ fontVariantNumeric: "tabular-nums" }}>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--good)", marginBottom: 10 }}>
                <span>Descuento</span><span style={{ fontVariantNumeric: "tabular-nums" }}>−$0.00</span>
              </div>
              <div style={{ height: 1, background: "var(--line)", margin: "8px 0 12px" }}/>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
                {[
                  { i: "wallet", l: "Efectivo" },
                  { i: "tag", l: "Tarjeta", on: true },
                  { i: "qr", l: "QR / App" },
                ].map((p, i) => (
                  <button key={i} style={{
                    padding: "10px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500,
                    background: p.on ? "var(--accent)" : "var(--surface)",
                    color: p.on ? "var(--accent-ink)" : "var(--ink-2)",
                    border: "1px solid " + (p.on ? "var(--accent)" : "var(--line)"),
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                    <Icon name={p.i} size={16}/>{p.l}
                  </button>
                ))}
              </div>
              <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 14 }}>
                Cobrar <Icon name="arrow" size={16}/>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Detailed sale screen — invoice editor with full client info
const SalesDetailScreen = () => {
  return (
    <div className="iv" style={{ width: 1400, minHeight: 940, background: "var(--bg)", display: "flex" }}>
      <Sidebar active="sales-detail"/>
      <main style={{ flex: 1, padding: "28px 32px", overflow: "auto" }}>
        <Topbar
          title="Venta detallada"
          subtitle="Nueva nota de venta · Borrador #NV-3493"
          action={
            <>
              <button className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>Guardar borrador</button>
              <button className="btn btn-accent">Procesar venta <Icon name="arrow" size={14}/></button>
            </>
          }
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
          {/* Left: client + items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Client section */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16 }}>Datos del cliente</h3>
                <div className="seg">
                  <button className="is-on">Empresa</button>
                  <button>Persona</button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, background: "var(--accent-soft)", borderRadius: 14, marginBottom: 16 }}>
                <Avatar name="CC" color="var(--cat-equipo)" size={44}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Cervantes & Co. S.A. de C.V.</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>Cliente recurrente · 24 órdenes · Crédito $5,000</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 11 }}>Cambiar</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div>
                  <label className="field-label">Razón social</label>
                  <input className="input" defaultValue="Cervantes y Compañía SA de CV"/>
                </div>
                <div>
                  <label className="field-label">RFC / Tax ID</label>
                  <input className="input" defaultValue="CCO-880412-7K3"/>
                </div>
                <div>
                  <label className="field-label">Régimen fiscal</label>
                  <select className="input"><option>601 · General de personas morales</option></select>
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="input" defaultValue="facturacion@cervantes.mx"/>
                </div>
                <div>
                  <label className="field-label">Teléfono</label>
                  <input className="input" defaultValue="+52 55 4128 0931"/>
                </div>
                <div>
                  <label className="field-label">Uso de CFDI</label>
                  <select className="input"><option>G03 · Gastos en general</option></select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label">Dirección fiscal</label>
                  <input className="input" defaultValue="Av. Reforma 287, Col. Cuauhtémoc, CDMX, 06500"/>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16 }}>Productos / Servicios</h3>
                <button className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }}>
                  <Icon name="plus" size={14}/> Agregar línea
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.4fr) 60px 90px 90px 90px 28px", gap: 10, padding: "0 4px 8px", fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 500, borderBottom: "1px solid var(--line)" }}>
                <span>Descripción</span><span>Cant.</span><span>Precio</span><span>Desc.</span><span style={{ textAlign: "right" }}>Total</span><span/>
              </div>

              {[
                { name: "EcoTank Pro M3170", sku: "EQ-3170", qty: 1, price: 489, disc: 0, cat: "Equipo", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", icon: "printer", serial: "SN: ETP-7G3920" },
                { name: "Tóner CF258A", sku: "IN-CF58", qty: 4, price: 84, disc: 5, cat: "Insumo", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", icon: "ink" },
                { name: "Bandeja extra 550 hojas", sku: "AC-B550", qty: 2, price: 92, disc: 0, cat: "Accesorio", color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)", icon: "package" },
              ].map((it, i) => {
                const total = it.qty * it.price * (1 - it.disc / 100);
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "minmax(0,2.4fr) 60px 90px 90px 90px 28px",
                    gap: 10, padding: "12px 4px", alignItems: "center", borderBottom: "1px solid var(--line)", fontSize: 13,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div className="icon-tile" style={{ background: it.soft, color: it.color, width: 32, height: 32 }}>
                        <Icon name={it.icon} size={14}/>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                          {it.sku} · {it.cat}{it.serial ? ` · ${it.serial}` : ""}
                        </div>
                      </div>
                    </div>
                    <input className="input" defaultValue={it.qty} style={{ padding: "6px 10px", textAlign: "center", fontSize: 12 }}/>
                    <input className="input" defaultValue={it.price.toFixed(2)} style={{ padding: "6px 10px", fontSize: 12 }}/>
                    <input className="input" defaultValue={`${it.disc}%`} style={{ padding: "6px 10px", fontSize: 12 }}/>
                    <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${total.toFixed(2)}</span>
                    <button style={{ color: "var(--ink-3)", display: "flex", justifyContent: "center" }}><Icon name="trash" size={14}/></button>
                  </div>
                );
              })}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
                <div>
                  <label className="field-label">Notas internas</label>
                  <textarea className="input" rows="3" placeholder="Ej. Equipo con configuración de red incluida." style={{ resize: "none", lineHeight: 1.4 }}/>
                </div>
                <div>
                  <label className="field-label">Términos de pago</label>
                  <select className="input" style={{ marginBottom: 8 }}>
                    <option>Contado</option><option>Crédito 15 días</option><option>Crédito 30 días</option>
                  </select>
                  <label className="field-label">Vendedor</label>
                  <div className="input" style={{ display: "flex", alignItems: "center", gap: 8, padding: 8 }}>
                    <Avatar name="MR" color="var(--cat-equipo)" size={26}/>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Mariana Reyes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: summary + invoice options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Resumen</h3>
              {[
                ["Subtotal", "$ 825.20"],
                ["Descuentos", "−$ 16.80", "var(--good)"],
                ["IVA 16%", "$ 129.34"],
                ["Retenciones", "$ 0.00"],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: c || "var(--ink-2)" }}>
                  <span>{k}</span><span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "var(--line)", margin: "12px 0" }}/>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>$ 937.74</span>
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Documento</h3>
              <div className="seg" style={{ display: "flex", marginBottom: 14 }}>
                <button className="is-on" style={{ flex: 1 }}>Factura</button>
                <button style={{ flex: 1 }}>Recibo</button>
                <button style={{ flex: 1 }}>Cotización</button>
              </div>
              <label className="field-label">Serie / folio</label>
              <input className="input" defaultValue="A · 003492" style={{ marginBottom: 12 }}/>
              <label className="field-label">Método de pago</label>
              <select className="input" style={{ marginBottom: 12 }}>
                <option>PUE · Pago en una sola exhibición</option>
                <option>PPD · Pago en parcialidades</option>
              </select>
              <label className="field-label">Forma de pago</label>
              <select className="input"><option>04 · Tarjeta de crédito</option></select>
            </div>

            <div className="card" style={{ padding: 18, background: "var(--accent-soft)", borderColor: "transparent" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Icon name="sparkle" size={16} color="var(--accent)" style={{ marginTop: 2 }}/>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>Cliente VIP detectado</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.45 }}>
                    Aplica descuento adicional del 4% por antigüedad. ¿Aplicar al total?
                  </div>
                  <button style={{ marginTop: 8, fontSize: 11, fontWeight: 500, color: "var(--accent)" }}>Aplicar descuento →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

window.SalesQuickScreen = SalesQuickScreen;
window.SalesDetailScreen = SalesDetailScreen;
window.CATALOG = CATALOG;
