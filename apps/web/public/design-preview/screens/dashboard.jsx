// Inventori — management dashboard
const { Icon, Mascot, Avatar, Sparkbar, Stat } = window.IV;

const Sidebar = ({ active = "dashboard", onPick, dark, onTheme }) => {
  const items = [
    { id: "dashboard", icon: "grid", label: "Dashboard" },
    { id: "sales-quick", icon: "zap", label: "Venta rápida" },
    { id: "sales-detail", icon: "cart", label: "Venta detallada" },
    { id: "products", icon: "package", label: "Productos" },
    { id: "invoice", icon: "doc", label: "Facturación" },
  ];
  return (
    <aside style={{
      width: 76, background: "var(--surface)", borderRight: "1px solid var(--line)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 14, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
        <Icon name="logo" size={32}/>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onPick && onPick(it.id)} title={it.label}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: active === it.id ? "var(--accent)" : "transparent",
              color: active === it.id ? "var(--accent-ink)" : "var(--ink-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .18s",
              boxShadow: active === it.id ? "0 6px 18px var(--accent-soft)" : "none",
            }}>
            <Icon name={it.icon} size={20}/>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={onTheme} title="Tema" style={{ width: 44, height: 44, borderRadius: 14, color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={dark ? "sun" : "moon"} size={18}/>
        </button>
        <button title="Ajustes" style={{ width: 44, height: 44, borderRadius: 14, color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="settings" size={18}/>
        </button>
        <Avatar name="MR" size={36} color="var(--cat-equipo)"/>
      </div>
    </aside>
  );
};

const Topbar = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16 }}>
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>
        {title} <span className="anim-wave" style={{ display: "inline-block" }}>👋</span>
      </h1>
      <p style={{ fontSize: 13 }}>{subtitle}</p>
    </div>
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <input className="input" placeholder="Buscar productos, clientes, OT…" style={{ width: 320, paddingLeft: 38 }}/>
        <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}/>
      </div>
      <button className="btn btn-ghost" style={{ padding: "11px", position: "relative" }}>
        <Icon name="bell" size={16}/>
        <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--surface)" }}/>
      </button>
      {action}
    </div>
  </div>
);

