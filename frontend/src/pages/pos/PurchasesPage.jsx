import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle, secondaryButtonStyle } from "../../styles/formStyles";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PurchasesPage() {
  const { activeShopId } = useShop();
  const navigate = useNavigate();
  const [tab, setTab] = useState("receptions"); // receptions | purchases | vendors

  const { items: batches, count: batchCount, totalPages: batchTotalPages, page: batchPage, setPage: setBatchPage, loading: batchesLoading } = useShopResource("purchase-batches/");
  const { items: purchases, count: purchaseCount, totalPages: purchaseTotalPages, page: purchasePage, setPage: setPurchasePage, loading: purchasesLoading } = useShopResource("purchases/");
  const { items: vendors, count: vendorCount, totalPages: vendorTotalPages, page: vendorPage, setPage: setVendorPage, loading: vendorsLoading, reload: reloadVendors } = useShopResource("vendors/");

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", phone_number: "", address: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function openReceiptPdf(batchId) {
    const response = await apiClient.get(`/shops/${activeShopId}/purchase-batches/${batchId}/receipt/`, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    window.open(blobUrl, "_blank");
  }

  async function handleCreateVendor(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/shops/${activeShopId}/vendors/`, vendorForm);
      setVendorModalOpen(false);
      setVendorForm({ name: "", phone_number: "", address: "" });
      reloadVendors();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Achats & fournisseurs"
        subtitle="Réceptions de stock et carnet de fournisseurs"
        actions={
          <>
            <button onClick={() => setVendorModalOpen(true)} style={secondaryButtonStyle}>
              <span className="icon" style={{ fontSize: 19 }}>add_business</span>Fournisseur
            </button>
            <button onClick={() => navigate("/pos/achats/nouvelle")} style={{ ...primaryButtonStyle, height: 46, padding: "0 18px" }}>
              <span className="icon" style={{ fontSize: 20 }}>add</span>Réceptionner un achat
            </button>
          </>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[{ key: "receptions", label: "Réceptions" }, { key: "purchases", label: "Détail par article" }, { key: "vendors", label: "Fournisseurs" }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                height: 38,
                padding: "0 16px",
                border: "1px solid var(--color-border)",
                background: tab === t.key ? "var(--color-accent-soft)" : "var(--color-surface)",
                color: tab === t.key ? "var(--color-accent)" : "var(--color-text-secondary)",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: tab === t.key ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "receptions" && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr 1fr 1fr 0.6fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
              <span>Référence</span><span>Note</span><span>Articles</span><span style={{ textAlign: "right" }}>Valeur</span><span></span>
            </div>
            {batchesLoading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
            {!batchesLoading && batches.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucune réception enregistrée.</div>}
            {batches.map((b) => (
              <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr 1fr 1fr 0.6fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
                <span className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{b.reference}</span>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{b.description || "—"}</span>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{b.purchases?.length || 0} article(s)</span>
                <span className="mono" style={{ fontSize: 14, textAlign: "right", fontWeight: 500 }}>{formatFcfa(b.total_value)}</span>
                <button
                  onClick={() => openReceiptPdf(b.id)}
                  title="Voir le bon PDF"
                  style={{ width: 32, height: 32, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-faint)", justifySelf: "end" }}
                >
                  <span className="icon" style={{ fontSize: 18 }}>receipt_long</span>
                </button>
              </div>
            ))}
            <Pagination page={batchPage} totalPages={batchTotalPages} onChange={setBatchPage} count={batchCount} />
          </div>
        )}

        {tab === "purchases" && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 0.8fr 1fr 1fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
              <span>Article</span><span>Fournisseur</span><span>Quantité</span><span style={{ textAlign: "right" }}>Valeur</span><span>Date</span>
            </div>
            {purchasesLoading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
            {!purchasesLoading && purchases.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucun achat enregistré.</div>}
            {purchases.map((p) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 0.8fr 1fr 1fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{p.item_name}</span>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{p.vendor_name || "—"}</span>
                <span className="mono" style={{ fontSize: 14 }}>+{p.quantity}</span>
                <span className="mono" style={{ fontSize: 14, textAlign: "right", fontWeight: 500 }}>{formatFcfa(p.total_value)}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{formatDate(p.created_at)}</span>
              </div>
            ))}
            <Pagination page={purchasePage} totalPages={purchaseTotalPages} onChange={setPurchasePage} count={purchaseCount} />
          </div>
        )}

        {tab === "vendors" && (
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1.6fr", gap: 16, padding: "14px 24px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", fontSize: 11.5, textTransform: "uppercase", color: "var(--color-text-faint)", fontWeight: 600 }}>
              <span>Nom</span><span>Téléphone</span><span>Adresse</span>
            </div>
            {vendorsLoading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Chargement…</div>}
            {!vendorsLoading && vendors.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-faint)" }}>Aucun fournisseur enregistré.</div>}
            {vendors.map((v) => (
              <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1.6fr", gap: 16, alignItems: "center", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{v.name}</span>
                <span className="mono" style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{v.phone_number || "—"}</span>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>{v.address || "—"}</span>
              </div>
            ))}
            <Pagination page={vendorPage} totalPages={vendorTotalPages} onChange={setVendorPage} count={vendorCount} />
          </div>
        )}
      </div>


      {vendorModalOpen && (
        <Modal title="Nouveau fournisseur" onClose={() => setVendorModalOpen(false)}>
          <form onSubmit={handleCreateVendor} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Nom</span>
              <input style={inputStyle} value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
            </label>
            <label style={labelStyle}>
              <span>Téléphone</span>
              <input style={inputStyle} value={vendorForm.phone_number} onChange={(e) => setVendorForm({ ...vendorForm, phone_number: e.target.value })} />
            </label>
            <label style={labelStyle}>
              <span>Adresse</span>
              <input style={inputStyle} value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Enregistrement…" : "Créer le fournisseur"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}