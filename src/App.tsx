import { useState, useEffect, useCallback, CSSProperties } from "react";

const API = "https://stock-central-production.up.railway.app/api";

// ── Google Fonts ──────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
document.head.appendChild(fontLink);

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

function fmt(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

function isToday(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const EXCLUIR = /personaliz/i;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#09090b",
  surface: "#111113",
  surfaceHover: "#18181b",
  border: "#27272a",
  borderHover: "#3f3f46",
  text: "#fafafa",
  textMuted: "#71717a",
  textDim: "#3f3f46",
  accent: "#10b981",
  accentDim: "#052e16",
  accentBorder: "#065f46",
  amber: "#f59e0b",
  amberDim: "#1c1400",
  red: "#ef4444",
  redDim: "#1c0606",
  blue: "#3b82f6",
  blueDim: "#0c1a3a",
  blueBorder: "#1d4ed8",
  pink: "#ec4899",
  pinkDim: "#1a0010",
  pinkBorder: "#9d174d",
};

const T = { font: "'Geist', sans-serif", mono: "'JetBrains Mono', monospace" };

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp: CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "10px 14px", color: C.text, width: "100%", fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: T.font,
  transition: "border-color 0.15s",
};
const lbl: CSSProperties = {
  display: "block", color: C.textMuted, fontSize: 11, marginBottom: 6,
  fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: T.font,
};
const btnPrimary: CSSProperties = {
  padding: "9px 18px", background: C.text, color: C.bg, border: "none",
  borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
  fontFamily: T.font, transition: "opacity 0.15s",
};
const btnSecondary: CSSProperties = {
  padding: "8px 14px", background: "transparent", color: C.textMuted,
  border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer",
  fontSize: 12, fontFamily: T.font, transition: "all 0.15s",
};
const btnGreen: CSSProperties = {
  padding: "6px 12px", background: C.accentDim, color: C.accent,
  border: `1px solid ${C.accentBorder}`, borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontWeight: 600, fontFamily: T.font, transition: "all 0.15s",
};
const btnRed: CSSProperties = {
  padding: "6px 12px", background: "transparent", color: C.red,
  border: `1px solid #3f1515`, borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontFamily: T.font, transition: "all 0.15s",
};
const card: CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
};

// ── Types ─────────────────────────────────────────────────────────────────────
type TnVariant = { id: number; values: Record<string, string>[]; sku: string; stock: number };
type TnProduct = { id: number; name: { es?: string } | string; variants: TnVariant[] };
type Link = { product_id: string; variant_id: string; label: string };
type LogEntry = { ts: string; action: string; stock: number; delta?: number; reason?: string; order_id?: string; reservation_id?: string };
type Variante = { id: string; label: string; stock: number; links: Link[]; log: LogEntry[] };
type Producto = { id: string; nombre: string; variantes: Variante[] };
type Stats = { total_productos: number; total_variantes: number; total_links: number; stock_bajo: number; sin_stock: number; active_reservations: number; recent_log: (LogEntry & { producto: string; variante: string })[] };
type Match = { id: string; nombre: string; tn_match_product_id: string; producto1: { tn_product_id: string; nombre: string }; producto2: { tn_product_id: string; nombre: string }; createdAt: string };

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: C.textMuted, fontSize: 12, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: C.blue }}>{current}/{total}</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.blue}, #60a5fa)`, borderRadius: 2, transition: "width 0.25s ease" }} />
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "green" | "red" | "amber" | "blue" | "gray" | "pink" }) {
  const map = {
    green: { bg: C.accentDim, text: C.accent, border: C.accentBorder },
    red: { bg: C.redDim, text: C.red, border: "#3f1515" },
    amber: { bg: C.amberDim, text: C.amber, border: "#3d2600" },
    blue: { bg: C.blueDim, text: C.blue, border: C.blueBorder },
    gray: { bg: C.surface, text: C.textMuted, border: C.border },
    pink: { bg: C.pinkDim, text: C.pink, border: C.pinkBorder },
  };
  const s = map[color];
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: T.mono, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const isErr = type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: C.surface, border: `1px solid ${isErr ? "#3f1515" : C.accentBorder}`,
      borderRadius: 10, padding: "14px 18px", color: C.text, fontSize: 14,
      maxWidth: 360, display: "flex", gap: 12, alignItems: "center",
      boxShadow: `0 8px 32px ${isErr ? "#ef444420" : "#10b98120"}`,
      fontFamily: T.font, animation: "slideIn 0.2s ease",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: isErr ? C.red : C.accent, flexShrink: 0 }} />
      {msg}
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, padding: 28, width: "100%", maxWidth: wide ? 720 : 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px #00000080" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: 0, color: C.text, fontSize: 17, fontWeight: 600, fontFamily: T.font }}>{title}</h3>
            {subtitle && <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 13, fontFamily: T.font }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Stock indicator ───────────────────────────────────────────────────────────
function StockPill({ stock }: { stock: number }) {
  const color = stock === 0 ? C.red : stock <= 5 ? C.amber : C.accent;
  const bg = stock === 0 ? C.redDim : stock <= 5 ? C.amberDim : C.accentDim;
  return (
    <span style={{ background: bg, color, fontFamily: T.mono, fontWeight: 700, fontSize: 15, padding: "3px 10px", borderRadius: 6, minWidth: 40, display: "inline-block", textAlign: "center" }}>
      {stock}
    </span>
  );
}

