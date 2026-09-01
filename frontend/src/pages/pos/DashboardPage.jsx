import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { apiClient, asList } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle } from "../../styles/formStyles";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { activeShopId, activeShop } = useShop();

  const [dateAfter, setDateAfter] = useState(isoDaysAgo(30));
  const [dateBefore, setDateBefore] = useState(todayIso());

  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    Promise.all([
      apiClient.get(`/shops/${activeShopId}/stats/dashboard/`, { params: { date_after: dateAfter, date_before: dateBefore } }),
      apiClient.get(`/shops/${activeShopId}/items/`, { params: { ordering: "quantity", page_size: 5 } }),
    ])
      .then(([statsRes, itemsRes]) => {
        setStats(statsRes.data);
        setLowStock(asList(itemsRes.data).filter((i) => i.quantity <= 5));
      })
      .finally(() => setLoading(false));
  }, [activeShopId, dateAfter, dateBefore]);

  function resetToDefault() {
    setDateAfter(isoDaysAgo(30));
    setDateBefore(todayIso());
  }

  const isDefaultRange = dateAfter === isoDaysAgo(30) && dateBefore === todayIso();
  const avgTicket = stats && stats.sales_count > 0 ? stats.revenue / stats.sales_count : 0;

  const kpis = stats
    ? [
        { label: "Chiffre d'affaires", value: formatFcfa(stats.revenue), icon: "trending_up" },
        { label: "Bénéfice", value: formatFcfa(stats.profit), icon: "savings" },
        { label: "Tickets encaissés", value: stats.sales_count, icon: "receipt_long" },
        { label: "Panier moyen", value: formatFcfa(avgTicket), icon: "shopping_bag" },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={`Activité du comptoir · ${activeShop?.shop_name}`} />

      <div style={{ padding: "24px 32px 40px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Période :</span>
          <input type="date" value={dateAfter} onChange={(e) => setDateAfter(e.target.value)} style={{ ...inputStyle, height: 38, width: 160 }} />
          <span style={{ color: "var(--color-text-faint)" }}>→</span>
          <input type="date" value={dateBefore} onChange={(e) => setDateBefore(e.target.value)} style={{ ...inputStyle, height: 38, width: 160 }} />
          {!isDefaultRange && (
            <button onClick={resetToDefault} style={{ border: "none", background: "transparent", color: "var(--color-accent)", cursor: "pointer", fontSize: 13 }}>
              Revenir aux 30 derniers jours
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ color: "var(--color-text-faint)" }}>Chargement…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {kpis.map((k) => (
                <div key={k.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{k.label}</span>
                    <span className="icon" style={{ fontSize: 20, color: "var(--color-accent)" }}>{k.icon}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.035em", marginTop: 14 }}>{k.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="icon" style={{ fontSize: 19, color: "var(--color-accent)" }}>military_tech</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Top 10 des articles vendus</span>
                </div>
                {(!stats || stats.top_items.length === 0) && (
                  <div style={{ padding: "0 24px 20px", fontSize: 13.5, color: "var(--color-text-faint)" }}>Aucune vente sur cette période.</div>
                )}
                {stats && stats.top_items.map((it, idx) => (
                  <div key={it.item_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 24px", borderTop: "1px solid var(--color-divider)" }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--color-text-ghost)", width: 18 }}>{idx + 1}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{it.name}</span>
                    <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, background: "var(--color-accent-soft)", color: "var(--color-accent)", padding: "3px 10px", borderRadius: 20 }}>
                      {it.quantity} vendu(s)
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "18px 24px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="icon" style={{ fontSize: 19, color: "var(--color-text-faint)" }}>trending_down</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Articles les moins vendus</span>
                </div>
                {(!stats || stats.least_items.length === 0) && (
                  <div style={{ padding: "0 24px 20px", fontSize: 13.5, color: "var(--color-text-faint)" }}>Aucune vente sur cette période.</div>
                )}
                {stats && stats.least_items.map((it) => (
                  <div key={it.item_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 24px", borderTop: "1px solid var(--color-divider)" }}>
                    <span style={{ flex: 1, fontSize: 14 }}>{it.name}</span>
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{it.quantity} vendu(s)</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, marginTop: 14, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="icon" style={{ fontSize: 20, color: "var(--color-warning)" }}>warning</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Stock d'alerte</span>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, background: "var(--color-warning-soft)", color: "var(--color-warning)", padding: "3px 8px", borderRadius: 20 }}>
                  {lowStock.length}
                </span>
              </div>
              {lowStock.length === 0 && (
                <div style={{ padding: "0 24px 20px", fontSize: 13.5, color: "var(--color-text-faint)" }}>Aucun article en alerte.</div>
              )}
              {lowStock.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 24px", borderTop: "1px solid var(--color-divider)" }}>
                  <span style={{ flex: 1, fontSize: 14 }}>{a.name}</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-faint)" }}>{a.category_name}</span>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, background: "var(--color-warning-soft)", color: "var(--color-warning)", padding: "3px 10px", borderRadius: 20 }}>
                    {a.quantity}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}