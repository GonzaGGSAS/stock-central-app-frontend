import { useState, useEffect, useCallback, CSSProperties, useRef } from "react";
import React from "react";

const API = "https://stock-central-production.up.railway.app/api";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swapp";
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
function fmtCurrency(n: number) { return "$" + n.toLocaleString("es-AR"); }
function isToday(ts: string) {
  const d = new Date(ts), now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function isThisWeek(ts: string) {
  const d = new Date(ts), now = new Date();
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
}
function isThisMonth(ts: string) {
  const d = new Date(ts), now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const EXCLUIR = /personaliz/i;

const C = {
  bg: "#0a0a0a",
  sidebar: "#0f0f0f",
  surface: "#141414",
  surfaceHover: "#1a1a1a",
  border: "#222",
  borderHover: "#333",
  text: "#f0f0f0",
  textMuted: "#666",
  textDim: "#2a2a2a",
  accent: "#00ff88",
  accentDim: "#001a0d",
  accentBorder: "#003d1f",
  amber: "#ffb800",
  amberDim: "#1a1200",
  red: "#ff3b3b",
  redDim: "#1a0505",
  blue: "#4d9fff",
  blueDim: "#051425",
  blueBorder: "#0d3a6e",
  pink: "#ff4d9e",
  pinkDim: "#1a0010",
  pinkBorder: "#6e0038",
  purple: "#9d6eff",
  purpleDim: "#0d0520",
};

const T = { font: "'DM Sans', sans-serif", body: "'Inter', sans-serif", mono: "'DM Mono', monospace" };

const inp: CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "9px 13px", color: C.text, width: "100%", fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: T.body,
};
const lbl: CSSProperties = {
  display: "block", color: C.textMuted, fontSize: 10, marginBottom: 5,
  fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: T.mono,
};
const btnPrimary: CSSProperties = {
  padding: "8px 16px", background: C.accent, color: C.bg, border: "none",
  borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12,
  fontFamily: T.font, letterSpacing: "0.04em",
};
const btnSecondary: CSSProperties = {
  padding: "7px 13px", background: "transparent", color: C.textMuted,
  border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontFamily: T.body,
};
const btnGreen: CSSProperties = {
  padding: "5px 11px", background: C.accentDim, color: C.accent,
  border: `1px solid ${C.accentBorder}`, borderRadius: 5, cursor: "pointer",
  fontSize: 11, fontWeight: 600, fontFamily: T.mono,
};
const btnRed: CSSProperties = {
  padding: "5px 11px", background: "transparent", color: C.red,
  border: `1px solid #3a1010`, borderRadius: 5, cursor: "pointer",
  fontSize: 11, fontFamily: T.body,
};
const card: CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
};

type TnVariant = { id: number; values: Record<string, string>[]; sku: string; stock: number };
type TnProduct = { id: number; name: { es?: string } | string; variants: TnVariant[]; images?: { src: string }[] };
type Link = { product_id: string; variant_id: string; label: string };
type LogEntry = { ts: string; action: string; stock: number; delta?: number; reason?: string; order_id?: string; reservation_id?: string };
type Variante = { id: string; label: string; stock: number; links: Link[]; log: LogEntry[] };
type Producto = { id: string; nombre: string; variantes: Variante[] };
type Stats = { total_productos: number; total_variantes: number; total_links: number; stock_bajo: number; sin_stock: number; active_reservations: number; recent_log: (LogEntry & { producto: string; variante: string })[] };
type Match = { id: string; nombre: string; tn_match_product_id: string; precio?: number; precio_promocional?: number; imagen_url?: string; producto1: { tn_product_id: string; nombre: string }; producto2: { tn_product_id: string; nombre: string }; variantMap?: { v1id: string; v2id: string; tn_variant_id: string; label: string }[]; createdAt: string };
type NavSection = "dashboard" | "productos" | "matchs" | "actividad" | "config";

