import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API = "https://stock-central-production.up.railway.app/api";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function api(method, path, body?) {
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

// ─── VIEWS ────────────────────────────────────────────────────────────────────

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

  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  const lbl = { display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
        <h2 style={{ color: "#f8fafc", margin: 0, fontSize: 22 }}>Configuración inicial</h2>
        <p style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>Conectá Stock Central con tu tienda</p>
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ color: "#60a5fa", margin: "0 0 16px", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          1 · Credenciales de API
        </h3>
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
        <h3 style={{ color: "#60a5fa", margin: "0 0 16px", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          2 · Webhook (para sync automático)
        </h3>
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

function CreateSkuModal({ onClose, onCreated }) {
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handle() {
    if (!sku) return setErr("El SKU es obligatorio");
    setLoading(true);
    try {
      const r = await api("POST", "/skus", { sku: sku.toUpperCase(), stock_central: parseInt(stock) || 0, description: desc });
      onCreated(r);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" as const };

  return (
    <Modal title="Nuevo SKU" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>SKU *</label>
          <input style={{ ...inp, fontFamily: "monospace", textTransform: "uppercase" }} placeholder="ej: CAM-BLANCA-M" value={sku} onChange={e => setSku(e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>STOCK INICIAL</label>
          <input style={{ ...inp, fontFamily: "monospace" }} type="number" min="0" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>DESCRIPCIÓN (opcional)</label>
          <input style={inp} placeholder="ej: Camiseta blanca talle M" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}
        <button onClick={handle} disabled={loading} style={{ padding: "12px 0", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {loading ? "Creando..." : "Crear SKU"}
        </button>
      </div>
    </Modal>
  );
}

function AdjustStockModal({ sku, current, onClose, onAdjusted }) {
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
      let body: any = { reason, sync };
      if (mode === "set") body.absolute = n;
      else body.delta = mode === "add" ? n : -n;
      const r = await api("PUT", `/skus/${sku}/stock`, body);
      onAdjusted(r.stock_central, r.sync);
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
    <Modal title={`Ajustar stock · ${sku}`} onClose={onClose}>
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
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>CANTIDAD</label>
          <input
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "12px", color: "#f8fafc", width: "100%", fontSize: 20, fontFamily: "monospace", fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center" }}
            type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        {amount && !isNaN(parseInt(amount)) && (
          <div style={{ background: "#0d2e1a", border: "1px solid #166534", borderRadius: 6, padding: "10px 14px", color: "#4ade80", fontSize: 14, textAlign: "center" }}>
            Resultado: <strong style={{ fontFamily: "monospace", fontSize: 16 }}>
              {mode === "set" ? parseInt(amount) :
                mode === "add" ? current + parseInt(amount) :
                  Math.max(0, current - parseInt(amount))}
            </strong>
          </div>
        )}
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>MOTIVO (opcional)</label>
          <input
            style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "10px 12px", color: "#f8fafc", width: "100%", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            placeholder="ej: Compra nueva, Merma, Inventario..."
            value={reason} onChange={e => setReason(e.target.value)}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#3b82f6" }} />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Sincronizar automáticamente a Tiendanube</span>
        </label>
        <button onClick={handle} disabled={loading || !amount} style={{ padding: "12px 0", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {loading ? "Aplicando..." : "Aplicar ajuste"}
        </button>
      </div>
    </Modal>
  );
}

// ─── MODAL VINCULAR VARIANTE (selección múltiple) ─────────────────────────────
function LinkVariantModal({ sku, onClose, onLinked }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, { product_id: string; variant_id: string; label: string }>>({});
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api("GET", "/products").then(data => {
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => {
      setErr("No se pudieron cargar los productos.");
      setLoading(false);
    });
  }, []);

  function toggleVariant(productId: string, variantId: string, label: string) {
    setSelected(prev => {
      const next = { ...prev };
      if (next[variantId]) {
        delete next[variantId];
      } else {
        next[variantId] = { product_id: productId, variant_id: variantId, label };
      }
      return next;
    });
  }

  async function handleLink() {
    const items = Object.values(selected);
    if (items.length === 0) return;
    setLinking(true);
    const errors: string[] = [];
    for (const item of items) {
      try {
        await api("POST", `/skus/${sku}/variants`, item);
      } catch (e: any) {
        errors.push(`${item.label}: ${e.message}`);
      }
    }
    setLinking(false);
    if (errors.length > 0) {
      setErr(errors.join(" | "));
    } else {
      onLinked(items);
    }
  }

  const selectedCount = Object.keys(selected).length;

  const q = search.toLowerCase();
  const filteredProducts = products.map((p: any) => {
    const pName = p.name?.es || p.name || "";
    const filteredVariants = (p.variants || []).filter(v => {
      const varLabel = v.values?.map(vv => vv.es || vv.en || Object.values(vv)[0]).join(" / ") || "";
      return !q || pName.toLowerCase().includes(q) || varLabel.toLowerCase().includes(q) || (v.sku || "").toLowerCase().includes(q);
    });
    return { ...p, variants: filteredVariants };
  }).filter((p: any) => p.variants.length > 0);

  return (
    <Modal title={`Vincular variantes → ${sku}`} onClose={onClose}>
      <input
        autoFocus
        style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "9px 12px", color: "#f8fafc", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        placeholder="Buscar por producto, variante o SKU..."
        value={search} onChange={e => setSearch(e.target.value)}
      />

      {/* Contador de seleccionados */}
      {selectedCount > 0 && (
        <div style={{ marginBottom: 10, padding: "8px 12px", background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: 6, color: "#60a5fa", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{selectedCount} variante{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}</span>
          <button onClick={() => setSelected({})} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>Limpiar</button>
        </div>
      )}

      {loading && <p style={{ color: "#64748b", textAlign: "center" }}>Cargando productos...</p>}
      {err && <p style={{ color: "#f87171", fontSize: 13 }}>{err}</p>}
      {!loading && filteredProducts.length === 0 && !err && (
        <p style={{ color: "#64748b", textAlign: "center" }}>No se encontraron resultados</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
        {filteredProducts.map((p: any) => (
          <div key={p.id}>
            <div style={{ color: "#94a3b8", fontSize: 11, padding: "6px 0 4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {p.name?.es || p.name || `Producto ${p.id}`}
            </div>
            {(p.variants || []).map(v => {
              const variantId = String(v.id);
              const productId = String(p.id);
              const varLabel = v.values?.map(vv => vv.es || vv.en || Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
              const label = `${p.name?.es || p.name} · ${varLabel}`;
              const isSelected = !!selected[variantId];

              return (
                <div key={v.id}
                  onClick={() => toggleVariant(productId, variantId, label)}
                  style={{
                    padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13,
                    background: isSelected ? "#1e3a5f" : "#1e293b",
                    border: `1px solid ${isSelected ? "#3b82f6" : "#334155"}`,
                    color: isSelected ? "#60a5fa" : "#94a3b8",
                    marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Checkbox visual */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? "#3b82f6" : "#475569"}`,
                      background: isSelected ? "#3b82f6" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      {isSelected && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span>{varLabel}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {v.sku && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{v.sku}</span>}
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>stock: {v.stock ?? "∞"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {err && <div style={{ marginTop: 8, color: "#f87171", fontSize: 13 }}>{err}</div>}

      <button
        onClick={handleLink}
        disabled={linking || selectedCount === 0}
        style={{
          marginTop: 14, padding: "12px 0", width: "100%",
          background: selectedCount > 0 ? "#3b82f6" : "#1e293b",
          color: selectedCount > 0 ? "#fff" : "#475569",
          border: "none", borderRadius: 6, cursor: selectedCount > 0 ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 14
        }}>
        {linking ? "Vinculando..." : selectedCount > 0 ? `Vincular ${selectedCount} variante${selectedCount !== 1 ? "s" : ""}` : "Seleccioná al menos una variante"}
      </button>
    </Modal>
  );
}

function SkuCard({ sku: skuData, onRefresh, onToast }) {
  const [expanded, setExpanded] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const stockColor = skuData.stock_central === 0 ? "#ef4444" : skuData.stock_central <= 5 ? "#f59e0b" : "#22c55e";

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await api("POST", `/skus/${skuData.sku}/sync`);
      onToast(`Sync OK: ${r.updated} variante(s) actualizadas`, "success");
    } catch (e) { onToast(e.message, "error"); }
    setSyncing(false);
  }

  async function handleUnlink(variant_id) {
    try {
      await api("DELETE", `/skus/${skuData.sku}/variants/${variant_id}`);
      onRefresh();
    } catch (e) { onToast(e.message, "error"); }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar SKU ${skuData.sku}?`)) return;
    try {
      await api("DELETE", `/skus/${skuData.sku}`);
      onRefresh();
    } catch (e) { onToast(e.message, "error"); }
  }

  return (
    <>
      <div style={{ background: "#0f172a", border: `1px solid ${expanded ? "#334155" : "#1e293b"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
        <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setExpanded(!expanded)}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: stockColor, flexShrink: 0, boxShadow: `0 0 8px ${stockColor}` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#f8fafc", fontSize: 15 }}>{skuData.sku}</span>
              {skuData.description && <span style={{ color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{skuData.description}</span>}
            </div>
            <StockBar stock={skuData.stock_central} max={Math.max(50, skuData.stock_central * 2 || 50)} />
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            <Badge color={skuData.variants.length > 0 ? "blue" : "gray"}>{skuData.variants.length} variante{skuData.variants.length !== 1 ? "s" : ""}</Badge>
            <span style={{ color: "#334155", fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        <div style={{ padding: "0 20px 14px", display: "flex", gap: 8 }}>
          <button onClick={() => setShowAdjust(true)} style={{ padding: "6px 12px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ± Ajustar stock
          </button>
          <button onClick={() => setShowLink(true)} style={{ padding: "6px 12px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            + Vincular variante
          </button>
          <button onClick={handleSync} disabled={syncing || skuData.variants.length === 0} style={{ padding: "6px 12px", background: syncing ? "#1e293b" : "#065f46", color: syncing ? "#64748b" : "#4ade80", border: `1px solid ${syncing ? "#334155" : "#166534"}`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {syncing ? "Sincronizando..." : "↑ Sync Tiendanube"}
          </button>
          <button onClick={handleDelete} style={{ marginLeft: "auto", padding: "6px 10px", background: "none", color: "#64748b", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            🗑
          </button>
        </div>

        {expanded && (
          <div style={{ borderTop: "1px solid #1e293b", padding: "16px 20px" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Variantes vinculadas</div>
              {skuData.variants.length === 0 ? (
                <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>Ninguna — presioná "+ Vincular variante" para agregar</p>
              ) : (
                skuData.variants.map(v => (
                  <div key={v.variant_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#1e293b", borderRadius: 6, marginBottom: 4 }}>
                    <div>
                      <span style={{ color: "#94a3b8", fontSize: 13 }}>{v.label}</span>
                      <span style={{ color: "#475569", fontSize: 11, marginLeft: 8, fontFamily: "monospace" }}>P:{v.product_id} V:{v.variant_id}</span>
                    </div>
                    <button onClick={() => handleUnlink(v.variant_id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                ))
              )}
            </div>

            <div>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Últimos movimientos</div>
              {(skuData.log || []).slice(0, 8).map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace", flexShrink: 0, minWidth: 80 }}>{fmt(l.ts)}</span>
                  <Badge color={l.action === "sale" ? "red" : l.action === "return" ? "green" : l.action === "subtract" ? "yellow" : l.action === "add" ? "green" : "gray"}>
                    {l.action}
                  </Badge>
                  {l.delta !== undefined && (
                    <span style={{ color: l.delta > 0 ? "#4ade80" : "#f87171", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>
                      {l.delta > 0 ? "+" : ""}{l.delta}
                    </span>
                  )}
                  <span style={{ color: "#64748b", fontSize: 12 }}>→ stock: <strong style={{ color: "#f8fafc", fontFamily: "monospace" }}>{l.stock}</strong></span>
                  {l.reason && <span style={{ color: "#475569", fontSize: 12 }}>{l.reason}</span>}
                  {l.order_id && <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace" }}>orden #{l.order_id}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAdjust && <AdjustStockModal sku={skuData.sku} current={skuData.stock_central}
        onClose={() => setShowAdjust(false)}
        onAdjusted={(stock, syncResult) => {
          onRefresh();
          onToast(`Stock actualizado: ${stock}${syncResult?.ok ? ` · ${syncResult.updated} variante(s) sincronizadas` : ""}`, "success");
        }} />}

      {showLink && <LinkVariantModal sku={skuData.sku}
        onClose={() => setShowLink(false)}
        onLinked={(items) => {
          onRefresh();
          setShowLink(false);
          onToast(`${items.length} variante${items.length !== 1 ? "s" : ""} vinculada${items.length !== 1 ? "s" : ""}`, "success");
        }} />}
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("loading");
  const [skus, setSkus] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState("sku");

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [skusData, statsData] = await Promise.all([
        api("GET", "/skus"),
        api("GET", "/stats")
      ]);
      setSkus(skusData);
      setStats(statsData);
    } catch (e) { }
  }, []);

  useEffect(() => {
    api("GET", "/config").then(cfg => {
      if (cfg.has_token) {
        setView("dashboard");
        loadData();
      } else {
        setView("config");
      }
    }).catch(() => setView("config"));
  }, [loadData]);

  const filtered = skus
    .filter((s: any) => !search || s.sku.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      if (sortBy === "stock") return a.stock_central - b.stock_central;
      if (sortBy === "variants") return b.variants.length - a.variants.length;
      return a.sku.localeCompare(b.sku);
    });

  if (view === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#334155", fontSize: 14 }}>Conectando...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#f8fafc", fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace" }}>
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
          {view === "config" && skus.length > 0 && (
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
            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "SKUs totales", value: stats.total_skus, color: "#60a5fa" },
                  { label: "Variantes vinculadas", value: stats.total_variants_linked, color: "#a78bfa" },
                  { label: "Stock bajo (≤5)", value: stats.low_stock, color: "#fbbf24" },
                  { label: "Sin stock", value: stats.out_of_stock, color: "#f87171" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ color: "#475569", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div style={{ color: s.color, fontFamily: "monospace", fontSize: 26, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
              <input
                style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "9px 14px", color: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                placeholder="Buscar SKU o descripción..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, color: "#94a3b8", fontSize: 12, outline: "none", cursor: "pointer" }}>
                <option value="sku">Ordenar: SKU</option>
                <option value="stock">Ordenar: Stock ↑</option>
                <option value="variants">Ordenar: Variantes</option>
              </select>
              <button onClick={loadData} style={{ padding: "9px 12px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, color: "#64748b", cursor: "pointer", fontSize: 16 }} title="Actualizar">↻</button>
              <button onClick={() => setShowCreate(true)} style={{ padding: "9px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
                + Nuevo SKU
              </button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
                {skus.length === 0 ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>No hay SKUs todavía</p>
                    <p style={{ fontSize: 13 }}>Creá tu primer SKU con el botón "+ Nuevo SKU"</p>
                  </>
                ) : <p>No se encontraron SKUs con ese filtro</p>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((s: any) => (
                  <SkuCard key={s.sku} sku={s} onRefresh={loadData} onToast={showToast} />
                ))}
              </div>
            )}

            {stats?.recent_log?.length > 0 && (
              <div style={{ marginTop: 28, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Actividad reciente</div>
                {stats.recent_log.map((l: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "6px 0", borderBottom: i < stats.recent_log.length - 1 ? "1px solid #1e293b" : "none" }}>
                    <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace", minWidth: 90 }}>{fmt(l.ts)}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#60a5fa", minWidth: 100 }}>{l.sku}</span>
                    <Badge color={l.action === "sale" ? "red" : l.action === "return" ? "green" : l.action === "subtract" ? "yellow" : "green"}>{l.action}</Badge>
                    {l.delta !== undefined && <span style={{ color: l.delta > 0 ? "#4ade80" : "#f87171", fontFamily: "monospace", fontSize: 12 }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
                    <span style={{ color: "#475569", fontSize: 12 }}>stock: <strong style={{ color: "#94a3b8", fontFamily: "monospace" }}>{l.stock}</strong></span>
                    {l.order_id && <span style={{ color: "#334155", fontSize: 11 }}>#{l.order_id}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateSkuModal onClose={() => setShowCreate(false)} onCreated={() => { loadData(); setShowCreate(false); showToast("SKU creado", "success"); }} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
