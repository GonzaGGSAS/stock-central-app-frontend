import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const API = "https://stock-central-production.up.railway.app/api";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error desconocido");
  return data;
}

function fmt(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function Badge({ children, color = "gray" }) {
  const colors = {
    green: { bg: "#0d2e1a", text: "#4ade80", border: "#166534" },
    red: { bg: "#2e0d0d", text: "#f87171", border: "#991b1b" },
    yellow: { bg: "#2e260d", text: "#fbbf24", border: "#92400e" },
    gray: { bg: "#1a1a2e", text: "#94a3b8", border: "#334155" },
    blue: { bg: "#0d1a2e", text: "#60a5fa", border: "#1e3a5f" },
    pink: { bg: "#2e0d1a", text: "#f472b6", border: "#9d174d" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      fontFamily: "monospace", letterSpacing: "0.04em"
    }}>{children}</span>
  );
}

function StockBar({ stock, max = 100 }) {
  const pct = Math.min(100, (stock / max) * 100);
  const color = stock === 0 ? "#ef4444" : stock <= 5 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.4s ease", borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "monospace", fontSize: 13, color, minWidth: 30, textAlign: "right", fontWeight: 700 }}>{stock}</span>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const color = type === "error" ? "#ef4444" : "#22c55e";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      background: "#0f172a", border: `1px solid ${color}`, borderRadius: 8,
      padding: "12px 18px", color: "#f8fafc", fontSize: 14, maxWidth: 340,
      boxShadow: `0 0 20px ${color}33`, display: "flex", alignItems: "center", gap: 10
    }}>
      <span style={{ color, fontSize: 18 }}>{type === "error" ? "⚠" : "✓"}</span>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12,
        padding: 28, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#f8fafc", fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── CONFIG VIEW ──────────────────────────────────────────────────────────────

