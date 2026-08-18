import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { apiClient, asList } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

export default function DashboardPage() {
  const { activeShopId, activeShop } = useShop();
  const [sales, setSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    Promise.all([
      apiClient.get(`/shops/${activeShopId}/sales/`, { params: { page_size: 100 } }),
      apiClient.get(`/shops/${activeShopId}/items/`, { params: { ordering: "quantity", page_size: 5 } }),
    ])
      .then(([salesRes, itemsRes]) => {
        setSales(asList(salesRes.data));
        setLowStock(asList(itemsRes.data).filter((i) => i.quantity <= 5));
      })
      .finally(() => setLoading(false));
  }, [activeShopId]);

  const totalSales = sales.reduce((sum, s) => sum + Number(s.grand_total), 0);
  const totalMomo = sales.reduce((sum, s) => sum + Number(s.total_mobile_money), 0);
  const ticketCount = sales.length;
  const avgTicket = ticketCount > 0 ? totalSales / ticketCount : 0;

  const kpis = [
    { label: "Chiffre d'affaires (jour)", value: formatFcfa(totalSales), icon: "trending_up" },
    { label: "Tickets encaissés", value: ticketCount, icon: "receipt_long" },
    { label: "Panier moyen", value: formatFcfa(avgTicket), icon: "shopping_bag" },
    { label: "Part Mobile Money", value: totalSales > 0 ? `${Math.round((totalMomo / totalSales) * 100)} %` : "0 %", icon: "smartphone" },
  ];

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={`Activité du comptoir · ${activeShop?.shop_name}`} />

      <div style={{ padding: "24px 32px 40px" }}>
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