// ── Activity log helpers ──────────────────────────────────────────────────────
function getActionLabel(action: string, reason?: string): { label: string; color: "green" | "red" | "amber" | "blue" | "gray" } {
  if (action === "sale") return { label: "Venta", color: "red" };
  if (action === "reserved") return { label: "Reservado", color: "amber" };
  if (action === "reservation_released") return { label: "Liberado", color: "green" };
  if (action === "reservation_expired") return { label: "Expirado", color: "gray" };
  if (action === "return") return { label: "Devolución", color: "green" };
  if (action === "add") return { label: "Carga", color: "green" };
  if (action === "subtract") return { label: "Descuento manual", color: "amber" };
  if (action === "set") return { label: "Ajuste", color: "blue" };
  if (action === "sync") return { label: "Sync", color: "blue" };
  if (action === "created") return { label: "Creado", color: "gray" };
  return { label: action, color: "gray" };
}

// ── Activity Panel ────────────────────────────────────────────────────────────
function ActivityPanel({ log }: { log: (LogEntry & { producto: string; variante: string })[] }) {
  const [tab, setTab] = useState<"today" | "sales" | "restock">("today");

  const todayLog = log.filter(l => isToday(l.ts));
  const salesLog = log.filter(l => ["sale", "reserved", "subtract"].includes(l.action));
  const restockLog = log.filter(l => ["add", "return", "reservation_released", "reservation_expired"].includes(l.action));

  const todaySales = todayLog.filter(l => l.action === "sale").length;
  const todayManual = todayLog.filter(l => l.action === "subtract").length;
  const todayRestock = todayLog.filter(l => ["add", "return"].includes(l.action)).length;

  const tabStyle = (t: string): CSSProperties => ({
    padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13,
    fontFamily: T.font, fontWeight: 500, border: "none", transition: "all 0.15s",
    background: tab === t ? C.text : "transparent",
    color: tab === t ? C.bg : C.textMuted,
  });

  const renderLog = (entries: (LogEntry & { producto: string; variante: string })[]) => {
    if (entries.length === 0) return (
      <div style={{ textAlign: "center", padding: "32px 0", color: C.textDim, fontSize: 13, fontFamily: T.font }}>Sin movimientos</div>
    );
    return entries.slice(0, 25).map((l, i) => {
      const { label, color } = getActionLabel(l.action, l.reason);
      return (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "9px 0", borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <span style={{ color: C.textMuted, fontFamily: T.mono, fontSize: 11, minWidth: 88, flexShrink: 0 }}>{fmt(l.ts)}</span>
          <Badge color={color}>{label}</Badge>
          <span style={{ color: C.textMuted, fontSize: 12, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{l.producto} · {l.variante}</span>
          {l.delta !== undefined && (
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: l.delta > 0 ? C.accent : C.red, flexShrink: 0 }}>
              {l.delta > 0 ? "+" : ""}{l.delta}
            </span>
          )}
          <span style={{ fontFamily: T.mono, fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{l.stock}</span>
        </div>
      );
    });
  };

  return (
    <div style={{ ...card, padding: 20, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text, fontFamily: T.font }}>Actividad</h3>
        <div style={{ display: "flex", gap: 4, background: C.bg, padding: 4, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <button style={tabStyle("today")} onClick={() => setTab("today")}>Hoy</button>
          <button style={tabStyle("sales")} onClick={() => setTab("sales")}>Ventas</button>
          <button style={tabStyle("restock")} onClick={() => setTab("restock")}>Reposición</button>
        </div>
      </div>

      {tab === "today" && (
        <>
          {todayLog.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontSize: 13, fontFamily: T.font }}>
              Sin actividad hoy — {fmtDate(new Date().toISOString())}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total", value: todayLog.length, color: C.blue },
                { label: "Ventas", value: todaySales, color: C.red },
                { label: "Manuales", value: todayManual, color: C.amber },
                { label: "Reposiciones", value: todayRestock, color: C.accent },
              ].map(s => (
                <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: T.font }}>{s.label}</div>
                  <div style={{ color: s.color, fontFamily: T.mono, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
          {renderLog(todayLog)}
        </>
      )}
      {tab === "sales" && renderLog(salesLog)}
      {tab === "restock" && renderLog(restockLog)}
    </div>
  );
}

// ── Add Variante Modal ────────────────────────────────────────────────────────
function AddVarianteModal({ productoId, onClose, onAdded }: { productoId: string; onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handle() {
    if (!label) return setErr("El nombre es obligatorio");
    setLoading(true);
    try { await api("POST", `/productos/${productoId}/variantes`, { label, stock: parseInt(stock) || 0 }); onAdded(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }

  return (
    <Modal title="Nueva variante" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><label style={lbl}>Nombre</label><input style={inp} placeholder="ej: S / BLANCO" value={label} onChange={e => setLabel(e.target.value)} autoFocus /></div>
        <div><label style={lbl}>Stock inicial</label><input style={{ ...inp, fontFamily: T.mono }} type="number" min="0" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0, fontFamily: T.font }}>{err}</p>}
        <button onClick={handle} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>{loading ? "Agregando..." : "Agregar variante"}</button>
      </div>
    </Modal>
  );
}

// ── Adjust Stock Modal ────────────────────────────────────────────────────────
function AdjustStockModal({ productoId, variante, onClose, onAdjusted }: { productoId: string; variante: Variante; onClose: () => void; onAdjusted: () => void }) {
  const [mode, setMode] = useState<"add" | "subtract" | "set">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [sync, setSync] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handle() {
    const n = parseInt(amount);
    if (isNaN(n) || n < 0) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { reason, sync };
      if (mode === "set") body.absolute = n;
      else body.delta = mode === "add" ? n : -n;
      await api("PUT", `/productos/${productoId}/variantes/${variante.id}/stock`, body);
      onAdjusted();
    } catch (_e) { }
    setLoading(false);
    onClose();
  }

  const n = parseInt(amount);
  const preview = isNaN(n) ? null : mode === "set" ? n : mode === "add" ? variante.stock + n : Math.max(0, variante.stock - n);

  const modeBtn = (m: "add" | "subtract" | "set", label: string) => (
    <button onClick={() => setMode(m)} style={{
      flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${mode === m ? C.blue : C.border}`,
      background: mode === m ? C.blueDim : "transparent", color: mode === m ? C.blue : C.textMuted,
      cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: T.font, transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <Modal title={`Ajustar stock`} subtitle={variante.label} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...card, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.textMuted, fontSize: 13, fontFamily: T.font }}>Stock actual</span>
          <StockPill stock={variante.stock} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>{modeBtn("add", "+ Agregar")}{modeBtn("subtract", "− Restar")}{modeBtn("set", "= Fijar")}</div>
        <input autoFocus style={{ ...inp, fontFamily: T.mono, fontSize: 28, fontWeight: 700, textAlign: "center", padding: "16px" }}
          type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
        {preview !== null && (
          <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: "12px", textAlign: "center", color: C.accent }}>
            <span style={{ fontFamily: T.font, fontSize: 13 }}>Resultado: </span>
            <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 20 }}>{preview}</span>
          </div>
        )}
        <input style={inp} placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} style={{ accentColor: C.accent, width: 16, height: 16 }} />
          <span style={{ color: C.textMuted, fontSize: 13, fontFamily: T.font }}>Sincronizar a Tiendanube</span>
        </label>
        <button onClick={handle} disabled={loading || !amount} style={{ ...btnPrimary, opacity: loading || !amount ? 0.5 : 1 }}>{loading ? "Aplicando..." : "Aplicar"}</button>
      </div>
    </Modal>
  );
}

// ── Link Modal ────────────────────────────────────────────────────────────────
function LinkModal({ productoId, variante, onClose, onLinked }: { productoId: string; variante: Variante; onClose: () => void; onLinked: () => void }) {
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ product_id: string; variant_id: string; label: string }[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("GET", "/tn-products").then((data: TnProduct[]) => { setTnProducts(data); setLoading(false); })
      .catch(() => { setErr("Error cargando productos"); setLoading(false); });
  }, []);

  const q = search.toLowerCase();
  const filtered = tnProducts
    .filter(p => { const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name); return !EXCLUIR.test(n); })
    .map(p => {
      const pName = typeof p.name === "object" ? (p.name.es || "") : String(p.name);
      const fv = p.variants.filter(v => {
        const vl = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || "";
        return !q || pName.toLowerCase().includes(q) || vl.toLowerCase().includes(q) || (v.sku || "").toLowerCase().includes(q);
      });
      return { ...p, _name: pName, variants: fv };
    }).filter(p => p.variants.length > 0);

  function toggle(product_id: string, variant_id: string, label: string) {
    setSelected(prev => prev.some(s => s.variant_id === variant_id) ? prev.filter(s => s.variant_id !== variant_id) : [...prev, { product_id, variant_id, label }]);
  }

  async function handleLink() {
    if (selected.length === 0) return;
    setProgress({ current: 0, total: selected.length, label: "Iniciando..." });
    let linked = 0;
    for (let i = 0; i < selected.length; i++) {
      setProgress({ current: i, total: selected.length, label: `Vinculando: ${selected[i].label}` });
      try { await api("POST", `/productos/${productoId}/variantes/${variante.id}/links`, selected[i]); linked++; } catch (_e) { }
    }
    setProgress({ current: selected.length, total: selected.length, label: `Listo: ${linked} vinculada(s)` });
    setTimeout(() => { if (linked > 0) onLinked(); else setErr("No se pudo vincular"); setProgress(null); }, 800);
  }

  return (
    <Modal title={`Vincular variante`} subtitle={variante.label} onClose={onClose} wide>
      <input autoFocus style={{ ...inp, marginBottom: 14 }} placeholder="Buscar producto, variante o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading && <p style={{ color: C.textMuted, textAlign: "center", fontFamily: T.font }}>Cargando productos...</p>}
      <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.map(p => (
          <div key={p.id}>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", padding: "10px 4px 5px", fontFamily: T.font }}>{p._name}</div>
            {p.variants.map(v => {
              const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
              const label = `${p._name} · ${vLabel}`;
              const isSel = selected.some(s => s.variant_id === String(v.id));
              const alreadyLinked = variante.links.some(l => l.variant_id === String(v.id));
              return (
                <div key={v.id} onClick={() => !alreadyLinked && !progress && toggle(String(p.id), String(v.id), label)}
                  style={{
                    padding: "9px 12px", borderRadius: 7, cursor: alreadyLinked || progress ? "default" : "pointer",
                    background: isSel ? C.blueDim : alreadyLinked ? C.accentDim : "transparent",
                    border: `1px solid ${isSel ? C.blueBorder : alreadyLinked ? C.accentBorder : C.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3,
                    transition: "all 0.1s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 15, height: 15, borderRadius: 4,
                      border: `2px solid ${isSel ? C.blue : alreadyLinked ? C.accent : C.border}`,
                      background: isSel ? C.blue : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {(isSel || alreadyLinked) && <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ color: isSel ? C.blue : alreadyLinked ? C.accent : C.text, fontSize: 13, fontFamily: T.font }}>
                      {vLabel}{alreadyLinked ? " — ya vinculada" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {v.sku && <span style={{ fontFamily: T.mono, fontSize: 11, color: C.textMuted }}>{v.sku}</span>}
                    <span style={{ fontFamily: T.mono, fontSize: 12, color: C.textMuted }}>s:{v.stock ?? "∞"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {selected.length > 0 && !progress && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 8 }}>
          <span style={{ color: C.blue, fontWeight: 600, fontSize: 13, fontFamily: T.font }}>{selected.length} seleccionada(s)</span>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {selected.map(s => <span key={s.variant_id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, color: C.textMuted, fontFamily: T.font }}>{s.label}</span>)}
          </div>
        </div>
      )}
      {progress && <div style={{ marginTop: 14 }}><ProgressBar current={progress.current} total={progress.total} label={progress.label} /></div>}
      {err && <p style={{ color: C.red, fontSize: 13, marginTop: 8, fontFamily: T.font }}>{err}</p>}
      <button onClick={handleLink} disabled={!!progress || selected.length === 0} style={{ ...btnPrimary, marginTop: 16, width: "100%", opacity: progress || selected.length === 0 ? 0.5 : 1 }}>
        {progress ? `Vinculando ${progress.current}/${progress.total}...` : `Vincular ${selected.length > 0 ? `${selected.length} variante(s)` : ""}`}
      </button>
    </Modal>
  );
}

// ── Variante Row ──────────────────────────────────────────────────────────────
function VarianteRow({ productoId, variante, onRefresh, onToast }: { productoId: string; variante: Variante; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try { const r = await api("POST", `/productos/${productoId}/variantes/${variante.id}/sync`); onToast(`Sync OK: ${r.updated} link(s) actualizados`); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
    setSyncing(false);
  }

  async function handleUnlink(variant_id: string) {
    try { await api("DELETE", `/productos/${productoId}/variantes/${variante.id}/links/${variant_id}`); onRefresh(); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar variante "${variante.label}"?`)) return;
    try { await api("DELETE", `/productos/${productoId}/variantes/${variante.id}`); onRefresh(); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  const stockColor = variante.stock === 0 ? C.red : variante.stock <= 5 ? C.amber : C.accent;

  return (
    <>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 6, transition: "border-color 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: variante.links.length > 0 || showLog ? 10 : 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: stockColor, flexShrink: 0 }} />
          <span style={{ fontFamily: T.font, fontWeight: 500, color: C.text, fontSize: 14, flex: 1 }}>{variante.label}</span>
          <StockPill stock={variante.stock} />
        </div>

        {variante.links.length > 0 && (
          <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {variante.links.map(l => (
              <span key={l.variant_id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 10px", fontSize: 11, color: C.textMuted, fontFamily: T.font, display: "flex", alignItems: "center", gap: 6 }}>
                {l.label}
                <button onClick={() => handleUnlink(l.variant_id)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.6 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setShowAdjust(true)} style={btnSecondary}>Ajustar stock</button>
          <button onClick={() => setShowLink(true)} style={btnSecondary}>+ Vincular</button>
          {variante.links.length > 0 && (
            <button onClick={handleSync} disabled={syncing} style={{ ...btnGreen, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? "Sincronizando..." : "↑ Sync"}
            </button>
          )}
          <button onClick={() => setShowLog(!showLog)} style={{ ...btnSecondary, color: showLog ? C.text : C.textMuted }}>Log</button>
          <button onClick={handleDelete} style={{ ...btnRed, marginLeft: "auto" }}>Eliminar</button>
        </div>

        {showLog && variante.log.length > 0 && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            {variante.log.slice(0, 8).map((l, i) => {
              const { label, color } = getActionLabel(l.action, l.reason);
              return (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, padding: "5px 0", borderBottom: i < Math.min(variante.log.length, 8) - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                  <span style={{ fontFamily: T.mono, color: C.textMuted, fontSize: 11, minWidth: 88 }}>{fmt(l.ts)}</span>
                  <Badge color={color}>{label}</Badge>
                  {l.delta !== undefined && <span style={{ fontFamily: T.mono, color: l.delta > 0 ? C.accent : C.red, fontSize: 12, fontWeight: 600 }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
                  <span style={{ color: C.textMuted, fontFamily: T.font }}>→ <span style={{ fontFamily: T.mono, color: C.text }}>{l.stock}</span></span>
                  {l.reason && <span style={{ color: C.textMuted, fontFamily: T.font, fontSize: 11 }}>{l.reason}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdjust && <AdjustStockModal productoId={productoId} variante={variante} onClose={() => setShowAdjust(false)} onAdjusted={() => { onRefresh(); onToast("Stock actualizado"); }} />}
      {showLink && <LinkModal productoId={productoId} variante={variante} onClose={() => setShowLink(false)} onLinked={() => { onRefresh(); setShowLink(false); onToast("Variante(s) vinculadas"); }} />}
    </>
  );
}

// ── Producto Card ─────────────────────────────────────────────────────────────
function ProductoCard({ producto, onRefresh, onToast }: { producto: Producto; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddVar, setShowAddVar] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  const totalStock = producto.variantes.reduce((a, v) => a + v.stock, 0);
  const sinStock = producto.variantes.filter(v => v.stock === 0).length;
  const bajStock = producto.variantes.filter(v => v.stock > 0 && v.stock <= 5).length;
  const variantesConLinks = producto.variantes.filter(v => v.links.length > 0);

  async function handleSyncAll() {
    if (variantesConLinks.length === 0) { onToast("Sin variantes vinculadas", "error"); return; }
    setSyncProgress({ current: 0, total: variantesConLinks.length, label: "Iniciando..." });
    let ok = 0;
    for (let i = 0; i < variantesConLinks.length; i++) {
      const v = variantesConLinks[i];
      setSyncProgress({ current: i, total: variantesConLinks.length, label: `Sincronizando: ${v.label}` });
      try { await api("POST", `/productos/${producto.id}/variantes/${v.id}/sync`); ok++; } catch (_e) { }
    }
    setSyncProgress({ current: variantesConLinks.length, total: variantesConLinks.length, label: `Completado: ${ok}/${variantesConLinks.length}` });
    setTimeout(() => { setSyncProgress(null); onRefresh(); onToast(`Sync completo: ${ok} variante(s)`); }, 1200);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
    try { await api("DELETE", `/productos/${producto.id}`); onRefresh(); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  return (
    <>
      <div style={{ ...card, marginBottom: 10, overflow: "hidden", transition: "border-color 0.15s" }}>
        <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }} onClick={() => setExpanded(!expanded)}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <span style={{ fontFamily: T.font, fontWeight: 600, color: C.text, fontSize: 15 }}>{producto.nombre}</span>
              <span style={{ fontFamily: T.mono, color: C.textMuted, fontSize: 11 }}>{producto.id}</span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: T.font }}>
              <span style={{ color: C.textMuted }}>{producto.variantes.length} variantes</span>
              <span style={{ color: C.textMuted }}>Stock total: <span style={{ fontFamily: T.mono, color: C.text, fontWeight: 600 }}>{totalStock}</span></span>
              {sinStock > 0 && <span style={{ color: C.red }}>{sinStock} sin stock</span>}
              {bajStock > 0 && <span style={{ color: C.amber }}>{bajStock} stock bajo</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: C.textMuted, fontSize: 14, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
          </div>
        </div>

        <div style={{ padding: "0 20px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowAddVar(true); setExpanded(true); }} style={btnSecondary}>+ Variante</button>
            <button onClick={handleSyncAll} disabled={!!syncProgress} style={{ ...btnGreen, opacity: syncProgress ? 0.6 : 1 }}>
              {syncProgress ? `Sync ${syncProgress.current}/${syncProgress.total}` : "↑ Sync todo"}
            </button>
            <button onClick={handleDelete} style={{ ...btnRed, marginLeft: "auto" }}>Eliminar</button>
          </div>
          {syncProgress && <ProgressBar current={syncProgress.current} total={syncProgress.total} label={syncProgress.label} />}
        </div>

        {expanded && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px" }}>
            {producto.variantes.length === 0 ? (
              <p style={{ color: C.textDim, fontSize: 13, margin: 0, fontFamily: T.font }}>Sin variantes — presioná "+ Variante"</p>
            ) : producto.variantes.map(v => (
              <VarianteRow key={v.id} productoId={producto.id} variante={v} onRefresh={onRefresh} onToast={onToast} />
            ))}
          </div>
        )}
      </div>

      {showAddVar && <AddVarianteModal productoId={producto.id} onClose={() => setShowAddVar(false)} onAdded={() => { onRefresh(); setShowAddVar(false); onToast("Variante agregada"); }} />}
    </>
  );
}

// ── Create Producto Modal ─────────────────────────────────────────────────────
function CreateProductoModal({ onClose, onCreated, showToast, loadTnProducts }: { onClose: () => void; onCreated: () => void; showToast: (m: string, t?: string) => void; loadTnProducts: () => Promise<TnProduct[]> }) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TnProduct | null>(null);
  const [nombre, setNombre] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  useEffect(() => { loadTnProducts().then(d => { setTnProducts(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const q = search.toLowerCase();
  const filtered = tnProducts
    .filter(p => { const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name); return !EXCLUIR.test(n); })
    .filter(p => { const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name); return !q || n.toLowerCase().includes(q); });

  function getPName(p: TnProduct) { return typeof p.name === "object" ? (p.name.es || `Producto ${p.id}`) : String(p.name); }
  function handleSelect(p: TnProduct) { setSelected(p); setNombre(getPName(p)); setStep("confirm"); }

  async function handleCreate() {
    if (!selected || !nombre) return;
    const variantesConStock = selected.variants.filter(v => v.stock !== null && v.stock > 0);
    const total = 1 + variantesConStock.length * 2;
    let paso = 0;
    setProgress({ current: 0, total, label: "Creando producto..." });
    try {
      await api("POST", "/productos", { id: nombre, nombre });
      paso++; setProgress({ current: paso, total, label: "Importando variantes..." });
      const pName = getPName(selected);
      const productoId = nombre.toUpperCase().replace(/\s+/g, "_");
      for (const v of variantesConStock) {
        const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
        setProgress({ current: paso, total, label: `Creando: ${vLabel}` });
        const nv = await api("POST", `/productos/${productoId}/variantes`, { label: vLabel, stock: v.stock });
        paso++; setProgress({ current: paso, total, label: `Vinculando: ${vLabel}` });
        await api("POST", `/productos/${productoId}/variantes/${nv.id}/links`, { product_id: String(selected.id), variant_id: String(v.id), label: `${pName} · ${vLabel}` });
        paso++;
      }
      setProgress({ current: total, total, label: `Listo — ${variantesConStock.length} variante(s) importadas` });
      showToast(`"${nombre}" creado con ${variantesConStock.length} variante(s)`);
      setTimeout(onCreated, 1000);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error", "error"); setProgress(null); }
  }

  const variantesConStock = selected?.variants.filter(v => v.stock !== null && v.stock > 0) || [];
  const variantesSinStock = selected?.variants.filter(v => !v.stock || v.stock === 0) || [];

  return (
    <Modal title={step === "select" ? "Nuevo producto" : "Confirmar importación"} subtitle={step === "select" ? "Elegí el producto base de Tiendanube" : nombre} onClose={onClose} wide>
      {step === "select" ? (
        <>
          <input autoFocus style={{ ...inp, marginBottom: 14 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          {loading && <p style={{ color: C.textMuted, textAlign: "center", fontFamily: T.font }}>Cargando productos...</p>}
          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.map(p => {
              const n = getPName(p);
              const conStock = p.variants.filter(v => v.stock && v.stock > 0).length;
              return (
                <div key={p.id} onClick={() => handleSelect(p)}
                  style={{ padding: "13px 16px", borderRadius: 8, cursor: "pointer", background: C.bg, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderHover)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 500, fontSize: 14, fontFamily: T.font }}>{n}</div>
                    <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3, fontFamily: T.font }}>{p.variants.length} variantes · {conStock} con stock</div>
                  </div>
                  <span style={{ color: C.textMuted, fontSize: 16 }}>→</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Nombre en Stock Central</label>
            <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} disabled={!!progress} autoFocus />
          </div>
          <div style={{ ...card, padding: 14, marginBottom: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: T.font }}>
              Variantes a importar ({variantesConStock.length})
            </div>
            {variantesConStock.map(v => {
              const vl = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
              return (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.text, fontFamily: T.font }}>{vl}</span>
                  <span style={{ color: C.accent, fontFamily: T.mono, fontWeight: 600 }}>{v.stock}</span>
                </div>
              );
            })}
            {variantesConStock.length === 0 && <p style={{ color: C.textMuted, fontSize: 13, margin: 0, fontFamily: T.font }}>Ninguna variante tiene stock</p>}
            {variantesSinStock.length > 0 && <p style={{ color: C.textMuted, fontSize: 12, marginTop: 8, marginBottom: 0, fontFamily: T.font }}>{variantesSinStock.length} sin stock no se importarán</p>}
          </div>
          {progress && <div style={{ marginBottom: 16 }}><ProgressBar current={progress.current} total={progress.total} label={progress.label} /></div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("select")} style={{ ...btnSecondary, opacity: progress ? 0.4 : 1 }} disabled={!!progress}>← Volver</button>
            <button onClick={handleCreate} disabled={!!progress || !nombre} style={{ ...btnPrimary, flex: 1, opacity: progress || !nombre ? 0.5 : 1 }}>
              {progress ? `Importando ${progress.current}/${progress.total}...` : `Crear e importar ${variantesConStock.length} variante(s)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Config Panel ──────────────────────────────────────────────────────────────
function ConfigPanel({ onSaved }: { onSaved: () => void }) {
  const [token, setToken] = useState("");
  const [storeId, setStoreId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSave() {
    try { await api("POST", "/config", { access_token: token, store_id: storeId }); setResult({ ok: true, msg: "Credenciales guardadas" }); setTimeout(onSaved, 800); }
    catch (e: unknown) { setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" }); }
  }
  async function handleTest() {
    try { const r = await api("POST", "/config/test"); setResult({ ok: true, msg: r.store_name }); }
    catch (e: unknown) { setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" }); }
  }
  async function handleWebhook() {
    if (!webhookUrl) return;
    try { const r = await api("POST", "/config/webhook", { webhook_url: webhookUrl }); setResult({ ok: true, msg: r.message }); }
    catch (e: unknown) { setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" }); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <div><label style={lbl}>Store ID</label><input style={inp} value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="1443972" /></div>
      <div><label style={lbl}>Access Token</label><input style={inp} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="af56c0..." /></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={btnPrimary}>Guardar</button>
        <button onClick={handleTest} style={btnSecondary}>Probar conexión</button>
      </div>
      <div><label style={lbl}>URL pública (webhooks)</label><input style={inp} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://stock-central-production.up.railway.app" /></div>
      <button onClick={handleWebhook} style={{ ...btnGreen, padding: "10px 18px", fontSize: 13 }}>Registrar webhooks en Tiendanube</button>
      {result && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: result.ok ? C.accentDim : C.redDim, border: `1px solid ${result.ok ? C.accentBorder : "#3f1515"}`, color: result.ok ? C.accent : C.red, fontSize: 13, fontFamily: T.font }}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

// ── Matchs ────────────────────────────────────────────────────────────────────

function CreateMatchModal({ onClose, onCreated }: { onClose: () => void; onCreated: (m: unknown) => void }) {
  const [nombre, setNombre] = useState("");
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [prod1, setProd1] = useState<TnProduct | null>(null);
  const [prod2, setProd2] = useState<TnProduct | null>(null);
  const [matchProduct, setMatchProduct] = useState<TnProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("GET", "/tn-products").then((data: TnProduct[]) => { setTnProducts(data); setLoading(false); })
      .catch(() => { setErr("No se pudieron cargar los productos"); setLoading(false); });
  }, []);

  function getPName(p: TnProduct) { return typeof p.name === "object" ? (p.name.es || `Producto ${p.id}`) : String(p.name); }

  async function handle() {
    if (!nombre.trim()) return setErr("El nombre es obligatorio");
    if (!matchProduct) return setErr("Seleccioná el producto contenedor del Match");
    if (!prod1) return setErr("Seleccioná el Producto 1");
    if (!prod2) return setErr("Seleccioná el Producto 2");
    if (prod1.id === prod2.id) return setErr("Los productos deben ser distintos");
    setSaving(true);
    try {
      const r = await api("POST", "/matchs", {
        nombre: nombre.trim(),
        tn_match_product_id: String(matchProduct.id),
        producto1: { tn_product_id: String(prod1.id), nombre: getPName(prod1) },
        producto2: { tn_product_id: String(prod2.id), nombre: getPName(prod2) },
      });
      onCreated(r);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    setSaving(false);
  }

  function ProductSelect({ label, value, onChange }: { label: string; value: TnProduct | null; onChange: (p: TnProduct | null) => void }) {
    return (
      <div>
        <label style={lbl}>{label}</label>
        {loading ? (
          <div style={{ color: C.textMuted, fontSize: 13, fontFamily: T.font, padding: "10px 0" }}>Cargando...</div>
        ) : (
          <select
            value={value?.id || ""}
            onChange={e => onChange(tnProducts.find(p => String(p.id) === e.target.value) || null)}
            style={{ ...inp, cursor: "pointer" }}
          >
            <option value="">— Elegir producto —</option>
            {tnProducts.filter(p => !EXCLUIR.test(getPName(p))).map(p => (
              <option key={p.id} value={p.id}>{getPName(p)}</option>
            ))}
          </select>
        )}
        {value && (
          <div style={{ marginTop: 6, padding: "6px 10px", background: C.bg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, color: C.blue, fontSize: 11, fontFamily: T.mono }}>
            ID #{value.id} · {value.variants?.length || 0} variante(s)
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal title="Nuevo Match" subtitle="Combiná dos productos en una página" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={lbl}>Nombre del Match</label>
          <input style={inp} placeholder='ej: Wall-E y Eva' value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
        </div>
        <div style={{ padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.textMuted, fontFamily: T.font, lineHeight: 1.6 }}>
          <span style={{ color: C.amber, fontWeight: 600 }}>Antes de continuar:</span> creá un producto en Tiendanube llamado "Match [nombre]" con el precio del combo y las fotos. Ese es el <strong style={{ color: C.text }}>producto contenedor</strong>.
        </div>
        <ProductSelect label="Producto contenedor (la página del Match en TN)" value={matchProduct} onChange={setMatchProduct} />
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontFamily: T.font }}>Productos individuales (con stock real)</div>
        </div>
        <ProductSelect label="Producto 1" value={prod1} onChange={setProd1} />
        <div style={{ textAlign: "center", color: C.textDim, fontSize: 20 }}>+</div>
        <ProductSelect label="Producto 2" value={prod2} onChange={setProd2} />
        {err && <p style={{ color: C.red, fontSize: 13, margin: 0, fontFamily: T.font }}>{err}</p>}
        <button onClick={handle} disabled={saving || loading}
          style={{ ...btnPrimary, background: C.pink, opacity: saving || loading ? 0.5 : 1 }}>
          {saving ? "Creando..." : "Crear Match 💞"}
        </button>
      </div>
    </Modal>
  );
}

function MatchsView({ onToast }: { onToast: (m: string, t?: string) => void }) {
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function loadMatchs() {
    try { const data = await api("GET", "/matchs"); setMatchs(Array.isArray(data) ? data : []); }
    catch (_e) { onToast("Error cargando Matchs", "error"); }
    setLoading(false);
  }

  useEffect(() => { loadMatchs(); }, []);

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar Match "${nombre}"?`)) return;
    try { await api("DELETE", `/matchs/${id}`); setMatchs(prev => prev.filter(m => m.id !== id)); onToast("Match eliminado"); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  return (
    <div>
      <div style={{ ...card, padding: "14px 18px", marginBottom: 20, borderColor: C.blueBorder }}>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 13, fontFamily: T.font, lineHeight: 1.6 }}>
          <span style={{ color: C.blue, fontWeight: 600 }}>¿Cómo funciona?</span> El script detecta si la página de producto
          es un Match e inyecta dos selectores de talle, agregando ambos al carrito en un click.
          Endpoint: <span style={{ fontFamily: T.mono, color: C.amber, fontSize: 12 }}>/api/matchs</span>
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => setShowCreate(true)} style={{ ...btnPrimary, background: C.pink }}>+ Nuevo Match</button>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontFamily: T.font }}>Cargando...</div>
      ) : matchs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "72px 20px", color: C.textMuted }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>💞</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Sin Matchs todavía</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Creá tu primer Match para combinar dos productos en una página</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {matchs.map(m => (
            <div key={m.id} style={{ ...card, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16 }}>💞</span>
                  <span style={{ fontWeight: 600, color: C.text, fontSize: 15, fontFamily: T.font }}>{m.nombre}</span>
                  <span style={{ background: C.pinkDim, color: C.pink, border: `1px solid ${C.pinkBorder}`, borderRadius: 4, padding: "1px 7px", fontSize: 11, fontFamily: T.mono }}>
                    página #{m.tn_match_product_id}
                  </span>
                </div>
                <button onClick={() => handleDelete(m.id, m.nombre)} style={btnRed}>Eliminar</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {[m.producto1, m.producto2].map((p, i) => (
                  <>
                    {i === 1 && <span key="plus" style={{ color: C.textDim, fontSize: 18 }}>+</span>}
                    <div key={p.tn_product_id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontFamily: T.font }}>
                      <span style={{ color: C.textMuted }}>Producto {i + 1} · </span>
                      <span style={{ color: C.text, fontWeight: 500 }}>{p.nombre}</span>
                      <span style={{ color: C.textMuted, fontFamily: T.mono, marginLeft: 8, fontSize: 11 }}>#{p.tn_product_id}</span>
                    </div>
                  </>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreate && (
        <CreateMatchModal
          onClose={() => setShowCreate(false)}
          onCreated={m => { setMatchs(prev => [...prev, m as Match]); setShowCreate(false); onToast(`Match "${(m as Match).nombre}" creado`); }}
        />
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"loading" | "config" | "dashboard">("loading");
  const [tab, setTab] = useState<"productos" | "matchs">("productos");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [tnCache, setTnCache] = useState<TnProduct[]>([]);

  const showToast = useCallback((msg: string, type = "success") => setToast({ msg, type }), []);

  const loadData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api("GET", "/productos"), api("GET", "/stats")]);
      setProductos(p); setStats(s);
    } catch (_e) { }
  }, []);

  useEffect(() => {
    document.title = "Stock Central de Minch";
    api("GET", "/config").then((cfg: { has_token: boolean }) => {
      setView(cfg.has_token ? "dashboard" : "config");
      if (cfg.has_token) loadData();
    }).catch(() => setView("config"));
  }, [loadData]);

  async function loadTnProducts() {
    if (tnCache.length > 0) return tnCache;
    const data = await api("GET", "/tn-products");
    setTnCache(data); return data;
  }

  const filtered = productos.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));

  if (view === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: C.textMuted, fontSize: 14 }}>Conectando...</p>
      </div>
    </div>
  );

  const tabStyle = (t: string): CSSProperties => ({
    padding: "7px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13,
    fontFamily: T.font, fontWeight: 500, border: "none", transition: "all 0.15s",
    background: tab === t ? C.text : "transparent",
    color: tab === t ? C.bg : C.textMuted,
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: T.font }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
        input:focus { border-color: #3f3f46 !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, background: `${C.bg}ee`, backdropFilter: "blur(12px)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📦</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: C.text, letterSpacing: "-0.01em" }}>Stock Central</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: -2 }}>Minch · Tiendanube</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {stats?.active_reservations !== undefined && stats.active_reservations > 0 && (
            <span style={{ background: C.amberDim, color: C.amber, border: `1px solid #3d2600`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontFamily: T.mono }}>
              {stats.active_reservations} reserva(s) activa(s)
            </span>
          )}
          {view === "dashboard" && <button onClick={() => setView("config")} style={btnSecondary}>Configuración</button>}
          {view === "config" && productos.length > 0 && <button onClick={() => setView("dashboard")} style={btnSecondary}>← Dashboard</button>}
        </div>
      </div>

      {view === "config" && (
        <div style={{ maxWidth: 600, margin: "48px auto", padding: "0 24px" }}>
          <h2 style={{ color: C.text, fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Configuración</h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 32 }}>Conectá Stock Central con tu tienda de Tiendanube.</p>
          <ConfigPanel onSaved={() => { setView("dashboard"); loadData(); }} />
        </div>
      )}

      {view === "dashboard" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
          {/* Stats */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Productos", value: stats.total_productos, color: C.text },
                { label: "Variantes", value: stats.total_variantes, color: C.text },
                { label: "Links", value: stats.total_links, color: C.text },
                { label: "Stock bajo", value: stats.stock_bajo, color: C.amber },
                { label: "Sin stock", value: stats.sin_stock, color: C.red },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
                  <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ color: s.color, fontFamily: T.mono, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 8, border: `1px solid ${C.border}`, alignSelf: "flex-start", width: "fit-content" }}>
            <button style={tabStyle("productos")} onClick={() => setTab("productos")}>📦 Productos</button>
            <button style={tabStyle("matchs")} onClick={() => setTab("matchs")}>💞 Matchs</button>
          </div>

          {tab === "productos" && (<>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={loadData} style={{ ...btnSecondary, padding: "9px 14px" }} title="Actualizar">↻</button>
              <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ Nuevo producto</button>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "72px 20px", color: C.textMuted }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📦</div>
                <p style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{productos.length === 0 ? "Sin productos todavía" : "Sin resultados"}</p>
                {productos.length === 0 && <p style={{ fontSize: 13, marginTop: 6 }}>Creá tu primer producto con el botón "+ Nuevo producto"</p>}
              </div>
            ) : filtered.map(p => (
              <ProductoCard key={p.id} producto={p} onRefresh={loadData} onToast={showToast} />
            ))}
            {stats && <ActivityPanel log={stats.recent_log} />}
          </>)}

          {tab === "matchs" && <MatchsView onToast={showToast} />}
        </div>
      )}

      {showCreate && (
        <CreateProductoModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); }}
          showToast={showToast}
          loadTnProducts={loadTnProducts}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}