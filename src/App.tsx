import { useState, useEffect, useCallback, CSSProperties } from "react";

const API = "https://stock-central-production.up.railway.app/api";

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

const S: Record<string, CSSProperties> = {
  inp: { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" },
  lbl: { display: "block", color: "#94a3b8", fontSize: 11, marginBottom: 5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" },
  btn: { padding: "9px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSm: { padding: "5px 10px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 5, cursor: "pointer", fontSize: 12 },
  btnGreen: { padding: "5px 10px", background: "#065f46", color: "#4ade80", border: "1px solid #166534", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 700 },
  btnRed: { padding: "5px 10px", background: "none", color: "#f87171", border: "1px solid #991b1b", borderRadius: 5, cursor: "pointer", fontSize: 12 },
  card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 20 },
};

type TnVariant = { id: number; values: Record<string,string>[]; sku: string; stock: number };
type TnProduct = { id: number; name: { es?: string } | string; variants: TnVariant[] };
type Link = { product_id: string; variant_id: string; label: string };
type LogEntry = { ts: string; action: string; stock: number; delta?: number; reason?: string; order_id?: string };
type Variante = { id: string; label: string; stock: number; links: Link[]; log: LogEntry[] };
type Producto = { id: string; nombre: string; variantes: Variante[] };
type Stats = { total_productos: number; total_variantes: number; total_links: number; stock_bajo: number; sin_stock: number; recent_log: (LogEntry & { producto: string; variante: string })[] };

function Toast({ msg, type, onClose }: { msg: string; type: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const color = type === "error" ? "#ef4444" : "#22c55e";
  return <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, background: "#0f172a", border: `1px solid ${color}`, borderRadius: 8, padding: "12px 18px", color: "#f8fafc", fontSize: 14, maxWidth: 340, display: "flex", gap: 10 }}>
    <span style={{ color }}>{type === "error" ? "⚠" : "✓"}</span>{msg}
  </div>;
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 28, width: "100%", maxWidth: wide ? 700 : 520, maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: "#f8fafc", fontSize: 16, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 22 }}>×</button>
      </div>
      {children}
    </div>
  </div>;
}

// ── Modal: Agregar variante interna ──────────────────────────────────────────
function AddVarianteModal({ productoId, onClose, onAdded }: { productoId: string; onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handle() {
    if (!label) return setErr("El nombre es obligatorio");
    setLoading(true);
    try {
      await api("POST", `/productos/${productoId}/variantes`, { label, stock: parseInt(stock) || 0 });
      onAdded();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }

  return <Modal title="Nueva variante" onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={S.lbl}>NOMBRE (ej: S / BLANCO)</label>
        <input style={S.inp} placeholder="S / BLANCO" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
      </div>
      <div>
        <label style={S.lbl}>STOCK INICIAL</label>
        <input style={{ ...S.inp, fontFamily: "monospace" }} type="number" min="0" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} />
      </div>
      {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}
      <button onClick={handle} disabled={loading} style={S.btn}>{loading ? "Agregando..." : "Agregar variante"}</button>
    </div>
  </Modal>;
}

// ── Modal: Ajustar stock ─────────────────────────────────────────────────────
function AdjustStockModal({ productoId, variante, onClose, onAdjusted }: { productoId: string; variante: Variante; onClose: () => void; onAdjusted: () => void }) {
  const [mode, setMode] = useState<"add"|"subtract"|"set">("add");
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
  const mBtn = (m: "add"|"subtract"|"set", l: string) =>
    <button onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid", borderColor: mode===m?"#3b82f6":"#334155", background: mode===m?"#1e3a5f":"#1e293b", color: mode===m?"#60a5fa":"#64748b", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{l}</button>;

  return <Modal title={`Ajustar · ${variante.label}`} onClose={onClose}>
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#64748b", fontSize: 13 }}>Stock actual</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 22, color: variante.stock === 0 ? "#ef4444" : "#22c55e" }}>{variante.stock}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{mBtn("add","+ Agregar")}{mBtn("subtract","− Restar")}{mBtn("set","= Fijar")}</div>
      <input autoFocus style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: 12, color: "#f8fafc", width: "100%", fontSize: 22, fontFamily: "monospace", fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center" }}
        type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
      {preview !== null && <div style={{ background: "#0d2e1a", border: "1px solid #166534", borderRadius: 6, padding: "10px", color: "#4ade80", textAlign: "center" }}>
        Resultado: <strong style={{ fontFamily: "monospace", fontSize: 18 }}>{preview}</strong>
      </div>}
      <input style={S.inp} placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>
        <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
        Sincronizar a Tiendanube automáticamente
      </label>
      <button onClick={handle} disabled={loading || !amount} style={S.btn}>{loading ? "Aplicando..." : "Aplicar"}</button>
    </div>
  </Modal>;
}

// ── Modal: Vincular a Tiendanube ─────────────────────────────────────────────
function LinkModal({ productoId, variante, onClose, onLinked }: { productoId: string; variante: Variante; onClose: () => void; onLinked: () => void }) {
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ product_id: string; variant_id: string; label: string } | null>(null);
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("GET", "/tn-products").then((data: TnProduct[]) => { setTnProducts(data); setLoading(false); })
      .catch(() => { setErr("Error cargando productos"); setLoading(false); });
  }, []);

  const q = search.toLowerCase();