function getActionLabel(action: string): { label: string; color: "green" | "red" | "amber" | "blue" | "gray" | "pink" } {
  if (action === "sale") return { label: "Venta", color: "red" };
  if (action === "reserved") return { label: "Reservado", color: "amber" };
  if (action === "reservation_released") return { label: "Liberado", color: "green" };
  if (action === "reservation_expired") return { label: "Expirado", color: "gray" };
  if (action === "return") return { label: "Devolución", color: "green" };
  if (action === "add") return { label: "Carga", color: "green" };
  if (action === "subtract") return { label: "Desc. manual", color: "amber" };
  if (action === "set") return { label: "Ajuste", color: "blue" };
  if (action === "sync") return { label: "Sync", color: "blue" };
  if (action === "reconciled") return { label: "Reconciliado", color: "pink" };
  if (action === "created") return { label: "Creado", color: "gray" };
  return { label: action, color: "gray" };
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "green" | "red" | "amber" | "blue" | "gray" | "pink" | "purple" }) {
  const map = {
    green: { bg: C.accentDim, text: C.accent, border: C.accentBorder },
    red: { bg: C.redDim, text: C.red, border: "#3a1010" },
    amber: { bg: C.amberDim, text: C.amber, border: "#3d2c00" },
    blue: { bg: C.blueDim, text: C.blue, border: C.blueBorder },
    gray: { bg: C.surface, text: C.textMuted, border: C.border },
    pink: { bg: C.pinkDim, text: C.pink, border: C.pinkBorder },
    purple: { bg: C.purpleDim, text: C.purple, border: "#2d1a6e" },
  };
  const s = map[color];
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: "2px 7px", borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: T.mono, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function StockPill({ stock }: { stock: number }) {
  const color = stock === 0 ? C.red : stock <= 5 ? C.amber : C.accent;
  const bg = stock === 0 ? C.redDim : stock <= 5 ? C.amberDim : C.accentDim;
  return (
    <span style={{ background: bg, color, fontFamily: T.mono, fontWeight: 700, fontSize: 14, padding: "2px 9px", borderRadius: 4, minWidth: 36, display: "inline-block", textAlign: "center" }}>
      {stock}
    </span>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const isErr = type === "error";
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 999, background: C.surface, border: `1px solid ${isErr ? "#3a1010" : C.accentBorder}`, borderRadius: 8, padding: "12px 16px", color: C.text, fontSize: 13, maxWidth: 340, display: "flex", gap: 10, alignItems: "center", boxShadow: `0 8px 32px #00000080`, fontFamily: T.body }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: isErr ? C.red : C.accent, flexShrink: 0 }} />
      {msg}
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, padding: 24, width: "100%", maxWidth: wide ? 700 : 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px #000000a0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700, fontFamily: T.font }}>{title}</h3>
            {subtitle && <p style={{ margin: "3px 0 0", color: C.textMuted, fontSize: 12, fontFamily: T.body }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: C.textMuted, fontSize: 11, fontFamily: T.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 12, color: C.blue }}>{current}/{total}</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.blue, borderRadius: 2, transition: "width 0.25s ease" }} />
      </div>
    </div>
  );
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function Sidebar({ active, onNav, stats }: { active: NavSection; onNav: (s: NavSection) => void; stats: Stats | null }) {
  const items: { id: NavSection; icon: string; label: string; badge?: number; badgeColor?: string }[] = [
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "productos", icon: "▤", label: "Productos", badge: stats?.sin_stock, badgeColor: C.red },
    { id: "matchs", icon: "⬡", label: "Matchs" },
    { id: "actividad", icon: "◎", label: "Actividad", badge: stats?.active_reservations, badgeColor: C.amber },
    { id: "config", icon: "◐", label: "Configuración" },
  ];

  return (
    <div style={{ width: 200, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0, minHeight: "100vh", position: "sticky", top: 0 }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 16, color: C.text, letterSpacing: "-0.02em" }}>
          STOCK<span style={{ color: C.accent }}>.</span>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 9, color: C.textMuted, marginTop: 2, letterSpacing: "0.1em" }}>MINCH · TN</div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 10px" }}>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                borderRadius: 7, border: "none", cursor: "pointer", width: "100%",
                background: isActive ? `${C.accent}15` : "transparent",
                color: isActive ? C.accent : C.textMuted,
                fontFamily: T.body, fontSize: 13, fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s", textAlign: "left",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.color = isActive ? C.accent : C.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${C.accent}15` : "transparent"; e.currentTarget.style.color = isActive ? C.accent : C.textMuted; }}
            >
              <span style={{ fontFamily: T.mono, fontSize: 14, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{ background: item.badgeColor + "22", color: item.badgeColor, border: `1px solid ${item.badgeColor}44`, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontFamily: T.mono, fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
              {isActive && <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ padding: "16px 20px 0", borderTop: `1px solid ${C.border}`, marginTop: 10 }}>
        <div style={{ fontFamily: T.mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em" }}>v5.0 · Stock Central</div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ stats, productos }: { stats: Stats | null; productos: Producto[] }) {
  if (!stats) return <div style={{ color: C.textMuted, fontFamily: T.body, padding: 40, textAlign: "center" }}>Cargando...</div>;

  const allLog = stats.recent_log;
  const salesLog = allLog.filter(l => l.action === "sale");
  const todaySales = salesLog.filter(l => isToday(l.ts));
  const weekSales = salesLog.filter(l => isThisWeek(l.ts));
  const monthSales = salesLog.filter(l => isThisMonth(l.ts));

  // Top variantes más vendidas
  const saleCount: Record<string, { label: string; producto: string; count: number }> = {};
  salesLog.forEach(l => {
    const key = `${l.producto}|${l.variante}`;
    if (!saleCount[key]) saleCount[key] = { label: l.variante, producto: l.producto, count: 0 };
    saleCount[key].count += Math.abs(l.delta || 1);
  });
  const topVariantes = Object.values(saleCount).sort((a, b) => b.count - a.count).slice(0, 5);

  // Variantes con stock crítico
  const criticas = productos.flatMap(p => p.variantes.filter(v => v.stock <= 3).map(v => ({ ...v, producto: p.nombre }))).sort((a, b) => a.stock - b.stock).slice(0, 6);

  // Mini bar chart — últimos 7 días
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString("es-AR", { weekday: "short" });
    const count = salesLog.filter(l => {
      const ld = new Date(l.ts);
      return ld.getDate() === d.getDate() && ld.getMonth() === d.getMonth();
    }).reduce((a, l) => a + Math.abs(l.delta || 1), 0);
    days.push({ label: dayStr, count });
  }
  const maxDay = Math.max(...days.map(d => d.count), 1);

  const statCards = [
    { label: "Hoy", value: todaySales.reduce((a, l) => a + Math.abs(l.delta || 1), 0), sub: "unidades vendidas", color: C.accent },
    { label: "Esta semana", value: weekSales.reduce((a, l) => a + Math.abs(l.delta || 1), 0), sub: "unidades", color: C.blue },
    { label: "Este mes", value: monthSales.reduce((a, l) => a + Math.abs(l.delta || 1), 0), sub: "unidades", color: C.purple },
    { label: "Reservas activas", value: stats.active_reservations, sub: "en el carrito ahora", color: C.amber },
    { label: "Sin stock", value: stats.sin_stock, sub: "variantes", color: C.red },
    { label: "Stock bajo", value: stats.stock_bajo, sub: "≤ 5 unidades", color: C.amber },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontFamily: T.font, fontSize: 22, fontWeight: 800, color: C.text }}>Dashboard</h2>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 13, fontFamily: T.body }}>Resumen de tu operación en tiempo real</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: T.mono }}>{s.label}</div>
            <div style={{ color: s.color, fontFamily: T.mono, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4, fontFamily: T.body }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + Top variantes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Bar chart */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Ventas últimos 7 días</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {days.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{
                    width: "100%", borderRadius: "3px 3px 0 0",
                    height: `${d.count === 0 ? 4 : Math.max(8, (d.count / maxDay) * 100)}%`,
                    background: i === 6 ? C.accent : `${C.accent}40`,
                    transition: "height 0.3s ease",
                  }} />
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>{d.label}</div>
                {d.count > 0 && <div style={{ fontFamily: T.mono, fontSize: 9, color: C.accent }}>{d.count}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Top variantes */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Más vendidas</div>
          {topVariantes.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 12, fontFamily: T.body }}>Sin ventas registradas aún</div>
          ) : topVariantes.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: C.textMuted, minWidth: 14 }}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.producto}</div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: C.textMuted }}>{v.label}</div>
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: C.accent }}>{v.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock crítico */}
      {criticas.length > 0 && (
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>⚠ Stock crítico</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {criticas.map((v, i) => (
              <div key={i} style={{ background: v.stock === 0 ? C.redDim : C.amberDim, border: `1px solid ${v.stock === 0 ? "#3a1010" : "#3d2c00"}`, borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontFamily: T.body, fontSize: 11, color: C.textMuted, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.producto}</div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.label}</div>
                <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: v.stock === 0 ? C.red : C.amber, marginTop: 4 }}>{v.stock === 0 ? "SIN STOCK" : v.stock}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas ventas */}
      {salesLog.length > 0 && (
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Últimas ventas</div>
          {salesLog.slice(0, 8).map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(salesLog.length, 8) - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ color: C.textMuted, fontFamily: T.mono, fontSize: 10, minWidth: 80, flexShrink: 0 }}>{fmt(l.ts)}</span>
              <span style={{ color: C.text, fontSize: 12, fontFamily: T.body, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.producto} · {l.variante}</span>
              {l.order_id && <span style={{ fontFamily: T.mono, fontSize: 10, color: C.textMuted }}>#{l.order_id}</span>}
              <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: C.red, flexShrink: 0 }}>{l.delta}</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{l.stock}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ── Activity View ─────────────────────────────────────────────────────────────
function ActivityView({ stats }: { stats: Stats | null }) {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("today");
  const [filter, setFilter] = useState<"all" | "sale" | "reserved" | "released">("all");

  if (!stats) return null;
  const allLog = stats.recent_log;

  const periodLog = allLog.filter(l => {
    if (period === "today") return isToday(l.ts);
    if (period === "week") return isThisWeek(l.ts);
    if (period === "month") return isThisMonth(l.ts);
    return true;
  });

  const filtered = periodLog.filter(l => {
    if (filter === "sale") return l.action === "sale";
    if (filter === "reserved") return l.action === "reserved";
    if (filter === "released") return ["reservation_released", "reservation_expired"].includes(l.action);
    return true;
  });

  const sales = periodLog.filter(l => l.action === "sale");
  const reservas = periodLog.filter(l => l.action === "reserved");
  const liberados = periodLog.filter(l => ["reservation_released", "reservation_expired"].includes(l.action));



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontFamily: T.font, fontSize: 22, fontWeight: 800, color: C.text }}>Actividad</h2>
        <p style={{ margin: 0, color: C.textMuted, fontSize: 13, fontFamily: T.body }}>Historial completo de movimientos de stock</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total movimientos", value: periodLog.length, color: C.text },
          { label: "Ventas", value: sales.reduce((a, l) => a + Math.abs(l.delta || 1), 0), color: C.red },
          { label: "Reservados", value: reservas.length, color: C.amber },
          { label: "Liberados", value: liberados.length, color: C.accent },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: T.mono }}>{s.label}</div>
            <div style={{ color: s.color, fontFamily: T.mono, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Period selector — pill style */}
        <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
          {([
            { val: "today", label: "Hoy" },
            { val: "week", label: "Semana" },
            { val: "month", label: "Mes" },
            { val: "all", label: "Todo" },
          ] as const).map(({ val, label }) => (
            <button key={val} onClick={() => setPeriod(val)} style={{
              padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: period === val ? C.text : "transparent",
              color: period === val ? C.bg : C.textMuted,
              fontSize: 12, fontFamily: T.body, fontWeight: period === val ? 700 : 400,
              transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: C.border }} />

        {/* Type filter — colored chips */}
        <div style={{ display: "flex", gap: 6 }}>
          {([
            { val: "all", label: "Todos", color: C.textMuted, bg: C.surface, border: C.border, activeBg: C.surfaceHover, activeColor: C.text, activeBorder: C.borderHover },
            { val: "sale", label: "⬤ Ventas", color: C.red, bg: C.redDim, border: "#3a1010", activeBg: C.red, activeColor: C.bg, activeBorder: C.red },
            { val: "reserved", label: "⬤ Reservados", color: C.amber, bg: C.amberDim, border: "#3d2c00", activeBg: C.amber, activeColor: C.bg, activeBorder: C.amber },
            { val: "released", label: "⬤ Liberados", color: C.accent, bg: C.accentDim, border: C.accentBorder, activeBg: C.accent, activeColor: C.bg, activeBorder: C.accent },
          ] as const).map(({ val, label, color, bg, border, activeBg, activeColor, activeBorder }) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: "5px 13px", borderRadius: 20, border: `1px solid ${filter === val ? activeBorder : border}`,
              background: filter === val ? activeBg : bg,
              color: filter === val ? activeColor : color,
              fontSize: 11, fontFamily: T.mono, fontWeight: 600, cursor: "pointer",
              letterSpacing: "0.04em", transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "90px 100px 1fr 1fr 60px 50px", gap: 0, borderBottom: `1px solid ${C.border}` }}>
          {["Fecha", "Acción", "Producto", "Variante", "Delta", "Stock"].map(h => (
            <div key={h} style={{ padding: "10px 14px", color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.mono }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: C.textMuted, fontFamily: T.body, fontSize: 13 }}>Sin movimientos en este período</div>
        ) : filtered.slice(0, 50).map((l, i) => {
          const { label, color } = getActionLabel(l.action);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 100px 1fr 1fr 60px 50px", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? "transparent" : `${C.surface}50` }}>
              <div style={{ padding: "9px 14px", fontFamily: T.mono, fontSize: 10, color: C.textMuted }}>{fmt(l.ts)}</div>
              <div style={{ padding: "9px 14px", display: "flex", alignItems: "center" }}><Badge color={color}>{label}</Badge></div>
              <div style={{ padding: "9px 14px", fontFamily: T.body, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.producto}</div>
              <div style={{ padding: "9px 14px", fontFamily: T.body, fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.variante}</div>
              <div style={{ padding: "9px 14px", fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: l.delta !== undefined ? (l.delta > 0 ? C.accent : C.red) : C.textMuted }}>
                {l.delta !== undefined ? (l.delta > 0 ? "+" : "") + l.delta : "—"}
              </div>
              <div style={{ padding: "9px 14px", fontFamily: T.mono, fontSize: 12, color: C.textMuted }}>{l.stock}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Match Edit Modal ──────────────────────────────────────────────────────────
function EditMatchModal({ match, onClose, onSaved, onToast }: { match: Match; onClose: () => void; onSaved: (m: Match) => void; onToast: (m: string, t?: string) => void }) {
  const [nombre, setNombre] = useState(match.nombre);
  const [precio, setPrecio] = useState(match.precio ? String(match.precio) : "");
  const [precioPromo, setPrecioPromo] = useState(match.precio_promocional ? String(match.precio_promocional) : "");
  const [imagenUrl, setImagenUrl] = useState(match.imagen_url || "");
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { nombre };
      if (precio) body.precio = parseInt(precio);
      if (precioPromo) body.precio_promocional = parseInt(precioPromo);
      if (imagenUrl) body.imagen_url = imagenUrl;
      const r = await api("PUT", `/matchs/${match.id}`, body);
      onSaved(r);
      onToast("Match actualizado en Tiendanube");
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
    setSaving(false);
  }

  return (
    <Modal title="Editar Match" subtitle={match.nombre} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {imagenUrl && (
          <img src={imagenUrl} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
        )}
        <div>
          <label style={lbl}>Nombre</label>
          <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>Precio ($)</label>
            <input style={{ ...inp, fontFamily: T.mono }} type="number" placeholder="130000" value={precio} onChange={e => setPrecio(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Precio promocional ($)</label>
            <input style={{ ...inp, fontFamily: T.mono }} type="number" placeholder="117000" value={precioPromo} onChange={e => setPrecioPromo(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={lbl}>URL de imagen principal</label>
          <input style={inp} placeholder="https://..." value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} />
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 11, fontFamily: T.body }}>Pegá una URL de imagen para el producto en TN</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handle} disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Guardando en TN..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
// ── Matchs View ───────────────────────────────────────────────────────────────
function SyncMatchBtn({ matchId, onToast }: { matchId: string; onToast: (m: string, t?: string) => void }) {
  const [syncing, setSyncing] = useState(false);
  async function handle() {
    setSyncing(true);
    try { const r = await api("PUT", `/matchs/${matchId}/sync-stock`); onToast(`Stock sincronizado: ${r.updated} variante(s)`); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
    setSyncing(false);
  }
  return (
    <button onClick={handle} disabled={syncing} style={{ ...btnGreen, opacity: syncing ? 0.6 : 1 }}>
      {syncing ? "Sync..." : "↑ Sync stock"}
    </button>
  );
}

function CreateMatchModal({ onClose, onCreated }: { onClose: () => void; onCreated: (m: unknown) => void }) {
  const [nombre, setNombre] = useState("");
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [prod1, setProd1] = useState<TnProduct | null>(null);
  const [prod2, setProd2] = useState<TnProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("GET", "/tn-products").then((data: TnProduct[]) => { setTnProducts(data); setLoading(false); })
      .catch(() => { setErr("No se pudieron cargar los productos"); setLoading(false); });
  }, []);

  function getPName(p: TnProduct) { return typeof p.name === "object" ? (p.name.es || `Producto ${p.id}`) : String(p.name); }

  async function handle() {
    if (!nombre.trim()) return setErr("El nombre es obligatorio");
    if (!prod1 || !prod2) return setErr("Seleccioná ambos productos");
    if (prod1.id === prod2.id) return setErr("Los productos deben ser distintos");
    setSaving(true); setErr("");
    try {
      const r = await api("POST", "/matchs", {
        nombre: nombre.trim(),
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
        {loading ? <div style={{ color: C.textMuted, fontSize: 12, fontFamily: T.body, padding: "8px 0" }}>Cargando...</div> : (
          <select value={value?.id || ""} onChange={e => onChange(tnProducts.find(p => String(p.id) === e.target.value) || null)} style={{ ...inp, cursor: "pointer" }}>
            <option value="">— Elegir —</option>
            {tnProducts.filter(p => !EXCLUIR.test(getPName(p))).map(p => (
              <option key={p.id} value={p.id}>{getPName(p)}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <Modal title="Nuevo Match" subtitle="Stock Central creará el producto en Tiendanube" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "10px 12px", background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 6, fontSize: 12, color: C.accent, fontFamily: T.body }}>
          Se creará automáticamente un producto combinado en TN con todas las combinaciones de talles.
        </div>
        <div>
          <label style={lbl}>Nombre del Match</label>
          <input style={inp} placeholder="ej: COMBO WALL-E + EVA" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
        </div>
        <ProductSelect label="Producto 1" value={prod1} onChange={setProd1} />
        <div style={{ textAlign: "center", color: C.textMuted, fontFamily: T.mono, fontSize: 18 }}>+</div>
        <ProductSelect label="Producto 2" value={prod2} onChange={setProd2} />
        {err && <p style={{ color: C.red, fontSize: 12, margin: 0, fontFamily: T.body }}>{err}</p>}
        <button onClick={handle} disabled={saving || loading} style={{ ...btnPrimary, background: C.pink, color: "#fff", opacity: saving || loading ? 0.5 : 1 }}>
          {saving ? "Creando en Tiendanube..." : "Crear Match 💞"}
        </button>
      </div>
    </Modal>
  );
}

function MatchsView({ onToast }: { onToast: (m: string, t?: string) => void }) {
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);

  async function loadMatchs() {
    try { const data = await api("GET", "/matchs"); setMatchs(Array.isArray(data) ? data : []); }
    catch (_e) { onToast("Error cargando Matchs", "error"); }
    setLoading(false);
  }

  useEffect(() => { loadMatchs(); }, []);

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar Match "${nombre}"? Esto también eliminará el producto en Tiendanube.`)) return;
    try { await api("DELETE", `/matchs/${id}`); setMatchs(prev => prev.filter(m => m.id !== id)); onToast("Match eliminado"); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontFamily: T.font, fontSize: 22, fontWeight: 800, color: C.text }}>Matchs</h2>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 13, fontFamily: T.body }}>Combos de dos productos con selectores independientes</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ ...btnPrimary, background: C.pink, color: "#fff" }}>+ Nuevo Match</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontFamily: T.body }}>Cargando...</div>
      ) : matchs.length === 0 ? (
        <div style={{ ...card, padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💞</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 6px", fontFamily: T.font }}>Sin Matchs todavía</p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, fontFamily: T.body }}>Creá tu primer Match para combinar dos productos</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {matchs.map(m => (
            <div key={m.id} style={{ ...card, padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                {/* Imagen */}
                {m.imagen_url ? (
                  <img src={m.imagen_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, background: C.pinkDim, border: `1px solid ${C.pinkBorder}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💞</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: 14, fontFamily: T.font }}>{m.nombre}</span>
                    <span style={{ background: C.pinkDim, color: C.pink, border: `1px solid ${C.pinkBorder}`, borderRadius: 3, padding: "1px 6px", fontSize: 10, fontFamily: T.mono }}>
                      #{m.tn_match_product_id}
                    </span>
                    {m.precio && (
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: C.accent }}>{fmtCurrency(m.precio)}</span>
                    )}
                    {m.precio_promocional && (
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: C.amber }}>{fmtCurrency(m.precio_promocional)} promo</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {[m.producto1, m.producto2].map((p, i) => (
                      <React.Fragment key={p.tn_product_id}>
                        {i === 1 && <span style={{ color: C.textMuted, fontSize: 12, fontFamily: T.mono }}>+</span>}
                        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 10px", fontSize: 11, fontFamily: T.body }}>
                          <span style={{ color: C.textMuted }}>P{i + 1} · </span>
                          <span style={{ color: C.text, fontWeight: 500 }}>{p.nombre}</span>
                          <span style={{ color: C.textMuted, fontFamily: T.mono, marginLeft: 6, fontSize: 10 }}>#{p.tn_product_id}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ background: C.bg, border: `1px solid ${C.pinkBorder}`, borderRadius: 4, padding: "3px 8px", fontSize: 10, fontFamily: T.mono, color: C.pink }}>
                      {m.variantMap?.length || 0} combinaciones
                    </div>
                    <SyncMatchBtn matchId={m.id} onToast={onToast} />
                    <button onClick={() => setEditing(m)} style={{ ...btnSecondary, fontSize: 11 }}>✎ Editar</button>
                    <button onClick={() => handleDelete(m.id, m.nombre)} style={{ ...btnRed, marginLeft: "auto" }}>Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateMatchModal
          onClose={() => setShowCreate(false)}
          onCreated={m => { setMatchs(prev => [...prev, m as Match]); setShowCreate(false); onToast(`Match "${(m as Match).nombre}" creado ✓`); }}
        />
      )}
      {editing && (
        <EditMatchModal
          match={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => { setMatchs(prev => prev.map(m => m.id === updated.id ? updated : m)); setEditing(null); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}
// ── All the product/variante modals (unchanged logic, restyled) ───────────────
function AddVarianteModal({ productoId, onClose, onAdded }: { productoId: string; onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState(""); const [stock, setStock] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  async function handle() {
    if (!label) return setErr("El nombre es obligatorio"); setLoading(true);
    try { await api("POST", `/productos/${productoId}/variantes`, { label, stock: parseInt(stock) || 0 }); onAdded(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); } setLoading(false);
  }
  return (
    <Modal title="Nueva variante" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={lbl}>Nombre</label><input style={inp} placeholder="ej: S / BLANCO" value={label} onChange={e => setLabel(e.target.value)} autoFocus /></div>
        <div><label style={lbl}>Stock inicial</label><input style={{ ...inp, fontFamily: T.mono }} type="number" min="0" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
        {err && <p style={{ color: C.red, fontSize: 12, margin: 0 }}>{err}</p>}
        <button onClick={handle} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>{loading ? "Agregando..." : "Agregar variante"}</button>
      </div>
    </Modal>
  );
}

function AdjustStockModal({ productoId, variante, onClose, onAdjusted }: { productoId: string; variante: Variante; onClose: () => void; onAdjusted: () => void }) {
  const [mode, setMode] = useState<"add" | "subtract" | "set">("add");
  const [amount, setAmount] = useState(""); const [reason, setReason] = useState(""); const [sync, setSync] = useState(true); const [loading, setLoading] = useState(false);
  async function handle() {
    const n = parseInt(amount); if (isNaN(n) || n < 0) return; setLoading(true);
    try {
      const body: Record<string, unknown> = { reason, sync };
      if (mode === "set") body.absolute = n; else body.delta = mode === "add" ? n : -n;
      await api("PUT", `/productos/${productoId}/variantes/${variante.id}/stock`, body); onAdjusted();
    } catch (_e) { } setLoading(false); onClose();
  }
  const n = parseInt(amount);
  const preview = isNaN(n) ? null : mode === "set" ? n : mode === "add" ? variante.stock + n : Math.max(0, variante.stock - n);
  const modeBtn = (m: "add" | "subtract" | "set", label: string) => (
    <button onClick={() => setMode(m)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, border: `1px solid ${mode === m ? C.accent : C.border}`, background: mode === m ? C.accentDim : "transparent", color: mode === m ? C.accent : C.textMuted, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: T.body }}>{label}</button>
  );
  return (
    <Modal title="Ajustar stock" subtitle={variante.label} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.textMuted, fontSize: 13, fontFamily: T.body }}>Stock actual</span>
          <StockPill stock={variante.stock} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>{modeBtn("add", "+ Agregar")}{modeBtn("subtract", "− Restar")}{modeBtn("set", "= Fijar")}</div>
        <input autoFocus style={{ ...inp, fontFamily: T.mono, fontSize: 28, fontWeight: 700, textAlign: "center", padding: "14px" }} type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
        {preview !== null && (
          <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 6, padding: "10px", textAlign: "center", color: C.accent }}>
            Resultado: <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 20 }}>{preview}</span>
          </div>
        )}
        <input style={inp} placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} style={{ accentColor: C.accent }} />
          <span style={{ color: C.textMuted, fontSize: 12, fontFamily: T.body }}>Sincronizar a Tiendanube</span>
        </label>
        <button onClick={handle} disabled={loading || !amount} style={{ ...btnPrimary, opacity: loading || !amount ? 0.5 : 1 }}>{loading ? "Aplicando..." : "Aplicar"}</button>
      </div>
    </Modal>
  );
}

function LinkModal({ productoId, variante, onClose, onLinked }: { productoId: string; variante: Variante; onClose: () => void; onLinked: () => void }) {
  const [tnProducts, setTnProducts] = useState<TnProduct[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [selected, setSelected] = useState<{ product_id: string; variant_id: string; label: string }[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api("GET", "/tn-products").then((data: TnProduct[]) => { setTnProducts(data); setLoading(false); }).catch(() => { setErr("Error cargando"); setLoading(false); }); }, []);
  const q = search.toLowerCase();
  const filtered = tnProducts.filter(p => { const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name); return !EXCLUIR.test(n); })
    .map(p => { const pName = typeof p.name === "object" ? (p.name.es || "") : String(p.name); const fv = p.variants.filter(v => { const vl = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || ""; return !q || pName.toLowerCase().includes(q) || vl.toLowerCase().includes(q); }); return { ...p, _name: pName, variants: fv }; }).filter(p => p.variants.length > 0);
  function toggle(product_id: string, variant_id: string, label: string) { setSelected(prev => prev.some(s => s.variant_id === variant_id) ? prev.filter(s => s.variant_id !== variant_id) : [...prev, { product_id, variant_id, label }]); }
  async function handleLink() {
    if (selected.length === 0) return;
    setProgress({ current: 0, total: selected.length, label: "Iniciando..." }); let linked = 0;
    for (let i = 0; i < selected.length; i++) {
      setProgress({ current: i, total: selected.length, label: `Vinculando: ${selected[i].label}` });
      try { await api("POST", `/productos/${productoId}/variantes/${variante.id}/links`, selected[i]); linked++; } catch (_e) { }
    }
    setProgress({ current: selected.length, total: selected.length, label: `Listo: ${linked} vinculada(s)` });
    setTimeout(() => { if (linked > 0) onLinked(); else setErr("No se pudo vincular"); setProgress(null); }, 800);
  }
  return (
    <Modal title="Vincular variante" subtitle={variante.label} onClose={onClose} wide>
      <input autoFocus style={{ ...inp, marginBottom: 12 }} placeholder="Buscar producto o variante..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading && <p style={{ color: C.textMuted, textAlign: "center", fontFamily: T.body }}>Cargando...</p>}
      <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.map(p => (
          <div key={p.id}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 4px 4px", fontFamily: T.mono }}>{p._name}</div>
            {p.variants.map(v => {
              const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
              const label = `${p._name} · ${vLabel}`;
              const isSel = selected.some(s => s.variant_id === String(v.id));
              const alreadyLinked = variante.links.some(l => l.variant_id === String(v.id));
              return (
                <div key={v.id} onClick={() => !alreadyLinked && !progress && toggle(String(p.id), String(v.id), label)}
                  style={{ padding: "8px 10px", borderRadius: 5, cursor: alreadyLinked || progress ? "default" : "pointer", background: isSel ? C.blueDim : alreadyLinked ? C.accentDim : "transparent", border: `1px solid ${isSel ? C.blue : alreadyLinked ? C.accentBorder : C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ color: isSel ? C.blue : alreadyLinked ? C.accent : C.text, fontSize: 12, fontFamily: T.body }}>{vLabel}{alreadyLinked ? " ✓" : ""}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: C.textMuted }}>s:{v.stock ?? "∞"}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {selected.length > 0 && !progress && <div style={{ marginTop: 12, padding: "8px 12px", background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 6 }}><span style={{ color: C.blue, fontSize: 12, fontFamily: T.body }}>{selected.length} seleccionada(s)</span></div>}
      {progress && <div style={{ marginTop: 12 }}><ProgressBar current={progress.current} total={progress.total} label={progress.label} /></div>}
      {err && <p style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{err}</p>}
      <button onClick={handleLink} disabled={!!progress || selected.length === 0} style={{ ...btnPrimary, marginTop: 14, width: "100%", opacity: progress || selected.length === 0 ? 0.5 : 1 }}>
        {progress ? `Vinculando ${progress.current}/${progress.total}...` : `Vincular ${selected.length} variante(s)`}
      </button>
    </Modal>
  );
}

function VarianteRow({ productoId, variante, onRefresh, onToast }: { productoId: string; variante: Variante; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [showAdjust, setShowAdjust] = useState(false); const [showLink, setShowLink] = useState(false);
  const [showLog, setShowLog] = useState(false); const [syncing, setSyncing] = useState(false);
  async function handleSync() {
    setSyncing(true);
    try { const r = await api("POST", `/productos/${productoId}/variantes/${variante.id}/sync`); onToast(`Sync OK: ${r.updated} link(s)`); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); } setSyncing(false);
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
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 14px", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: variante.links.length > 0 ? 8 : 0 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: stockColor, flexShrink: 0 }} />
          <span style={{ fontFamily: T.body, fontWeight: 500, color: C.text, fontSize: 13, flex: 1 }}>{variante.label}</span>
          <StockPill stock={variante.stock} />
        </div>
        {variante.links.length > 0 && (
          <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 3 }}>
            {variante.links.map(l => (
              <span key={l.variant_id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, color: C.textMuted, fontFamily: T.body, display: "flex", alignItems: "center", gap: 4 }}>
                {l.label}
                <button onClick={() => handleUnlink(l.variant_id)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setShowAdjust(true)} style={btnSecondary}>Ajustar</button>
          <button onClick={() => setShowLink(true)} style={btnSecondary}>+ Vincular</button>
          {variante.links.length > 0 && <button onClick={handleSync} disabled={syncing} style={{ ...btnGreen, opacity: syncing ? 0.6 : 1 }}>{syncing ? "..." : "↑ Sync"}</button>}
          <button onClick={() => setShowLog(!showLog)} style={{ ...btnSecondary, color: showLog ? C.text : C.textMuted }}>Log</button>
          <button onClick={handleDelete} style={{ ...btnRed, marginLeft: "auto" }}>×</button>
        </div>
        {showLog && variante.log.length > 0 && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            {variante.log.slice(0, 10).map((l, i) => {
              const { label, color } = getActionLabel(l.action);
              return (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, padding: "4px 0", borderBottom: i < Math.min(variante.log.length, 10) - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                  <span style={{ fontFamily: T.mono, color: C.textMuted, fontSize: 10, minWidth: 80 }}>{fmt(l.ts)}</span>
                  <Badge color={color}>{label}</Badge>
                  {l.delta !== undefined && <span style={{ fontFamily: T.mono, color: l.delta > 0 ? C.accent : C.red, fontSize: 11, fontWeight: 600 }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
                  <span style={{ color: C.textMuted, fontFamily: T.body }}>→ <span style={{ fontFamily: T.mono, color: C.text }}>{l.stock}</span></span>
                  {l.reason && <span style={{ color: C.textMuted, fontFamily: T.body, fontSize: 10, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.reason}</span>}
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

function SyncVariantesBtn({ productoId, onRefresh, onToast }: { productoId: string; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      const r = await api("POST", `/productos/${productoId}/sync-variantes`);
      if (r.added > 0) { onToast(`${r.added} variante(s) importadas desde TN`); onRefresh(); }
      else onToast(`Sin variantes nuevas (${r.skipped} ya existían)`);
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
    setLoading(false);
  }
  return <button onClick={handle} disabled={loading} style={{ ...btnSecondary, opacity: loading ? 0.6 : 1, fontSize: 11 }}>{loading ? "Importando..." : "↓ Sync TN"}</button>;
}

function ProductoCard({ producto, onRefresh, onToast }: { producto: Producto; onRefresh: () => void; onToast: (m: string, t?: string) => void }) {
  const [expanded, setExpanded] = useState(false); const [showAddVar, setShowAddVar] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const totalStock = producto.variantes.reduce((a, v) => a + v.stock, 0);
  const sinStock = producto.variantes.filter(v => v.stock === 0).length;
  const bajStock = producto.variantes.filter(v => v.stock > 0 && v.stock <= 5).length;
  const variantesConLinks = producto.variantes.filter(v => v.links.length > 0);
  async function handleSyncAll() {
    if (variantesConLinks.length === 0) { onToast("Sin variantes vinculadas", "error"); return; }
    setSyncProgress({ current: 0, total: variantesConLinks.length, label: "Iniciando..." }); let ok = 0;
    for (let i = 0; i < variantesConLinks.length; i++) {
      const v = variantesConLinks[i]; setSyncProgress({ current: i, total: variantesConLinks.length, label: `Sync: ${v.label}` });
      try { await api("POST", `/productos/${producto.id}/variantes/${v.id}/sync`); ok++; } catch (_e) { }
    }
    setSyncProgress({ current: variantesConLinks.length, total: variantesConLinks.length, label: `Listo: ${ok}/${variantesConLinks.length}` });
    setTimeout(() => { setSyncProgress(null); onRefresh(); onToast(`Sync: ${ok} variante(s)`); }, 1000);
  }
  async function handleDelete() {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
    try { await api("DELETE", `/productos/${producto.id}`); onRefresh(); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Error", "error"); }
  }
  return (
    <>
      <div style={{ ...card, marginBottom: 8 }}>
        <div style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setExpanded(!expanded)}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: T.font, fontWeight: 700, color: C.text, fontSize: 14 }}>{producto.nombre}</span>
              <span style={{ fontFamily: T.mono, color: C.textMuted, fontSize: 10 }}>{producto.id}</span>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, fontFamily: T.body }}>
              <span style={{ color: C.textMuted }}>{producto.variantes.length} vars</span>
              <span style={{ color: C.textMuted }}>Stock: <span style={{ fontFamily: T.mono, color: C.text, fontWeight: 600 }}>{totalStock}</span></span>
              {sinStock > 0 && <span style={{ color: C.red }}>{sinStock} sin stock</span>}
              {bajStock > 0 && <span style={{ color: C.amber }}>{bajStock} bajo</span>}
            </div>
          </div>
          <span style={{ color: C.textMuted, fontSize: 12, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▾</span>
        </div>
        <div style={{ padding: "0 18px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => { setShowAddVar(true); setExpanded(true); }} style={btnSecondary}>+ Variante</button>
          <button onClick={handleSyncAll} disabled={!!syncProgress} style={{ ...btnGreen, opacity: syncProgress ? 0.6 : 1 }}>{syncProgress ? `${syncProgress.current}/${syncProgress.total}` : "↑ Sync todo"}</button>
          <SyncVariantesBtn productoId={producto.id} onRefresh={onRefresh} onToast={onToast} />
          <button onClick={handleDelete} style={{ ...btnRed, marginLeft: "auto" }}>Eliminar</button>
        </div>
        {syncProgress && <div style={{ padding: "0 18px 12px" }}><ProgressBar current={syncProgress.current} total={syncProgress.total} label={syncProgress.label} /></div>}
        {expanded && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 18px" }}>
            {producto.variantes.length === 0 ? <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>Sin variantes — presioná "+ Variante"</p>
              : producto.variantes.map(v => <VarianteRow key={v.id} productoId={producto.id} variante={v} onRefresh={onRefresh} onToast={onToast} />)}
          </div>
        )}
      </div>
      {showAddVar && <AddVarianteModal productoId={producto.id} onClose={() => setShowAddVar(false)} onAdded={() => { onRefresh(); setShowAddVar(false); onToast("Variante agregada"); }} />}
    </>
  );
}

function CreateProductoModal({ onClose, onCreated, showToast, loadTnProducts }: { onClose: () => void; onCreated: () => void; showToast: (m: string, t?: string) => void; loadTnProducts: () => Promise<TnProduct[]> }) {
  const [step, setStep] = useState<"select" | "confirm">("select"); const [tnProducts, setTnProducts] = useState<TnProduct[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [selected, setSelected] = useState<TnProduct | null>(null); const [nombre, setNombre] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  useEffect(() => { loadTnProducts().then(d => { setTnProducts(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const q = search.toLowerCase();
  const filtered = tnProducts.filter(p => { const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name); return !EXCLUIR.test(n); }).filter(p => { const n = typeof p.name === "object" ? (p.name.es || "") : String(p.name); return !q || n.toLowerCase().includes(q); });
  function getPName(p: TnProduct) { return typeof p.name === "object" ? (p.name.es || `Producto ${p.id}`) : String(p.name); }
  function handleSelect(p: TnProduct) { setSelected(p); setNombre(getPName(p)); setStep("confirm"); }
  async function handleCreate() {
    if (!selected || !nombre) return;
    const variantesAll = selected.variants; const total = 1 + variantesAll.length * 2; let paso = 0;
    setProgress({ current: 0, total, label: "Creando producto..." });
    try {
      await api("POST", "/productos", { id: nombre, nombre }); paso++;
      const pName = getPName(selected); const productoId = nombre.toUpperCase().replace(/\s+/g, "_");
      for (const v of variantesAll) {
        const vLabel = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `Variante ${v.id}`;
        setProgress({ current: paso, total, label: `Creando: ${vLabel}` });
        const nv = await api("POST", `/productos/${productoId}/variantes`, { label: vLabel, stock: v.stock }); paso++;
        await api("POST", `/productos/${productoId}/variantes/${nv.id}/links`, { product_id: String(selected.id), variant_id: String(v.id), label: `${pName} · ${vLabel}` }); paso++;
      }
      setProgress({ current: total, total, label: `Listo — ${variantesAll.length} variante(s)` });
      showToast(`"${nombre}" creado con ${variantesAll.length} variante(s)`); setTimeout(onCreated, 1000);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Error", "error"); setProgress(null); }
  }
  const variantesConStock = selected?.variants || [];
  return (
    <Modal title={step === "select" ? "Nuevo producto" : "Confirmar importación"} subtitle={step === "select" ? "Elegí el producto base de TN" : nombre} onClose={onClose} wide>
      {step === "select" ? (
        <>
          <input autoFocus style={{ ...inp, marginBottom: 12 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          {loading && <p style={{ color: C.textMuted, textAlign: "center" }}>Cargando...</p>}
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
            {filtered.map(p => {
              const n = getPName(p); const conStock = p.variants.filter(v => v.stock && v.stock > 0).length;
              return (
                <div key={p.id} onClick={() => handleSelect(p)} style={{ padding: "11px 14px", borderRadius: 7, cursor: "pointer", background: C.bg, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 500, fontSize: 13, fontFamily: T.body }}>{n}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2, fontFamily: T.body }}>{p.variants.length} variantes · {conStock} con stock</div>
                  </div>
                  <span style={{ color: C.textMuted }}>→</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}><label style={lbl}>Nombre en Stock Central</label><input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} disabled={!!progress} /></div>
          <div style={{ ...card, padding: 12, marginBottom: 14 }}>
            <div style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: T.mono }}>Variantes a importar ({variantesConStock.length}) — incluye sin stock</div>
            {variantesConStock.map(v => { const vl = v.values?.map(vv => Object.values(vv)[0]).join(" / ") || `V ${v.id}`; return <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}><span style={{ color: C.text, fontFamily: T.body }}>{vl}</span><span style={{ color: C.accent, fontFamily: T.mono }}>{v.stock}</span></div>; })}
          </div>
          {progress && <div style={{ marginBottom: 12 }}><ProgressBar current={progress.current} total={progress.total} label={progress.label} /></div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("select")} style={{ ...btnSecondary, opacity: progress ? 0.4 : 1 }} disabled={!!progress}>← Volver</button>
            <button onClick={handleCreate} disabled={!!progress || !nombre} style={{ ...btnPrimary, flex: 1, opacity: progress || !nombre ? 0.5 : 1 }}>{progress ? `${progress.current}/${progress.total}...` : `Crear e importar ${variantesConStock.length} var.`}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ProductosView({ productos, onRefresh, onToast, loadTnProducts }: { productos: Producto[]; onRefresh: () => void; onToast: (m: string, t?: string) => void; loadTnProducts: () => Promise<TnProduct[]> }) {
  const [search, setSearch] = useState(""); const [showCreate, setShowCreate] = useState(false);
  const filtered = productos.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><h2 style={{ margin: "0 0 4px", fontFamily: T.font, fontSize: 22, fontWeight: 800, color: C.text }}>Productos</h2><p style={{ margin: 0, color: C.textMuted, fontSize: 13, fontFamily: T.body }}>SKUs centrales con links a variantes de Tiendanube</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onRefresh} style={{ ...btnSecondary, padding: "8px 12px" }}>↻</button>
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ Nuevo producto</button>
        </div>
      </div>
      <input style={inp} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>▤</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 6px", fontFamily: T.font }}>{productos.length === 0 ? "Sin productos todavía" : "Sin resultados"}</p>
        </div>
      ) : filtered.map(p => <ProductoCard key={p.id} producto={p} onRefresh={onRefresh} onToast={onToast} />)}
      {showCreate && <CreateProductoModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); onRefresh(); }} showToast={onToast} loadTnProducts={loadTnProducts} />}
    </div>
  );
}

function ConfigView({ onSaved }: { onSaved: () => void }) {
  const [token, setToken] = useState(""); const [storeId, setStoreId] = useState(""); const [webhookUrl, setWebhookUrl] = useState(""); const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  async function handleSave() { try { await api("POST", "/config", { access_token: token, store_id: storeId }); setResult({ ok: true, msg: "Credenciales guardadas" }); setTimeout(onSaved, 800); } catch (e: unknown) { setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" }); } }
  async function handleTest() { try { const r = await api("POST", "/config/test"); setResult({ ok: true, msg: r.store_name }); } catch (e: unknown) { setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" }); } }
  async function handleWebhook() { if (!webhookUrl) return; try { const r = await api("POST", "/config/webhook", { webhook_url: webhookUrl }); setResult({ ok: true, msg: r.message }); } catch (e: unknown) { setResult({ ok: false, msg: e instanceof Error ? e.message : "Error" }); } }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
      <div><h2 style={{ margin: "0 0 4px", fontFamily: T.font, fontSize: 22, fontWeight: 800, color: C.text }}>Configuración</h2><p style={{ margin: 0, color: C.textMuted, fontSize: 13, fontFamily: T.body }}>Conectá Stock Central con tu tienda</p></div>
      <div><label style={lbl}>Store ID</label><input style={inp} value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="1443972" /></div>
      <div><label style={lbl}>Access Token</label><input style={inp} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="af56c0..." /></div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={handleSave} style={btnPrimary}>Guardar</button><button onClick={handleTest} style={btnSecondary}>Probar conexión</button></div>
      <div><label style={lbl}>URL pública (webhooks)</label><input style={inp} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://stock-central-production.up.railway.app" /></div>
      <button onClick={handleWebhook} style={{ ...btnGreen, padding: "9px 16px", fontSize: 12 }}>Registrar webhooks en Tiendanube</button>
      {result && <div style={{ padding: "10px 14px", borderRadius: 6, background: result.ok ? C.accentDim : C.redDim, border: `1px solid ${result.ok ? C.accentBorder : "#3a1010"}`, color: result.ok ? C.accent : C.red, fontSize: 13, fontFamily: T.body }}>{result.msg}</div>}
    </div>
  );
}
// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"loading" | "setup" | "app">("loading");
  const [nav, setNav] = useState<NavSection>("dashboard");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
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
    document.title = "Stock Central · Minch";
    api("GET", "/config").then((cfg: { has_token: boolean }) => {
      setView(cfg.has_token ? "app" : "setup");
      if (cfg.has_token) loadData();
    }).catch(() => setView("setup"));
  }, [loadData]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    if (view !== "app") return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [view, loadData]);

  async function loadTnProducts() {
    if (tnCache.length > 0) return tnCache;
    const data = await api("GET", "/tn-products");
    setTnCache(data); return data;
  }

  if (view === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.body }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: T.font, fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>STOCK<span style={{ color: C.accent }}>.</span></div>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", margin: "0 auto", animation: "spin 0.8s linear infinite" }} />
      </div>
    </div>
  );

  if (view === "setup") return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; } input:focus { border-color: #333 !important; }`}</style>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ fontFamily: T.font, fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 4 }}>STOCK<span style={{ color: C.accent }}>.</span></div>
        <p style={{ color: C.textMuted, fontSize: 13, fontFamily: T.body, marginBottom: 32 }}>Configurá la conexión con tu tienda para comenzar.</p>
        <ConfigView onSaved={() => { setView("app"); loadData(); }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: T.body, display: "flex" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
        input:focus, select:focus { border-color: #333 !important; outline: none; }
        button { transition: opacity 0.15s, background 0.15s; }
      `}</style>

      {/* Sidebar */}
      <Sidebar active={nav} onNav={setNav} stats={stats} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, background: `${C.bg}f0`, backdropFilter: "blur(12px)", zIndex: 50 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{nav}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {stats?.active_reservations !== undefined && stats.active_reservations > 0 && (
              <span style={{ background: C.amberDim, color: C.amber, border: `1px solid #3d2c00`, borderRadius: 5, padding: "3px 9px", fontSize: 11, fontFamily: T.mono }}>
                {stats.active_reservations} reserva(s)
              </span>
            )}
            <button onClick={loadData} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 11 }}>↻ Actualizar</button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "28px 28px", maxWidth: 1000, margin: "0 auto" }}>
          {nav === "dashboard" && <Dashboard stats={stats} productos={productos} />}
          {nav === "productos" && <ProductosView productos={productos} onRefresh={loadData} onToast={showToast} loadTnProducts={loadTnProducts} />}
          {nav === "matchs" && <MatchsView onToast={showToast} />}
          {nav === "actividad" && <ActivityView stats={stats} />}
          {nav === "config" && <ConfigView onSaved={loadData} />}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}