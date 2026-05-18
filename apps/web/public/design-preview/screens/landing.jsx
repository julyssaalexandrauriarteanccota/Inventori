// Inventori — public landing page
const { Icon, Mascot, Sparkles, Mesh, Avatar } = window.IV;

const LandingPage = () => {
  const [navOpen, setNavOpen] = React.useState(false);
  return (
    <div className="iv" style={{
      width: 1280, minHeight: 900,
      background: "var(--bg)", color: "var(--ink)",
      borderRadius: 0, overflow: "hidden", position: "relative"
    }}>
      {/* Top nav */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px", position: "sticky", top: 0, zIndex: 5,
        background: "color-mix(in oklab, var(--bg) 88%, transparent)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="logo" size={32}/>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em" }}>Inventori</span>
        </div>
        <nav style={{ display: "flex", gap: 4, padding: "6px", background: "var(--surface)", borderRadius: 999, border: "1px solid var(--line)" }}>
          {["Equipos", "Repuestos", "Insumos", "Servicio Técnico", "Empresas"].map(x => (
            <button key={x} style={{ padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{x}</button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn-ghost btn" style={{ padding: "9px 14px" }}><Icon name="search" size={16}/></button>
          <button className="btn-ghost btn" style={{ padding: "9px 14px" }}><Icon name="cart" size={16}/><span style={{
            background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 999, padding: "1px 7px", fontSize: 10, fontWeight: 600,
          }}>3</span></button>
          <button className="btn btn-accent">Cotizar ahora</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "32px 48px 56px", position: "relative" }}>
        <Mesh style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0.55, pointerEvents: "none",
        }}/>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 32, alignItems: "center" }}>
          <div className="anim-fade">
            <div className="pill" style={{ marginBottom: 18, background: "var(--accent-soft)", color: "var(--accent)" }}>
              <Icon name="sparkle" size={12}/> Nueva colección · Otoño '26
            </div>
            <h1 style={{ fontSize: 76, lineHeight: 0.98, fontWeight: 600, letterSpacing: "-0.04em", marginBottom: 20 }}>
              Imprime, copia<br/>
              y crece sin <span style={{
                background: "var(--accent)", color: "var(--accent-ink)",
                padding: "2px 14px", borderRadius: 18, display: "inline-block",
                transform: "rotate(-1.5deg)",
              }}>parar</span>.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 540, marginBottom: 28, color: "var(--ink-2)" }}>
              Equipos de impresión, repuestos originales e insumos al mejor precio.
              Soporte técnico certificado y entregas en 24 horas en toda la región.
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
              <button className="btn btn-accent" style={{ padding: "14px 22px", fontSize: 14 }}>
                Ver catálogo <Icon name="arrow" size={16}/>
              </button>
              <button className="btn btn-ghost" style={{ padding: "14px 22px", fontSize: 14 }}>
                <Icon name="play" size={12}/> Cómo funciona
              </button>
            </div>
            {/* Trust row */}
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {["#ff6b35","#6c5ce7","#00b894","#f7b500"].map((c,i) => (
                    <div key={i} style={{
                      width: 30, height: 30, borderRadius: "50%", background: c,
                      border: "2px solid var(--bg)", marginLeft: i ? -10 : 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, fontWeight: 600,
                    }}>{["MG","JP","AR","CV"][i]}</div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>+12.4k empresas confían</div>
              </div>
              <div style={{ width: 1, height: 36, background: "var(--line-2)" }}/>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600 }}>4.9 ★</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>2,381 reseñas</div>
              </div>
            </div>
          </div>

          {/* Right: hero composition */}
          <div style={{ position: "relative", height: 460 }}>
            {/* Big card */}
            <div className="card anim-pop" style={{
              position: "absolute", right: 0, top: 12, width: 360, padding: 22,
              borderRadius: 28, boxShadow: "var(--shadow-lg)",
            }}>
              <div className="img-slot" style={{ height: 200, marginBottom: 14, background: "var(--accent-soft)", borderColor: "transparent", border: "none" }}>
                <Mascot size={170}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Multifuncional</div>
                  <h3 style={{ fontSize: 18, marginTop: 2 }}>EcoTank Pro M3170</h3>
                </div>
                <div className="pill" style={{ background: "var(--good-soft)", color: "var(--good)" }}>En stock</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600 }}>$ 489</span>
                <span style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "line-through" }}>$ 599</span>
                <span className="pill" style={{ background: "var(--accent)", color: "var(--accent-ink)", marginLeft: "auto" }}>-18%</span>
              </div>
              <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }}>
                <Icon name="cart" size={14}/> Agregar al carrito
              </button>
            </div>

            {/* Floating mini card 1 */}
            <div className="card anim-pop" style={{
              position: "absolute", left: 0, top: 40, width: 200, padding: 14,
              borderRadius: 20, animationDelay: ".15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div className="icon-tile" style={{ width: 28, height: 28, background: "var(--cat-insumo-soft)", color: "var(--cat-insumo)" }}>
                  <Icon name="ink" size={14}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Tóner T-2530</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>Stock global</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600 }}>1,247</span>
                <span style={{ fontSize: 10, color: "var(--good)" }}>+12%</span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 20, alignItems: "flex-end" }}>
                {[40,55,30,72,48,90,65].map((v,i) => (
                  <div key={i} style={{ flex: 1, background: "var(--cat-insumo)", borderRadius: 2, height: `${v}%`, opacity: .5 + v/200 }}/>
                ))}
              </div>
            </div>

            {/* Floating mini card 2 */}
            <div className="card anim-pop" style={{
              position: "absolute", left: 22, bottom: 30, width: 220, padding: 14,
              borderRadius: 20, animationDelay: ".3s", display: "flex", gap: 10,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--accent-2)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="zap" size={22} color="#1d1b16"/>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Entrega 24h</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>Pedido #INV-3492</div>
                <div style={{ marginTop: 4, height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: "72%", height: "100%", background: "var(--accent)", borderRadius: 2, animation: "ivStretch 1.4s cubic-bezier(.2,.7,.3,1) both", ['--w']: '72%' }}/>
                </div>
              </div>
            </div>

            <Sparkles style={{ position: "absolute", right: 70, top: 0, animationDelay: ".5s" }}/>
          </div>
        </div>
      </section>

      {/* Categories strip */}
      <section style={{ padding: "0 48px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.03em" }}>Explora por categoría</h2>
          <a style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 4 }}>Ver todo <Icon name="arrow" size={14}/></a>
        </div>
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { name: "Equipos", desc: "Impresoras y multifuncionales", icon: "printer", color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", count: 248 },
            { name: "Repuestos", desc: "Piezas originales y compatibles", icon: "tools", color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)", count: 1832 },
            { name: "Insumos", desc: "Tóners, tintas, papeles", icon: "ink", color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", count: 712 },
            { name: "Accesorios", desc: "Bandejas, cables, mobiliario", icon: "package", color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)", count: 396 },
          ].map(c => (
            <div key={c.name} className="card" style={{ padding: 22, position: "relative", overflow: "hidden", cursor: "pointer", transition: "transform .2s, box-shadow .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              <div style={{
                position: "absolute", right: -20, top: -20, width: 100, height: 100,
                background: c.soft, borderRadius: "50%", filter: "blur(2px)",
              }}/>
              <div className="icon-tile" style={{ background: c.soft, color: c.color, marginBottom: 14, position: "relative", width: 44, height: 44 }}>
                <Icon name={c.icon} size={22}/>
              </div>
              <h3 style={{ fontSize: 19, marginBottom: 4, position: "relative" }}>{c.name}</h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 16, position: "relative" }}>{c.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.count} productos</span>
                <Icon name="arrow" size={16} color={c.color}/>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products grid */}
      <section style={{ padding: "0 48px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.03em" }}>Lo más vendido</h2>
            <p style={{ marginTop: 4, fontSize: 13 }}>Equipos elegidos por más de 12,000 negocios.</p>
          </div>
          <div className="seg seg-accent">
            <button className="is-on">Esta semana</button>
            <button>Mes</button>
            <button>Año</button>
          </div>
        </div>
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { name: "LaserJet M404", cat: "Equipo", price: 329, old: 389, color: "var(--cat-equipo)", soft: "var(--cat-equipo-soft)", icon: "printer", tag: "Best" },
            { name: "Tóner CF258A", cat: "Insumo", price: 84, color: "var(--cat-insumo)", soft: "var(--cat-insumo-soft)", icon: "ink" },
            { name: "Fusor Kit 220V", cat: "Repuesto", price: 156, color: "var(--cat-repuesto)", soft: "var(--cat-repuesto-soft)", icon: "tools", tag: "Nuevo" },
            { name: "Bandeja extra 550", cat: "Accesorio", price: 92, color: "var(--cat-accesorio)", soft: "var(--cat-accesorio-soft)", icon: "package" },
          ].map((p,i) => (
            <div key={i} className="card" style={{ padding: 16, cursor: "pointer", transition: "transform .2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
              <div style={{ height: 130, borderRadius: 14, background: p.soft, position: "relative", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {p.tag && <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "var(--ink)", color: "var(--bg)", fontSize: 10 }}>{p.tag}</span>}
                <button style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="plus" size={14}/>
                </button>
                <Icon name={p.icon} size={56} color={p.color} stroke={1.4}/>
              </div>
              <div style={{ fontSize: 10.5, color: p.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{p.cat}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, marginBottom: 6 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>${p.price}</span>
                {p.old && <span style={{ fontSize: 11, color: "var(--ink-3)", textDecoration: "line-through" }}>${p.old}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section style={{ padding: "0 48px 56px" }}>
        <div style={{
          background: "var(--ink)", color: "var(--bg)",
          borderRadius: 28, padding: "44px 44px",
          display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "center", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -80, top: -80, width: 320, height: 320, borderRadius: "50%", background: "var(--accent)", opacity: .25, filter: "blur(40px)" }}/>
          <div style={{ position: "absolute", right: 100, bottom: -40, width: 180, height: 180, borderRadius: "50%", background: "var(--accent-2)", opacity: .25, filter: "blur(30px)" }}/>
          <div style={{ position: "relative" }}>
            <div className="pill" style={{ background: "rgba(255,255,255,.08)", color: "var(--bg)", marginBottom: 14 }}>
              <Icon name="bolt" size={12}/> Para empresas
            </div>
            <h2 style={{ fontSize: 44, color: "var(--bg)", lineHeight: 1.05, marginBottom: 14 }}>
              Mantenimiento mensual.<br/>Cero papeleo.
            </h2>
            <p style={{ color: "rgba(245,241,232,.7)", fontSize: 14, marginBottom: 22, maxWidth: 460 }}>
              Plan integral para equipos de oficina. Reposición automática de insumos, soporte 24/7 y reportes en tiempo real.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-accent">Solicitar demo</button>
              <button className="btn btn-ghost" style={{ borderColor: "rgba(245,241,232,.2)", color: "var(--bg)" }}>Ver planes</button>
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 260, height: 220 }}>
              <div className="anim-orbit" style={{ position: "absolute", inset: 0, border: "1.5px dashed rgba(245,241,232,.25)", borderRadius: "50%" }}/>
              <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: "rgba(245,241,232,.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mascot size={160}/>
              </div>
              {[0, 1, 2].map(i => (
                <div key={i} className="anim-orbit" style={{
                  position: "absolute", inset: 0,
                  animationDuration: `${12 + i * 2}s`, animationDirection: i % 2 ? "reverse" : "normal",
                }}>
                  <div style={{
                    position: "absolute", left: "50%", top: i === 0 ? -8 : "auto", bottom: i === 1 ? -8 : i === 2 ? "30%" : "auto", right: i === 2 ? -8 : "auto",
                    width: 38, height: 38, borderRadius: 12, background: ["var(--accent)","var(--accent-2)","var(--bg)"][i],
                    color: i === 2 ? "var(--ink)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                  }}>
                    <Icon name={["ink","tools","check"][i]} size={18}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 48px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--ink-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="logo" size={20}/>
          <span>© 2026 Inventori · Todos los derechos reservados</span>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <a>Términos</a><a>Privacidad</a><a>Cookies</a><a>Contacto</a>
        </div>
      </footer>
    </div>
  );
};

window.LandingPage = LandingPage;