function ConfigView({ onSaved }) {
  const [token, setToken] = useState("");
  const [storeId, setStoreId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSave() {
    setSaving(true);
    try {
      await api("POST", "/config", { access_token: token, store_id: storeId });
      setResult({ ok: true, msg: "Credenciales guardadas ✓" });
      setTimeout(onSaved, 800);
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    try {
      const r = await api("POST", "/config/test");
      setResult({ ok: true, msg: `Conectado a: ${r.store_name}` });
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    setTesting(false);
  }

  async function handleWebhook() {
    if (!webhookUrl) return;
    try {
      const r = await api("POST", "/config/webhook", { webhook_url: webhookUrl });
      setResult({ ok: true, msg: r.message });
    } catch (e) { setResult({ ok: false, msg: e.message }); }
  }

  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
        <h2 style={{ color: "#f8fafc", margin: 0, fontSize: 22 }}>Configuración inicial</h2>
        <p style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>Conectá Stock Central con tu tienda</p>
      </div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ color: "#60a5fa", margin: "0 0 16px", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>1 · Credenciales de API</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>STORE ID</label>
          <input style={inp} placeholder="ej: 2099076" value={storeId} onChange={e => setStoreId(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>ACCESS TOKEN</label>
          <input style={inp} type="password" placeholder="af56c0d9f79f..." value={token} onChange={e => setToken(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !token || !storeId} style={{ flex: 1, padding: "10px 0", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={handleTest} disabled={testing || !token || !storeId} style={{ padding: "10px 16px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            {testing ? "..." : "Probar conexión"}
          </button>
        </div>
      </div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ color: "#60a5fa", margin: "0 0 16px", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>2 · Webhook</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>URL PÚBLICA DEL SERVIDOR</label>
          <input style={inp} placeholder="https://tu-app.railway.app" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
        </div>
        <button onClick={handleWebhook} disabled={!webhookUrl} style={{ padding: "10px 20px", background: "#065f46", color: "#4ade80", border: "1px solid #166534", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          Registrar webhooks en Tiendanube
        </button>
      </div>
      {result && (
        <div style={{ padding: 12, borderRadius: 6, background: result.ok ? "#0d2e1a" : "#2e0d0d", border: `1px solid ${result.ok ? "#166534" : "#991b1b"}`, color: result.ok ? "#4ade80" : "#f87171", fontSize: 13 }}>
          {result.msg}
        </div>
      )}
    </div>
  );
}

// ─── PRODUCTOS COMPONENTS ─────────────────────────────────────────────────────

function CreateProductoModal({ onClose, onCreated, loadTnProducts }) {
  const [nombre, setNombre] = useState("");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handle() {
    if (!id || !nombre) return setErr("ID y nombre son obligatorios");
    setLoading(true);
    try {
      const r = await api("POST", "/productos", { id, nombre });
      onCreated(r);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <Modal title="Nuevo Producto" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>ID INTERNO *</label>
          <input style={{ ...inp, fontFamily: "monospace", textTransform: "uppercase" }} placeholder="ej: BUZO-WALLE" value={id} onChange={e => setId(e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>NOMBRE</label>
          <input style={inp} placeholder="ej: Buzo Wall-E" value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}
        <button onClick={handle} disabled={loading} style={{ padding: "12px 0", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {loading ? "Creando..." : "Crear Producto"}
        </button>
      </div>
    </Modal>
  );
}

function AdjustStockModal({ productoId, varianteId, label, current, onClose, onAdjusted }) {
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [sync, setSync] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handle() {
    const n = parseInt(amount);
    if (isNaN(n) || n < 0) return;
    setLoading(true);
    try {
      let body = { reason, sync };
      if (mode === "set") body.absolute = n;
      else body.delta = mode === "add" ? n : -n;
      const r = await api("PUT", `/productos/${productoId}/variantes/${varianteId}/stock`, body);
      onAdjusted(r.stock, r.sync);
    } catch (e) { }
    setLoading(false);
    onClose();
  }

  const modeBtn = (m, label) => (
    <button onClick={() => setMode(m)} style={{
      flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid",
      borderColor: mode === m ? "#3b82f6" : "#334155",
      background: mode === m ? "#1e3a5f" : "#1e293b",
      color: mode === m ? "#60a5fa" : "#64748b",
      cursor: "pointer", fontWeight: 700, fontSize: 12
    }}>{label}</button>
  );

  return (
    <Modal title={`Ajustar stock · ${label}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#64748b", fontSize: 13 }}>Stock actual</span>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 22, color: current === 0 ? "#ef4444" : "#22c55e" }}>{current}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {modeBtn("add", "+ Agregar")}
          {modeBtn("subtract", "− Restar")}
          {modeBtn("set", "= Fijar")}
        </div>
        <input
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "12px", color: "#f8fafc", width: "100%", fontSize: 20, fontFamily: "monospace", fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center" }}
          type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus
        />
        {amount && !isNaN(parseInt(amount)) && (
          <div style={{ background: "#0d2e1a", border: "1px solid #166534", borderRadius: 6, padding: "10px 14px", color: "#4ade80", fontSize: 14, textAlign: "center" }}>
            Resultado: <strong style={{ fontFamily: "monospace", fontSize: 16 }}>
              {mode === "set" ? parseInt(amount) : mode === "add" ? current + parseInt(amount) : Math.max(0, current - parseInt(amount))}
            </strong>
          </div>
        )}
        <input
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#3b82f6" }} />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Sincronizar a Tiendanube</span>
        </label>
        <button onClick={handle} disabled={loading || !amount} style={{ padding: "12px 0", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {loading ? "Aplicando..." : "Aplicar ajuste"}
        </button>
      </div>
    </Modal>
  );
}

function LinkVariantModal({ productoId, varianteId, onClose, onLinked }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("GET", "/tn-products").then(data => {
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(e => { setErr("No se pudieron cargar los productos."); setLoading(false); });
  }, []);

  async function handleLink() {
    if (!selected) return;
    setLinking(true);
    try {
      await api("POST", `/productos/${productoId}/variantes/${varianteId}/links`, selected);
      onLinked(selected);
    } catch (e) { setErr(e.message); }
    setLinking(false);
  }

  return (
    <Modal title="Vincular a Tiendanube" onClose={onClose}>
      {loading && <p style={{ color: "#64748b", textAlign: "center" }}>Cargando productos...</p>}
      {err && <p style={{ color: "#f87171", fontSize: 13 }}>{err}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
        {products.map(p => (
          <div key={p.id}>
            <div style={{ color: "#94a3b8", fontSize: 11, padding: "6px 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {p.name?.es || p.name || `Producto ${p.id}`}
            </div>
            {(p.variants || []).map(v => {
              const lbl = `${p.name?.es || p.name} · ${v.values?.map(vv => vv.es || vv.en || Object.values(vv)[0]).join(" / ") || v.sku || v.id}`;
              const isSelected = selected?.variant_id === String(v.id);
              return (
                <div key={v.id} onClick={() => setSelected({ product_id: String(p.id), variant_id: String(v.id), label: lbl })}
                  style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: isSelected ? "#1e3a5f" : "#1e293b", border: `1px solid ${isSelected ? "#3b82f6" : "#334155"}`, color: isSelected ? "#60a5fa" : "#94a3b8", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                  <span>{v.values?.map(vv => vv.es || vv.en || Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 12 }}>stock: {v.stock ?? "∞"}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {selected && <div style={{ marginTop: 12, padding: 10, background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: 6, color: "#60a5fa", fontSize: 13 }}>Seleccionado: {selected.label}</div>}
      <button onClick={handleLink} disabled={linking || !selected} style={{ marginTop: 14, padding: "12px 0", width: "100%", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
        {linking ? "Vinculando..." : "Vincular"}
      </button>
    </Modal>
  );
}

function ProductoCard({ producto, onRefresh, onToast }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddVariante, setShowAddVariante] = useState(false);
  const [newVarLabel, setNewVarLabel] = useState("");
  const [newVarStock, setNewVarStock] = useState("");
  const [adjust, setAdjust] = useState(null);
  const [link, setLink] = useState(null);

  async function handleAddVariante() {
    if (!newVarLabel) return;
    try {
      await api("POST", `/productos/${producto.id}/variantes`, { label: newVarLabel, stock: parseInt(newVarStock) || 0 });
      setNewVarLabel(""); setNewVarStock(""); setShowAddVariante(false);
      onRefresh();
      onToast("Variante creada", "success");
    } catch (e) { onToast(e.message, "error"); }
  }

  async function handleSyncAll() {
    try {
      const r = await api("POST", `/productos/${producto.id}/sync`);
      onToast(`Sync OK: ${r.results?.length || 0} variante(s)`, "success");
    } catch (e) { onToast(e.message, "error"); }
  }

  async function handleDeleteProducto() {
    if (!confirm(`¿Eliminar producto ${producto.nombre}?`)) return;
    try { await api("DELETE", `/productos/${producto.id}`); onRefresh(); }
    catch (e) { onToast(e.message, "error"); }
  }

  async function handleDeleteVariante(varId) {
    try { await api("DELETE", `/productos/${producto.id}/variantes/${varId}`); onRefresh(); }
    catch (e) { onToast(e.message, "error"); }
  }

  async function handleUnlink(varId, variant_id) {
    try { await api("DELETE", `/productos/${producto.id}/variantes/${varId}/links/${variant_id}`); onRefresh(); }
    catch (e) { onToast(e.message, "error"); }
  }

  async function handleSyncVariante(varId) {
    try {
      const r = await api("POST", `/productos/${producto.id}/variantes/${varId}/sync`);
      onToast(`Sync OK: ${r.updated} link(s)`, "success");
    } catch (e) { onToast(e.message, "error"); }
  }

  const totalStock = producto.variantes.reduce((a, v) => a + v.stock, 0);
  const stockColor = totalStock === 0 ? "#ef4444" : totalStock <= 5 ? "#f59e0b" : "#22c55e";

  return (
    <>
      <div style={{ background: "#0f172a", border: `1px solid ${expanded ? "#334155" : "#1e293b"}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setExpanded(!expanded)}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: stockColor, flexShrink: 0, boxShadow: `0 0 8px ${stockColor}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#f8fafc", fontSize: 14 }}>{producto.id}</span>
              <span style={{ color: "#64748b", fontSize: 13 }}>{producto.nombre}</span>
            </div>
            <div style={{ color: "#475569", fontSize: 12 }}>
              {producto.variantes.length} variante(s) · stock total: <span style={{ color: stockColor, fontFamily: "monospace", fontWeight: 700 }}>{totalStock}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Badge color="blue">{producto.variantes.length} var</Badge>
            <span style={{ color: "#334155", fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        <div style={{ padding: "0 20px 14px", display: "flex", gap: 8 }}>
          <button onClick={() => setExpanded(true) || setShowAddVariante(true)} style={{ padding: "6px 12px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Variante</button>
          <button onClick={handleSyncAll} style={{ padding: "6px 12px", background: "#065f46", color: "#4ade80", border: "1px solid #166534", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↑ Sync todo</button>
          <button onClick={handleDeleteProducto} style={{ marginLeft: "auto", padding: "6px 10px", background: "none", color: "#64748b", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑</button>
        </div>

        {expanded && (
          <div style={{ borderTop: "1px solid #1e293b", padding: "16px 20px" }}>
            {showAddVariante && (
              <div style={{ background: "#1e293b", borderRadius: 8, padding: 14, marginBottom: 16, display: "flex", gap: 8 }}>
                <input style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f8fafc", fontSize: 13, outline: "none" }}
                  placeholder="Label (ej: Talle S)" value={newVarLabel} onChange={e => setNewVarLabel(e.target.value)} />
                <input style={{ width: 80, background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "8px 10px", color: "#f8fafc", fontSize: 13, outline: "none" }}
                  type="number" placeholder="Stock" value={newVarStock} onChange={e => setNewVarStock(e.target.value)} />
                <button onClick={handleAddVariante} style={{ padding: "8px 14px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Crear</button>
                <button onClick={() => setShowAddVariante(false)} style={{ padding: "8px 10px", background: "none", border: "1px solid #334155", color: "#64748b", borderRadius: 6, cursor: "pointer" }}>✕</button>
              </div>
            )}

            {producto.variantes.length === 0 ? (
              <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>Sin variantes — agregá una con "+ Variante"</p>
            ) : (
              producto.variantes.map(v => (
                <div key={v.id} style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 13 }}>{v.label}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setAdjust(v)} style={{ padding: "4px 8px", background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>± Stock</button>
                      <button onClick={() => setLink(v)} style={{ padding: "4px 8px", background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>+ Link TN</button>
                      <button onClick={() => handleSyncVariante(v.id)} style={{ padding: "4px 8px", background: "#065f46", border: "1px solid #166534", color: "#4ade80", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>↑ Sync</button>
                      <button onClick={() => handleDeleteVariante(v.id)} style={{ padding: "4px 8px", background: "none", border: "1px solid #334155", color: "#64748b", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>🗑</button>
                    </div>
                  </div>
                  <StockBar stock={v.stock} max={Math.max(20, v.stock * 2 || 20)} />
                  {v.links?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {v.links.map(l => (
                        <div key={l.variant_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "#0d1a2e", borderRadius: 4, marginTop: 4, fontSize: 11 }}>
                          <span style={{ color: "#64748b" }}>{l.label || `P:${l.product_id} V:${l.variant_id}`}</span>
                          <button onClick={() => handleUnlink(v.id, l.variant_id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {v.log?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                      Último mov: <span style={{ fontFamily: "monospace" }}>{fmt(v.log[0]?.ts)}</span> · {v.log[0]?.action} · stock: {v.log[0]?.stock}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {adjust && <AdjustStockModal productoId={producto.id} varianteId={adjust.id} label={adjust.label} current={adjust.stock} onClose={() => setAdjust(null)} onAdjusted={() => { onRefresh(); onToast("Stock actualizado", "success"); setAdjust(null); }} />}
      {link && <LinkVariantModal productoId={producto.id} varianteId={link.id} onClose={() => setLink(null)} onLinked={() => { onRefresh(); setLink(null); onToast("Link creado", "success"); }} />}
    </>
  );
}

function CreateMatchModal({ onClose, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [tnProducts, setTnProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prod1, setProd1] = useState(null);
  const [prod2, setProd2] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("GET", "/tn-products").then(data => {
      setTnProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => {
      setErr("No se pudieron cargar los productos de Tiendanube");
      setLoading(false);
    });
  }, []);

  async function handle() {
    if (!nombre.trim()) return setErr("El nombre del Match es obligatorio");
    if (!prod1) return setErr("Seleccioná el Producto 1");
    if (!prod2) return setErr("Seleccioná el Producto 2");
    if (prod1.id === prod2.id) return setErr("Los dos productos deben ser distintos");
    setSaving(true);
    try {
      const r = await api("POST", "/matchs", {
        nombre: nombre.trim(),
        producto1: { tn_product_id: String(prod1.id), nombre: prod1.name?.es || prod1.name || `Producto ${prod1.id}` },
        producto2: { tn_product_id: String(prod2.id), nombre: prod2.name?.es || prod2.name || `Producto ${prod2.id}` }
      });
      onCreated(r);
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" };

  function ProductSelect({ label, value, onChange }) {
    return (
      <div>
        <label style={lbl}>{label}</label>
        {loading ? (
          <div style={{ color: "#64748b", fontSize: 13, padding: "10px 0" }}>Cargando productos...</div>
        ) : (
          <select
            value={value?.id || ""}
            onChange={e => {
              const found = tnProducts.find(p => String(p.id) === e.target.value);
              onChange(found || null);
            }}
            style={{ ...inp, cursor: "pointer" }}
          >
            <option value="">— Elegir producto —</option>
            {tnProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name?.es || p.name || `Producto ${p.id}`}
              </option>
            ))}
          </select>
        )}
        {value && (
          <div style={{ marginTop: 6, padding: "6px 10px", background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: 4, color: "#60a5fa", fontSize: 12, fontFamily: "monospace" }}>
            ID: {value.id} · {value.variants?.length || 0} variante(s)
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal title="Nuevo Match 💞" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={lbl}>NOMBRE DEL MATCH</label>
          <input style={inp} placeholder='ej: "Wall-E y Eva"' value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <ProductSelect label="PRODUCTO 1" value={prod1} onChange={setProd1} />
        <div style={{ textAlign: "center", color: "#475569", fontSize: 20 }}>+</div>
        <ProductSelect label="PRODUCTO 2" value={prod2} onChange={setProd2} />
        {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}
        <button onClick={handle} disabled={saving || loading} style={{ padding: "12px 0", background: "#ec4899", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {saving ? "Creando..." : "Crear Match 💞"}
        </button>
      </div>
    </Modal>
  );
}

function MatchsView({ onToast }) {
  const [matchs, setMatchs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function loadMatchs() {
    try {
      const data = await api("GET", "/matchs");
      setMatchs(Array.isArray(data) ? data : []);
    } catch (e) { onToast("Error cargando Matchs", "error"); }
    setLoading(false);
  }

  useEffect(() => { loadMatchs(); }, []);

  async function handleDelete(id, nombre) {
    if (!confirm(`¿Eliminar Match "${nombre}"?`)) return;
    try {
      await api("DELETE", `/matchs/${id}`);
      setMatchs(prev => prev.filter(m => m.id !== id));
      onToast("Match eliminado", "success");
    } catch (e) { onToast(e.message, "error"); }
  }

  const BACKEND = "https://stock-central-production.up.railway.app";

  return (
    <div>
      {/* Header toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            {matchs.length} Match{matchs.length !== 1 ? "s" : ""} configurado{matchs.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: "9px 16px", background: "#ec4899", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          + Nuevo Match
        </button>
      </div>

      {/* Info box */}
      <div style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
        <strong style={{ color: "#60a5fa" }}>¿Cómo funciona?</strong> Al crear un Match, el script en tu tienda detecta automáticamente
        la página de producto y reemplaza el botón de compra por dos selectores de talle (uno por producto),
        agregando ambos al carrito en un solo click.
        <br />
        <strong style={{ color: "#94a3b8" }}>Endpoint público del widget: </strong>
        <span style={{ fontFamily: "monospace", color: "#fbbf24" }}>{BACKEND}/api/matchs</span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>Cargando...</div>
      ) : matchs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💞</div>
          <p style={{ fontSize: 15 }}>No hay Matchs todavía</p>
          <p style={{ fontSize: 13 }}>Creá tu primer Match con el botón "+ Nuevo Match"</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {matchs.map(m => (
            <div key={m.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>💞</span>
                    <span style={{ fontWeight: 700, color: "#f8fafc", fontSize: 15 }}>{m.nombre}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#334155" }}>{m.id}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ padding: "6px 12px", background: "#1e293b", borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: "#64748b" }}>Producto 1 · </span>
                      <span style={{ color: "#94a3b8" }}>{m.producto1.nombre}</span>
                      <span style={{ color: "#475569", fontFamily: "monospace", marginLeft: 6 }}>#{m.producto1.tn_product_id}</span>
                    </div>
                    <span style={{ color: "#475569" }}>+</span>
                    <div style={{ padding: "6px 12px", background: "#1e293b", borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: "#64748b" }}>Producto 2 · </span>
                      <span style={{ color: "#94a3b8" }}>{m.producto2.nombre}</span>
                      <span style={{ color: "#475569", fontFamily: "monospace", marginLeft: 6 }}>#{m.producto2.tn_product_id}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.id, m.nombre)} style={{ background: "none", border: "1px solid #334155", color: "#64748b", cursor: "pointer", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                  🗑 Eliminar
                </button>
              </div>
              {/* Script hint */}
              <div style={{ marginTop: 12, padding: "8px 12px", background: "#020817", borderRadius: 6, fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                IDs detectados por el script: <span style={{ color: "#fbbf24" }}>{m.producto1.tn_product_id}</span> + <span style={{ color: "#fbbf24" }}>{m.producto2.tn_product_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateMatchModal
          onClose={() => setShowCreate(false)}
          onCreated={m => { setMatchs(prev => [...prev, m]); setShowCreate(false); onToast(`Match "${m.nombre}" creado`, "success"); }}
        />
      )}
    </div>
  );
}



// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("loading"); // loading | config | dashboard
  const [tab, setTab] = useState("productos"); // "productos" | "matchs"
  const [productos, setProductos] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const loadData = useCallback(async () => {
    try {
      const [prodsData, statsData] = await Promise.all([
        api("GET", "/productos"),
        api("GET", "/stats")
      ]);
      setProductos(prodsData);
      setStats(statsData);
    } catch (e) { }
  }, []);

  useEffect(() => {
    api("GET", "/config").then(cfg => {
      if (cfg.has_token) { setView("dashboard"); loadData(); }
      else setView("config");
    }).catch(() => setView("config"));
  }, [loadData]);

  const filtered = productos.filter(p =>
    !search || p.id.toLowerCase().includes(search.toLowerCase()) || p.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  if (view === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#334155", fontSize: 14 }}>Conectando...</div>
      </div>
    );
  }

  // Tab button style helper
  function tabBtn(id, label, emoji) {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        padding: "6px 14px", borderRadius: 6, border: "1px solid",
        borderColor: active ? (id === "matchs" ? "#9d174d" : "#1e3a5f") : "#1e293b",
        background: active ? (id === "matchs" ? "#2e0d1a" : "#0d1a2e") : "transparent",
        color: active ? (id === "matchs" ? "#f472b6" : "#60a5fa") : "#64748b",
        cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400
      }}>{emoji} {label}</button>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f8fafc", fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3b82f6, #06b6d4)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📦</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.05em", color: "#f8fafc" }}>STOCK CENTRAL</span>
          <span style={{ color: "#334155", fontSize: 12 }}>/ Tiendanube</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view === "dashboard" && (
            <button onClick={() => setView("config")} style={{ padding: "6px 12px", background: "none", color: "#64748b", border: "1px solid #1e293b", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              ⚙ Config
            </button>
          )}
          {view === "config" && productos.length > 0 && (
            <button onClick={() => setView("dashboard")} style={{ padding: "6px 12px", background: "none", color: "#64748b", border: "1px solid #1e293b", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {view === "config" && <ConfigView onSaved={() => { setView("dashboard"); loadData(); }} />}

        {view === "dashboard" && (
          <>
            {/* Stats */}
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Productos", value: stats.total_productos, color: "#60a5fa" },
                  { label: "Variantes", value: stats.total_variantes, color: "#a78bfa" },
                  { label: "Links TN", value: stats.total_links, color: "#34d399" },
                  { label: "Stock bajo", value: stats.stock_bajo, color: "#fbbf24" },
                  { label: "Sin stock", value: stats.sin_stock, color: "#f87171" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ color: "#475569", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div style={{ color: s.color, fontFamily: "monospace", fontSize: 24, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {tabBtn("productos", "Productos", "📦")}
              {tabBtn("matchs", "Matchs", "💞")}
            </div>

            {/* Tab: Productos */}
            {tab === "productos" && (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                  <input
                    style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "9px 14px", color: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                    placeholder="Buscar producto..."
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                  <button onClick={loadData} style={{ padding: "9px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, color: "#64748b", cursor: "pointer", fontSize: 16 }} title="Actualizar">↻</button>
                  <button onClick={() => setShowCreate(true)} style={{ padding: "9px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
                    + Nuevo Producto
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <p style={{ fontSize: 16 }}>{productos.length === 0 ? "No hay productos todavía" : "Sin resultados"}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filtered.map(p => (
                      <ProductoCard key={p.id} producto={p} onRefresh={loadData} onToast={showToast} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tab: Matchs */}
            {tab === "matchs" && <MatchsView onToast={showToast} />}

            {/* Recent log */}
            {tab === "productos" && stats?.recent_log?.length > 0 && (
              <div style={{ marginTop: 28, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Actividad reciente</div>
                {stats.recent_log.map((l, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 0", borderBottom: i < stats.recent_log.length - 1 ? "1px solid #1e293b" : "none" }}>
                    <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace", minWidth: 90 }}>{fmt(l.ts)}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#60a5fa", minWidth: 80 }}>{l.producto}</span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>{l.variante}</span>
                    <Badge color={l.action === "sale" ? "red" : l.action === "return" ? "green" : "gray"}>{l.action}</Badge>
                    {l.delta !== undefined && <span style={{ color: l.delta > 0 ? "#4ade80" : "#f87171", fontFamily: "monospace", fontSize: 12 }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateProductoModal onClose={() => setShowCreate(false)} onCreated={() => { loadData(); setShowCreate(false); showToast("Producto creado", "success"); }} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
