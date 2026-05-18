// Inventori — electronic invoicing simulation
const { Icon, Avatar } = window.IV;
const { Sidebar, Topbar } = window;

const InvoiceScreen = () => {
  const [step, setStep] = React.useState(2); // 0..3 stamping flow
  return (
    <div className="iv" style={{ width: 1400, minHeight: 940, background: "var(--bg)", display: "flex" }}>
      <Sidebar active="invoice"/>
      <main style={{ flex: 1, padding: "28px 32px", overflow: "auto" }}>
        <Topbar
          title="Facturación electrónica"
          subtitle="Emisión, timbrado y envío SAT/CFDI 4.0 · 24 facturas hoy"
          action={
            <>
              <button className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
                <Icon name="upload" size={14}/> Exportar XML
              </button>
              <button className="btn btn-accent">
                <Icon name="plus" size={14}/> Nueva factura
              </button>
            </>
          }
        />

        {/* KPI strip */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
          {[
            { l: "Timbradas hoy", v: "24", d: "+8", c: "var(--good)" },
            { l: "Pendientes", v: "3", d: "—", c: "var(--ink-3)" },
            { l: "Canceladas", v: "1", d: "—", c: "var(--bad)" },
            { l: "Monto facturado", v: "$ 38,420", d: "+24%", c: "var(--accent)" },
          ].map((k, i) => (
            <div key={i} className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 500, marginBottom: 6 }}>{k.l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>{k.v}</span>
                <span style={{ fontSize: 11, color: k.c }}>{k.d}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live preview + stamping flow */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18, marginBottom: 18 }}>
          {/* Invoice preview */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>Vista previa CFDI</h3>
              <span className="pill" style={{ background: step === 3 ? "var(--good-soft)" : "var(--warn-soft)", color: step === 3 ? "var(--good)" : "var(--warn)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: step === 3 ? "var(--good)" : "var(--warn)" }}/>
                {step === 3 ? "Timbrada" : "Borrador"}
              </span>
            </div>

            <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
              {/* Stamp watermark */}
              {step === 3 && (
                <div className="anim-pop" style={{
                  position: "absolute", top: 12, right: 12, width: 68, height: 68,
                  border: "2.5px solid var(--good)", color: "var(--good)",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  transform: "rotate(-12deg)", fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
                  fontFamily: "var(--font-mono)", textAlign: "center", lineHeight: 1.1,
                }}>
                  TIMBRADO<br/>SAT
                </div>
              )}

              {/* header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="logo" size={32}/>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>Inventori MX</div>
                    <div style={{ fontSize: 9.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>RFC: INV-201228-AB1 · Régimen 601</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>FACTURA</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>A-003492</div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>07/05/2026 · 11:24</div>
                </div>
              </div>

              {/* parties */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Cliente</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Cervantes y Compañía SA de CV</div>
                  <div style={{ fontSize: 10, color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>CCO-880412-7K3</div>
                  <div style={{ fontSize: 10, color: "var(--ink-2)", marginTop: 4 }}>Av. Reforma 287, Col. Cuauhtémoc<br/>CDMX, 06500</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Forma / Método</div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)" }}>04 · Tarjeta de crédito</div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)" }}>PUE · Una sola exhibición</div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 4 }}>Uso CFDI: G03 · Gastos en general</div>
                </div>
              </div>

              {/* line items mini-table */}
              <table className="tbl" style={{ marginBottom: 14 }}>
                <thead style={{ background: "var(--surface)" }}>
                  <tr><th style={{ width: 52 }}>Cant</th><th>Descripción</th><th style={{ textAlign: "right" }}>P. Unit</th><th style={{ textAlign: "right" }}>Importe</th></tr>
                </thead>
                <tbody>
                  {[
                    ["1", "EcoTank Pro M3170 (SN: ETP-7G3920)", 489, 489],
                    ["4", "Tóner CF258A negro", 84, 319.20],
                    ["2", "Bandeja extra 550 hojas", 92, 184],
                  ].map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{r[0]}</td>
                      <td>{r[1]}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${r[2].toFixed(2)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>${r[3].toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* totals */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 200, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-2)" }}>
                    <span>Subtotal</span><span style={{ fontVariantNumeric: "tabular-nums" }}>$ 825.20</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--ink-2)" }}>
                    <span>IVA 16%</span><span style={{ fontVariantNumeric: "tabular-nums" }}>$ 132.03</span>
                  </div>
                  <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }}/>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: 600 }}>
                    <span>Total</span><span style={{ fontVariantNumeric: "tabular-nums" }}>$ 957.23 MXN</span>
                  </div>
                </div>
              </div>

              {/* QR / UUID footer */}
              {step === 3 && (
                <div className="anim-fade" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--line-2)", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, padding: 4, background: "#fff", borderRadius: 6, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(7, 1fr)", gap: 1 }}>
                    {Array.from({ length: 49 }).map((_, i) => {
                      const on = (i * 7 + 3) % 5 < 3;
                      return <div key={i} style={{ background: on ? "#000" : "transparent", borderRadius: 1 }}/>;
                    })}
                  </div>
                  <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 9, lineHeight: 1.5, color: "var(--ink-3)" }}>
                    <div><span style={{ color: "var(--ink-2)" }}>UUID:</span> 8B5C4E92-3F1A-44D7-A082-9E7C10BB23F4</div>
                    <div><span style={{ color: "var(--ink-2)" }}>Sello SAT:</span> hM/Wy7Vz2N4kP9oRtE6L8jX1uA3sCvB7nDgF...</div>
                    <div><span style={{ color: "var(--ink-2)" }}>Cert SAT:</span> 30001000000500003456</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stamping flow + actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>Proceso de timbrado</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { i: "doc", l: "Generar CFDI", d: "Datos del receptor y conceptos validados" },
                  { i: "settings", l: "Sellar XML", d: "Firma con CSD del emisor" },
                  { i: "send", l: "Enviar al PAC", d: "Validación SAT en tiempo real" },
                  { i: "check", l: "Timbrado", d: "UUID asignado, listo para descarga" },
                ].map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: active ? "var(--accent-soft)" : "transparent" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: done ? "var(--good)" : active ? "var(--accent)" : "var(--surface-3)",
                        color: done || active ? "#fff" : "var(--ink-3)",
                        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                      }}>
                        {done ? <Icon name="check" size={14}/> : active ? <span className="anim-spin" style={{
                          width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)",
                          borderTopColor: "#fff", borderRadius: "50%",
                          animation: "ivSpin 1s linear infinite",
                        }}/> : <Icon name={s.i} size={14}/>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.l}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.d}</div>
                      </div>
                      {done && <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{["1.2s","0.8s","1.4s"][i]}</span>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => setStep(s => Math.max(0, s - 1))} className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }}>← Atrás</button>
                <button onClick={() => setStep(s => Math.min(3, s + 1))} className="btn btn-accent" style={{ flex: 1, justifyContent: "center" }}>
                  {step === 3 ? "Reiniciar" : "Continuar"} <Icon name="arrow" size={14}/>
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Enviar al cliente</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--surface-2)", borderRadius: 12, marginBottom: 10 }}>
                <Icon name="mail" size={14} color="var(--ink-3)"/>
                <span style={{ fontSize: 12, flex: 1 }}>facturacion@cervantes.mx</span>
                <span className="pill" style={{ background: "var(--good-soft)", color: "var(--good)", fontSize: 10 }}>Verificado</span>
              </div>
              <textarea className="input" rows="2" defaultValue="Hola, adjuntamos su factura A-003492. ¡Gracias por su preferencia!" style={{ resize: "none", marginBottom: 10, lineHeight: 1.4 }}/>
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {["XML", "PDF", "Comprobante de pago"].map(c => (
                  <span key={c} className="pill" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Icon name="check" size={10}/> {c}
                  </span>
                ))}
              </div>
              <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={step !== 3}>
                <Icon name="send" size={14}/> Enviar factura
              </button>
            </div>
          </div>
        </div>

        {/* Recent invoices */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>Facturas emitidas</h3>
            <div className="seg seg-accent">
              <button className="is-on">Hoy</button>
              <button>Semana</button>
              <button>Mes</button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Folio</th><th>Cliente</th><th>UUID</th><th>Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {[
                { f: "A-003492", c: "Cervantes & Co.", uuid: "8B5C4E92...23F4", t: "$957.23", s: "Timbrada", color: "var(--cat-equipo)", initials: "CC" },
                { f: "A-003491", c: "Andrea Salazar", uuid: "2D8F9100...A1B5", t: "$489.00", s: "Timbrada", color: "var(--cat-insumo)", initials: "AS" },
                { f: "A-003490", c: "Magdalena Rivero", uuid: "—", t: "$92.00", s: "En proceso", color: "var(--cat-accesorio)", initials: "MR" },
                { f: "A-003489", c: "José Pereira", uuid: "—", t: "$156.00", s: "Pendiente", color: "var(--cat-repuesto)", initials: "JP" },
                { f: "A-003488", c: "Ricardo Vega", uuid: "44B1C0FF...B2E1", t: "$220.00", s: "Cancelada", color: "var(--cat-equipo)", initials: "RV" },
              ].map((r, i) => {
                const stColor = r.s === "Timbrada" ? "var(--good)" : r.s === "En proceso" ? "var(--info)" : r.s === "Cancelada" ? "var(--bad)" : "var(--warn)";
                const stSoft  = r.s === "Timbrada" ? "var(--good-soft)" : r.s === "En proceso" ? "var(--info-soft)" : r.s === "Cancelada" ? "var(--bad-soft)" : "var(--warn-soft)";
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{r.f}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={r.initials} color={r.color} size={26}/>
                        <span>{r.c}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-3)" }}>{r.uuid}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{r.t}</td>
                    <td>
                      <span className="pill" style={{ background: stSoft, color: stColor }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: stColor }}/> {r.s}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ width: 28, height: 28, borderRadius: 8, color: "var(--ink-2)" }}><Icon name="doc" size={13}/></button>
                        <button style={{ width: 28, height: 28, borderRadius: 8, color: "var(--ink-2)" }}><Icon name="send" size={13}/></button>
                        <button style={{ width: 28, height: 28, borderRadius: 8, color: "var(--ink-2)" }}><Icon name="upload" size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

window.InvoiceScreen = InvoiceScreen;
