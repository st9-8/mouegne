import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { useShopResource } from "../../lib/useShopResource";
import { inputStyle } from "../../styles/formStyles";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function SalesHistoryPage() {
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const params = {};
  if (dateAfter) params.date_after = dateAfter;
  if (dateBefore) params.date_before = dateBefore;

  const { items, count, totalPages, page, setPage, loading } = useShopResource("sales/", params);

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

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1fr 1fr 0.6fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
            <span>Client</span><span>Heure</span><span>Paiement</span><span style={{ textAlign: "right" }}>Montant</span><span></span>
          </div>

          {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
          {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucune vente sur cette période.</div>}

          {items.map((s) => (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.4fr 1fr 1fr 0.6fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ fontSize: 14 }}>{s.customer_name || "Client de passage"}</span>
              <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{formatTime(s.created_at)}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {s.mobile_money_covers_total ? "Mobile Money" : Number(s.total_mobile_money) > 0 ? "Mixte" : "Espèces"}
              </span>
              <span className="mono" style={{ fontSize: 14, textAlign: "right", fontWeight: 600 }}>{formatFcfa(s.grand_total)}</span>
              <span style={{ display: "flex", justifyContent: "flex-end" }}>
                <span className="icon" style={{ fontSize: 18, color: "var(--color-text-faint)" }}>receipt_long</span>
              </span>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} />
        </div>
      </div>
    </div>
  );
}