const EXCLUIR = /personaliz/i;
const filtered = tnProducts.filter(p => {
    const pName = typeof p.name === "object" ? (p.name.es || "") : p.name;
    return !EXCLUIR.test(pName);
  }).map(p => {
    const pName = typeof p.name === "object" ? (p.name.es || "") : p.name;
    const fv = p.variants.filter(v => {
      const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || "";
      return !q || pName.toLowerCase().includes(q) || vLabel.toLowerCase().includes(q) || (v.sku||"").toLowerCase().includes(q);
    });
    return { ...p, _name: pName, variants: fv };
  }).filter(p => p.variants.length > 0);

  async function handleLink() {
    if (!selected) return;
    setLinking(true);
    try {
      await api("POST", `/productos/${productoId}/variantes/${variante.id}/links`, selected);
      onLinked();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    setLinking(false);
  }

  return <Modal title={`Vincular "${variante.label}" a Tiendanube`} onClose={onClose} wide>
    <input autoFocus style={{ ...S.inp, marginBottom: 12 }} placeholder="Buscar producto, variante o SKU..."
      value={search} onChange={e => setSearch(e.target.value)} />
    {loading && <p style={{ color: "#64748b", textAlign: "center" }}>Cargando productos...</p>}
    {err && <p style={{ color: "#f87171" }}>{err}</p>}
    <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
      {filtered.map(p => <div key={p.id}>
        <div style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 0 4px" }}>{p._name}</div>
        {p.variants.map(v => {
          const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
          const label = `${p._name} · ${vLabel}`;
          const isSel = selected?.variant_id === String(v.id);
          const alreadyLinked = variante.links.some(l => l.variant_id === String(v.id));
          return <div key={v.id}
            onClick={() => !alreadyLinked && setSelected({ product_id: String(p.id), variant_id: String(v.id), label })}
            style={{ padding: "7px 12px", borderRadius: 6, cursor: alreadyLinked ? "default" : "pointer", fontSize: 13,
              background: isSel ? "#1e3a5f" : alreadyLinked ? "#0d2e1a" : "#1e293b",
              border: `1px solid ${isSel ? "#3b82f6" : alreadyLinked ? "#166534" : "#334155"}`,
              color: isSel ? "#60a5fa" : alreadyLinked ? "#4ade80" : "#94a3b8",
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span>{vLabel} {alreadyLinked && "✓"}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {v.sku && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>{v.sku}</span>}
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>stock: {v.stock ?? "∞"}</span>
            </div>
          </div>;
        })}
      </div>)}
    </div>
    {selected && <div style={{ marginTop: 12, padding: 10, background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: 6, color: "#60a5fa", fontSize: 13 }}>Seleccionado: {selected.label}</div>}
    {err && <div style={{ marginTop: 8, color: "#f87171", fontSize: 13 }}>{err}</div>}
    <button onClick={handleLink} disabled={linking || !selected} style={{ ...S.btn, marginTop: 14, width: "100%" }}>
      {linking ? "Vinculando..." : "Vincular"}
    </button>
  </Modal>;
}

// ── Fila de variante interna ─────────────────────────────────────────────────
function VarianteRow({ productoId, variante, onRefresh, onToast }: { productoId: string; variante: Variante; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const stockColor = variante.stock === 0 ? "#ef4444" : variante.stock <= 5 ? "#f59e0b" : "#22c55e";

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await api("POST", `/productos/${productoId}/variantes/${variante.id}/sync`);
      onToast(`Sync OK: ${r.updated} variante(s) actualizadas`);
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
    setSyncing(false);
  }

  async function handleUnlink(variant_id: string) {
    try {
      await api("DELETE", `/productos/${productoId}/variantes/${variante.id}/links/${variant_id}`);
      onRefresh();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar variante "${variante.label}"?`)) return;
    try {
      await api("DELETE", `/productos/${productoId}/variantes/${variante.id}`);
      onRefresh();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  return <>
    <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px", marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: stockColor, boxShadow: `0 0 6px ${stockColor}`, flexShrink: 0 }} />
        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#f8fafc", fontSize: 13, flex: 1 }}>{variante.label}</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: stockColor }}>{variante.stock}</span>
      </div>

      {/* Links */}
      {variante.links.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {variante.links.map(l => (
            <span key={l.variant_id} style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#60a5fa", display: "flex", alignItems: "center", gap: 6 }}>
              {l.label}
              <button onClick={() => handleUnlink(l.variant_id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => setShowAdjust(true)} style={S.btnSm}>± Stock</button>
        <button onClick={() => setShowLink(true)} style={S.btnSm}>+ Vincular</button>
        {variante.links.length > 0 && (
          <button onClick={handleSync} disabled={syncing} style={S.btnGreen}>{syncing ? "..." : "↑ Sync"}</button>
        )}
        <button onClick={() => setShowLog(!showLog)} style={S.btnSm}>📋 Log</button>
        <button onClick={handleDelete} style={{ ...S.btnRed, marginLeft: "auto" }}>🗑</button>
      </div>

      {/* Log */}
      {showLog && variante.log.length > 0 && (
        <div style={{ marginTop: 10, borderTop: "1px solid #1e293b", paddingTop: 10 }}>
          {variante.log.slice(0, 6).map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, color: "#64748b", padding: "3px 0" }}>
              <span style={{ fontFamily: "monospace", minWidth: 85 }}>{fmt(l.ts)}</span>
              <span style={{ color: l.action === "sale" ? "#f87171" : l.action === "return" ? "#4ade80" : "#94a3b8" }}>{l.action}</span>
              {l.delta !== undefined && <span style={{ color: l.delta > 0 ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
              <span>stock: <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{l.stock}</strong></span>
              {l.reason && <span>{l.reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>

    {showAdjust && <AdjustStockModal productoId={productoId} variante={variante}
      onClose={() => setShowAdjust(false)} onAdjusted={() => { onRefresh(); onToast("Stock actualizado"); }} />}
    {showLink && <LinkModal productoId={productoId} variante={variante}
      onClose={() => setShowLink(false)} onLinked={() => { onRefresh(); setShowLink(false); onToast("Variante vinculada"); }} />}
  </>;
}

// ── Card de Producto ─────────────────────────────────────────────────────────
function ProductoCard({ producto, onRefresh, onToast }: { producto: Producto; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddVar, setShowAddVar] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const totalStock = producto.variantes.reduce((a, v) => a + v.stock, 0);
  const sinStock = producto.variantes.filter(v => v.stock === 0).length;

  async function handleSyncAll() {
    setSyncing(true);
    try {
      await api("POST", `/productos/${producto.id}/sync`);
      onToast(`Sync completo: ${producto.nombre}`);
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
    setSyncing(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar producto "${producto.nombre}" y todas sus variantes?`)) return;
    try { await api("DELETE", `/productos/${producto.id}`); onRefresh(); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  return <>
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setExpanded(!expanded)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#f8fafc", fontSize: 15 }}>{producto.nombre}</span>
            <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace" }}>{producto.id}</span>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#64748b" }}>{producto.variantes.length} variantes</span>
            <span style={{ color: "#64748b" }}>stock total: <strong style={{ color: "#94a3b8", fontFamily: "monospace" }}>{totalStock}</strong></span>
            {sinStock > 0 && <span style={{ color: "#f87171" }}>{sinStock} sin stock</span>}
          </div>
        </div>
        <span style={{ color: "#334155", fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Actions */}
      <div style={{ padding: "0 20px 14px", display: "flex", gap: 8 }}>
        <button onClick={() => { setShowAddVar(true); setExpanded(true); }} style={S.btnSm}>+ Variante</button>
        <button onClick={handleSyncAll} disabled={syncing} style={S.btnGreen}>{syncing ? "Sincronizando..." : "↑ Sync todo"}</button>
        <button onClick={handleDelete} style={{ ...S.btnRed, marginLeft: "auto" }}>🗑</button>
      </div>

      {/* Variantes */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1e293b", padding: "14px 20px" }}>
          {producto.variantes.length === 0 ? (
            <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>Sin variantes — presioná "+ Variante" para agregar</p>
          ) : (
            producto.variantes.map(v => (
              <VarianteRow key={v.id} productoId={producto.id} variante={v} onRefresh={onRefresh} onToast={onToast} />
            ))
          )}
        </div>
      )}
    </div>

    {showAddVar && <AddVarianteModal productoId={producto.id}
      onClose={() => setShowAddVar(false)} onAdded={() => { onRefresh(); setShowAddVar(false); onToast("Variante agregada"); }} />}
  </>;
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"loading"|"config"|"dashboard">("loading");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [tnProductsCache, setTnProductsCache] = useState<TnProduct[]>([]);

  const showToast = useCallback((msg: string, type = "success") => setToast({ msg, type }), []);

  const loadData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api("GET", "/productos"), api("GET", "/stats")]);
      setProductos(p); setStats(s);
    } catch (_e) { }
  }, []);

  useEffect(() => {
    api("GET", "/config").then((cfg: { has_token: boolean }) => {
      setView(cfg.has_token ? "dashboard" : "config");
      if (cfg.has_token) loadData();
    }).catch(() => setView("config"));
  }, [loadData]);

  async function handleCreateProducto() {
    if (!newNombre) return;
    try {
      await api("POST", "/productos", { id: newNombre, nombre: newNombre });
      setNewNombre(""); setShowCreate(false); loadData();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  async function loadTnProducts() {
    if (tnProductsCache.length > 0) return tnProductsCache;
    const data = await api("GET", "/tn-products");
    setTnProductsCache(data);
    return data;
  }

  const filtered = productos.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));

  if (view === "loading") return <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>Conectando...</div>;

  if (view === "config") return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f8fafc", fontFamily: "monospace", padding: 24 }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2 style={{ color: "#f8fafc", marginBottom: 24 }}>⚙️ Configuración</h2>
        <ConfigPanel onSaved={() => { setView("dashboard"); loadData(); }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f8fafc", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3b82f6, #06b6d4)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📦</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.05em" }}>STOCK CENTRAL</span>
          <span style={{ color: "#334155", fontSize: 12 }}>/ Tiendanube</span>
        </div>
        <button onClick={() => setView("config")} style={S.btnSm}>⚙ Config</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Productos", value: stats.total_productos, color: "#60a5fa" },
              { label: "Variantes", value: stats.total_variantes, color: "#a78bfa" },
              { label: "Stock bajo", value: stats.stock_bajo, color: "#fbbf24" },
              { label: "Sin stock", value: stats.sin_stock, color: "#f87171" },
            ].map(s => (
              <div key={s.label} style={S.card}>
                <div style={{ color: "#475569", fontSize: 10, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <div style={{ color: s.color, fontFamily: "monospace", fontSize: 26, fontWeight: 700 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input style={{ ...S.inp, flex: 1 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={loadData} style={S.btnSm} title="Actualizar">↻</button>
          <button onClick={() => setShowCreate(true)} style={S.btn}>+ Nuevo producto</button>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p style={{ fontSize: 16 }}>{productos.length === 0 ? "No hay productos todavía" : "Sin resultados"}</p>
            {productos.length === 0 && <p style={{ fontSize: 13 }}>Creá tu primer producto con el botón "+ Nuevo producto"</p>}
          </div>
        ) : filtered.map(p => (
          <ProductoCard key={p.id} producto={p} onRefresh={loadData} onToast={showToast} />
        ))}

        {/* Actividad reciente */}
        {stats?.recent_log && stats.recent_log.length > 0 && (
          <div style={{ ...S.card, marginTop: 24 }}>
            <div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Actividad reciente</div>
            {stats.recent_log.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: i < stats.recent_log.length - 1 ? "1px solid #1e293b" : "none", fontSize: 12 }}>
                <span style={{ color: "#475569", fontFamily: "monospace", minWidth: 85 }}>{fmt(l.ts)}</span>
                <span style={{ color: "#60a5fa", minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.producto}</span>
                <span style={{ color: "#94a3b8", minWidth: 80 }}>{l.variante}</span>
                <span style={{ color: l.action === "sale" ? "#f87171" : l.action === "return" ? "#4ade80" : "#64748b" }}>{l.action}</span>
                {l.delta !== undefined && <span style={{ color: l.delta > 0 ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
                <span style={{ color: "#475569" }}>→ <strong style={{ color: "#94a3b8", fontFamily: "monospace" }}>{l.stock}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear producto */}
      {showCreate && (
        <CreateProductoModal
          onClose={() => { setShowCreate(false); setNewNombre(""); }}
          onCreated={() => { setShowCreate(false); setNewNombre(""); loadData(); }}
          showToast={showToast}
          loadTnProducts={loadTnProducts}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Modal: Crear producto desde Tiendanube ───────────────────────────────────
function CreateProductoModal({ onClose, onCreated, showToast, loadTnProducts }: {
  onClose: () => void;
  onCreated: () => void;
  showToast: (m: string, t?: string) => void;
  loadTnProducts: () => Promise<TnProduct[]>;
}) {
  const [step, setStep] = useState<"select"|"confirm">("select");
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TnProduct | null>(null);
  const [nombre, setNombre] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTnProducts().then(data => { setTnProducts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = tnProducts.filter(p => {
    const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name);
    return !q || n.toLowerCase().includes(q);
  });

  function getPName(p: TnProduct) {
    return typeof p.name === "object" ? (p.name.es || `Producto ${p.id}`) : String(p.name);
  }

  function handleSelect(p: TnProduct) {
    setSelected(p);
    setNombre(getPName(p));
    setStep("confirm");
  }

  async function handleCreate() {
    if (!selected || !nombre) return;
    setCreating(true);
    try {
      // 1. Crear el producto en stock central
      await api("POST", "/productos", { id: nombre, nombre });

      const pName = getPName(selected);
      const productoId = nombre.toUpperCase().replace(/\s+/g, "_");

      // 2. Por cada variante con stock > 0, crear variante interna + vincularla
      const variantesConStock = selected.variants.filter(v => v.stock !== null && v.stock > 0);
      
      for (const v of variantesConStock) {
        const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
        // Crear variante interna
        const nuevaVar = await api("POST", `/productos/${productoId}/variantes`, {
          label: vLabel,
          stock: v.stock
        });
        // Vincular al producto base de Tiendanube
        await api("POST", `/productos/${productoId}/variantes/${nuevaVar.id}/links`, {
          product_id: String(selected.id),
          variant_id: String(v.id),
          label: `${pName} · ${vLabel}`
        });
      }

      showToast(`Producto creado con ${variantesConStock.length} variante(s) importadas`);
      onCreated();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error", "error");
    }
    setCreating(false);
  }

  // Variantes con stock del producto seleccionado
  const variantesConStock = selected?.variants.filter(v => v.stock !== null && v.stock > 0) || [];
  const variantesSinStock = selected?.variants.filter(v => !v.stock || v.stock === 0) || [];

  return (
    <Modal title={step === "select" ? "Nuevo producto — Elegí el base" : `Confirmar: ${nombre}`} onClose={onClose} wide>
      {step === "select" ? (
        <>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
            Elegí el producto de Tiendanube que va a ser la base. Se importarán sus variantes y stock automáticamente.
          </p>
          <input autoFocus style={{ ...S.inp, marginBottom: 12 }}
            placeholder="Buscar producto en Tiendanube..." value={search} onChange={e => setSearch(e.target.value)} />
          {loading && <p style={{ color: "#64748b", textAlign: "center" }}>Cargando productos...</p>}
          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.map(p => {
              const n = getPName(p);
              const conStock = p.variants.filter(v => v.stock && v.stock > 0).length;
              return (
                <div key={p.id} onClick={() => handleSelect(p)}
                  style={{ padding: "12px 14px", borderRadius: 8, cursor: "pointer", background: "#1e293b", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}>
                  <div>
                    <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14 }}>{n}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{p.variants.length} variantes totales · {conStock} con stock</div>
                  </div>
                  <span style={{ color: "#3b82f6", fontSize: 18 }}>→</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={S.lbl}>NOMBRE EN STOCK CENTRAL</label>
            <input style={S.inp} value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
            <p style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>Podés cambiarle el nombre. Ej: "BABY TEE" en vez del nombre largo de Tiendanube.</p>
          </div>

          <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Variantes que se importarán ({variantesConStock.length})
            </div>
            {variantesConStock.map(v => {
              const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
              return (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                  <span style={{ color: "#94a3b8" }}>{vLabel}</span>
                  <span style={{ color: "#22c55e", fontFamily: "monospace", fontWeight: 700 }}>{v.stock}</span>
                </div>
              );
            })}
            {variantesConStock.length === 0 && <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Ninguna variante tiene stock — se creará el producto vacío</p>}
            {variantesSinStock.length > 0 && (
              <p style={{ color: "#475569", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                {variantesSinStock.length} variante(s) sin stock no se importarán (las podés agregar cuando tengan stock)
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("select")} style={S.btnSm}>← Volver</button>
            <button onClick={handleCreate} disabled={creating || !nombre} style={{ ...S.btn, flex: 1 }}>
              {creating ? "Creando e importando..." : `Crear producto e importar ${variantesConStock.length} variante(s)`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}


function ConfigPanel({ onSaved }: { onSaved: () => void }) {
  const [token, setToken] = useState("");
  const [storeId, setStoreId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSave() {
    try { await api("POST", "/config", { access_token: token, store_id: storeId }); setResult({ ok: true, msg: "Guardado ✓" }); setTimeout(onSaved, 600); }
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

  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div><label style={S.lbl}>STORE ID</label><input style={S.inp} value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="1443972" /></div>
    <div><label style={S.lbl}>ACCESS TOKEN</label><input style={S.inp} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="af56c0..." /></div>
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={handleSave} style={S.btn}>Guardar</button>
      <button onClick={handleTest} style={S.btnSm}>Probar conexión</button>
    </div>
    <div><label style={S.lbl}>URL PÚBLICA (para webhooks)</label><input style={S.inp} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://stock-central-production.up.railway.app" /></div>
    <button onClick={handleWebhook} style={{ ...S.btn, background: "#065f46", color: "#4ade80" }}>Registrar webhooks</button>
    {result && <div style={{ padding: 12, borderRadius: 6, background: result.ok ? "#0d2e1a" : "#2e0d0d", color: result.ok ? "#4ade80" : "#f87171", fontSize: 13 }}>{result.msg}</div>}
  </div>;
}