const DashboardScreen = () => {
  const sales = [42, 56, 38, 70, 64, 88, 76, 92, 81, 105, 96, 118];
  return (
    <div className="iv" style={{ width: 1400, minHeight: 940, background: "var(--bg)", display: "flex" }}>
      <Sidebar active="dashboard"/>
      <main style={{ flex: 1, padding: "28px 32px", overflow: "hidden" }}>
        <Topbar
          title="Hola, Mariana"
          subtitle="Tienes 3 órdenes pendientes y stock bajo en 2 insumos."
          action={<button className="btn btn-accent"><Icon name="plus" size={14}/> Nueva venta</button>}
        />

        {/* KPI row */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
          {[
            { label: "Ventas hoy", value: "$ 12,840", delta: "+18%", icon: "wallet", color: "var(--accent)", soft: "var(--accent-soft)" },
            { label: "Órdenes", value: "47", delta: "+6", icon: "cart", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)" },
            { label: "Clientes nuevos", value: "12", delta: "+3", icon: "user", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)" },
            { label: "Stock crítico", value: "2", delta: "-1", icon: "package", color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)" },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div className="icon-tile" style={{ background: k.soft, color: k.color, width: 38, height: 38 }}>
                  <Icon name={k.icon} size={18}/>
                </div>
                <span className="pill" style={{
                  background: k.delta.startsWith("-") ? "var(--bad-soft)" : "var(--good-soft)",
                  color: k.delta.startsWith("-") ? "var(--bad)" : "var(--good)",
                }}>
                  <Icon name={k.delta.startsWith("-") ? "arrow-dn" : "arrow-up"} size={11}/> {k.delta}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Mid grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 14, marginBottom: 14 }}>
          {/* Sales chart */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 16 }}>Ventas · Últimos 12 meses</h3>
                <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Total</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>$ 348,920</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Ticket promedio</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>$ 184</div>
                  </div>
                </div>
              </div>
              <div className="seg seg-accent">
                <button>Día</button>
                <button>Semana</button>
                <button className="is-on">Mes</button>
              </div>
            </div>
            {/* chart */}
            <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 8, padding: "0 4px" }}>
              {sales.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: "100%", maxWidth: 28, height: `${v}%`,
                    background: i === 11 ? "var(--accent)" : "var(--surface-3)",
                    borderRadius: 8, transition: "height .8s",
                    animation: "ivStretch .8s cubic-bezier(.2,.7,.3,1) both",
                    animationDelay: `${i * 0.05}s`,
                  }}/>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{["E","F","M","A","M","J","J","A","S","O","N","D"][i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Donut + categories */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 16, marginBottom: 18 }}>Mix por categoría</h3>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              {/* donut */}
              <svg width="140" height="140" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--surface-3)" strokeWidth="6"/>
                {[
                  { c: "var(--cat-equipo)",    pct: 38, off: 25 },
                  { c: "var(--cat-insumo)",    pct: 28, off: 87 },
                  { c: "var(--cat-repuesto)",  pct: 22, off: 59 },
                  { c: "var(--cat-accesorio)", pct: 12, off: 37 },
                ].map((s, i) => {
                  const dash = `${s.pct} ${100 - s.pct}`;
                  return (<circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={s.c}
                    strokeWidth="6" strokeDasharray={dash} strokeDashoffset={s.off} transform="rotate(-90 21 21)" strokeLinecap="round"/>);
                })}
                <text x="21" y="20" textAnchor="middle" fontSize="6.5" fontWeight="600" fontFamily="var(--font-display)" fill="var(--ink)">$348k</text>
                <text x="21" y="26" textAnchor="middle" fontSize="2.5" fill="var(--ink-3)">total mes</text>
              </svg>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { name: "Equipos", pct: 38, color: "var(--cat-equipo)", v: "$132k" },
                  { name: "Insumos", pct: 28, color: "var(--cat-insumo)", v: "$98k" },
                  { name: "Repuestos", pct: 22, color: "var(--cat-repuesto)", v: "$77k" },
                  { name: "Accesorios", pct: 12, color: "var(--cat-accesorio)", v: "$42k" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}/>
                    <span style={{ flex: 1 }}>{s.name}</span>
                    <span style={{ color: "var(--ink-3)" }}>{s.pct}%</span>
                    <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          {/* Recent orders */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>Órdenes recientes</h3>
              <button style={{ fontSize: 12, color: "var(--ink-2)" }}>Ver todas →</button>
            </div>
            <table className="tbl">
              <thead>
                <tr><th>OT</th><th>Cliente</th><th>Producto</th><th>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {[
                  { ot: "#OT-3492", c: "Andrea Salazar", p: "EcoTank Pro M3170", t: "$489", s: "Pagado", color: "var(--cat-equipo)", initials: "AS" },
                  { ot: "#OT-3491", c: "Cervantes & Co.", p: "Tóner CF258A x4", t: "$336", s: "Enviando", color: "var(--cat-insumo)", initials: "CC" },
                  { ot: "#OT-3490", c: "José Pereira", p: "Fusor Kit 220V", t: "$156", s: "Pendiente", color: "var(--cat-repuesto)", initials: "JP" },
                  { ot: "#OT-3489", c: "Magdalena Rivero", p: "Bandeja extra 550", t: "$92", s: "Pagado", color: "var(--cat-accesorio)", initials: "MR" },
                ].map(r => {
                  const stColor = r.s === "Pagado" ? "var(--good)" : r.s === "Pendiente" ? "var(--warn)" : "var(--info)";
                  const stSoft  = r.s === "Pagado" ? "var(--good-soft)" : r.s === "Pendiente" ? "var(--warn-soft)" : "var(--info-soft)";
                  return (
                    <tr key={r.ot}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{r.ot}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={r.initials} color={r.color} size={26}/>
                          <span style={{ fontWeight: 500 }}>{r.c}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--ink-2)" }}>{r.p}</td>
                      <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.t}</td>
                      <td>
                        <span className="pill" style={{ background: stSoft, color: stColor }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }}/>
                          {r.s}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: top sellers + low stock */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16 }}>Top vendidos</h3>
                <span className="pill"><Icon name="sparkle" size={11}/> Esta semana</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { n: "Tóner CF258A", c: 142, color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", icon: "ink", w: 92 },
                  { n: "EcoTank Pro M3170", c: 38, color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", icon: "printer", w: 64 },
                  { n: "Fusor Kit 220V", c: 27, color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)", icon: "tools", w: 48 },
                ].map((it, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="icon-tile" style={{ background: it.soft, color: it.color, width: 38, height: 38 }}>
                      <Icon name={it.icon} size={18}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{it.n}</div>
                      <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${it.w}%`, height: "100%", background: it.color, borderRadius: 2,
                          animation: "ivStretch 1s cubic-bezier(.2,.7,.3,1) both",
                          animationDelay: `${i * 0.1}s`, ['--w']: `${it.w}%`,
                        }}/>
                      </div>
                    </div>
                    <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 14 }}>{it.c}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 18, background: "var(--accent-soft)", border: "1px solid var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="icon-tile" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
                  <Icon name="bolt" size={18}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: "var(--ink)" }}>Stock crítico en 2 insumos</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>Tóner CF258A · 4 uds · Cilindro DR-2300 · 2 uds</div>
                </div>
                <button className="btn btn-accent" style={{ padding: "8px 14px", fontSize: 12 }}>Reabastecer</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

window.DashboardScreen = DashboardScreen;
window.Sidebar = Sidebar;
window.Topbar = Topbar;
