import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, asList, openSaleReceipt } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle } from "../../styles/formStyles";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function SalesHistoryPage() {
  const { activeShopId } = useShop();
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const params = {};
  if (dateAfter) params.date_after = dateAfter;
  if (dateBefore) params.date_before = dateBefore;

  const { items, count, totalPages, page, setPage, loading } = useShopResource("sales/", params);

  // Synthèse calculée sur TOUTES les ventes de la période (pas seulement la page
  // affichée) — nécessite un second appel avec une taille de page large, distinct
  // du tableau paginé ci-dessous.
  const [totals, setTotals] = useState({ grandTotal: 0, mobileMoney: 0 });
  const [totalsLoading, setTotalsLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    setTotalsLoading(true);
    apiClient
      .get(`/shops/${activeShopId}/sales/`, { params: { ...params, page_size: 1000 } })
      .then(({ data }) => {
        const sales = asList(data);
        const grandTotal = sales.reduce((sum, s) => sum + Number(s.grand_total), 0);
        const mobileMoney = sales.reduce((sum, s) => sum + Number(s.total_mobile_money), 0);
        setTotals({ grandTotal, mobileMoney });
      })
      .finally(() => setTotalsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, dateAfter, dateBefore]);

  return (
    <div>
      <PageHeader
        title="Historique des ventes"
        subtitle={dateAfter || dateBefore ? `${count} vente(s) sur la période` : "Ventes du jour · toutes boutiques confondues"}
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Période :</span>
          <input type="date" value={dateAfter} onChange={(e) => { setDateAfter(e.target.value); setPage(1); }} style={{ ...inputStyle, height: 38, width: 160 }} />
          <span style={{ color: "var(--color-text-faint)" }}>→</span>
          <input type="date" value={dateBefore} onChange={(e) => { setDateBefore(e.target.value); setPage(1); }} style={{ ...inputStyle, height: 38, width: 160 }} />
          {(dateAfter || dateBefore) && (
            <button onClick={() => { setDateAfter(""); setDateBefore(""); }} style={{ border: "none", background: "transparent", color: "var(--color-accent)", cursor: "pointer", fontSize: 13 }}>
              Revenir à aujourd'hui
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Montant total</span>
              <span className="icon" style={{ fontSize: 20, color: "var(--color-accent)" }}>payments</span>
            </div>
            <div className="mono" style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.035em", marginTop: 14 }}>
              {totalsLoading ? "…" : formatFcfa(totals.grandTotal)}
            </div>
          </div>

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Montant total Mobile Money</span>
              <span className="icon" style={{ fontSize: 20, color: "var(--color-accent)" }}>smartphone</span>
            </div>
            <div className="mono" style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.035em", marginTop: 14 }}>
              {totalsLoading ? "…" : formatFcfa(totals.mobileMoney)}
            </div>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.6fr 1.4fr 1fr 1fr 0.6fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
            <span>Ticket</span><span>Client</span><span>Heure</span><span>Paiement</span><span style={{ textAlign: "right" }}>Montant</span><span></span>
          </div>

          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
          {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucune vente sur cette période.</div>}

          {items.map((s) => (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "0.7fr 1.6fr 1.4fr 1fr 1fr 0.6fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--color-text-faint)" }}>#{s.reference}</span>
              <span style={{ fontSize: 14 }}>{s.customer_name || "Client de passage"}</span>
              <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{formatTime(s.created_at)}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {s.mobile_money_covers_total ? "Mobile Money" : Number(s.total_mobile_money) > 0 ? "Mixte" : "Espèces"}
              </span>
              <span className="mono" style={{ fontSize: 14, textAlign: "right", fontWeight: 600 }}>{formatFcfa(s.grand_total)}</span>
              <span style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => openSaleReceipt(activeShopId, s.id)}
                  title="Voir le reçu PDF"
                  style={{ width: 32, height: 32, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-faint)" }}
                >
                  <span className="icon" style={{ fontSize: 18 }}>receipt_long</span>
                </button>
              </span>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} />
        </div>
      </div>
    </div>
  );
}