import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, asList, extractErrorMessage } from "../../lib/apiClient";
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
  const [tab, setTab] = useState("purchases"); // purchases | vendors

  const { items: purchases, count: purchaseCount, totalPages: purchaseTotalPages, page: purchasePage, setPage: setPurchasePage, loading: purchasesLoading, reload: reloadPurchases } = useShopResource("purchases/");
  const { items: vendors, count: vendorCount, totalPages: vendorTotalPages, page: vendorPage, setPage: setVendorPage, loading: vendorsLoading, reload: reloadVendors } = useShopResource("vendors/");

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ item: "", vendor: "", quantity: 1, price: "", description: "" });
  const [itemQuery, setItemQuery] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSuggest, setShowItemSuggest] = useState(false);
  const [selectedItemLabel, setSelectedItemLabel] = useState("");
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", phone_number: "", address: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Recherche d'articles avec debounce, même pattern que l'écran de vente
  useEffect(() => {
    if (!activeShopId || itemQuery.trim().length === 0) {
      setItemSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(`/shops/${activeShopId}/items/`, {
          params: { search: itemQuery, page_size: 8 },
        });
        setItemSuggestions(asList(data));
      } catch {
        setItemSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [itemQuery, activeShopId]);

  function selectItem(item) {
    setPurchaseForm({ ...purchaseForm, item: item.id });
    setSelectedItemLabel(item.name);
    setItemQuery("");
    setShowItemSuggest(false);
  }

  async function handleCreatePurchase(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/shops/${activeShopId}/purchases/`, purchaseForm);
      setPurchaseModalOpen(false);
      setPurchaseForm({ item: "", vendor: "", quantity: 1, price: "", description: "" });
      setSelectedItemLabel("");
      setItemQuery("");
      reloadPurchases();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
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
            <button onClick={() => setPurchaseModalOpen(true)} style={{ ...primaryButtonStyle, height: 46, padding: "0 18px" }}>
              <span className="icon" style={{ fontSize: 20 }}>add</span>Réceptionner un achat
            </button>
          </>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[{ key: "purchases", label: "Achats" }, { key: "vendors", label: "Fournisseurs" }].map((t) => (
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

      {purchaseModalOpen && (
        <Modal
          title="Réceptionner un achat"
          onClose={() => {
            setPurchaseModalOpen(false);
            setItemQuery("");
            setSelectedItemLabel("");
          }}
          width={560}
        >
          <form onSubmit={handleCreatePurchase} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Article</span>
                <div style={{ position: "relative", width: "100%" }}>
                <input
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  value={purchaseForm.item ? selectedItemLabel : itemQuery}
                  onChange={(e) => {
                    setItemQuery(e.target.value);
                    setPurchaseForm({ ...purchaseForm, item: "" });
                    setSelectedItemLabel("");
                    setShowItemSuggest(true);
                  }}
                  onFocus={() => setShowItemSuggest(true)}
                  placeholder="Rechercher un article par nom…"
                  autoComplete="off"
                  required
                />
                {showItemSuggest && itemQuery && !purchaseForm.item && (
                  <div
                    style={{
                      position: "absolute",
                      top: 52,
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 13,
                      boxShadow: "var(--shadow-dropdown)",
                      overflow: "hidden",
                      maxHeight: 280,
                      overflowY: "auto",
                    }}
                  >
                    {itemSuggestions.length === 0 && (
                      <div style={{ padding: "18px", textAlign: "center", color: "var(--color-text-faint)", fontSize: 13.5 }}>
                        Aucun article ne correspond à « {itemQuery} »
                      </div>
                    )}
                    {itemSuggestions.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => selectItem(it)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          width: "100%",
                          padding: "12px 16px",
                          border: "none",
                          borderBottom: "1px solid var(--color-divider)",
                          background: "var(--color-surface)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</span>
                        <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>Stock {it.quantity}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label style={labelStyle}>
              <span>Fournisseur (optionnel)</span>
              <select style={inputStyle} value={purchaseForm.vendor} onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor: e.target.value })}>
                <option value="">Aucun</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span>Quantité</span>
                <input type="number" min="1" style={inputStyle} value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required />
              </label>
              <label style={labelStyle}>
                <span>Prix d'achat unitaire</span>
                <input type="number" style={inputStyle} value={purchaseForm.price} onChange={(e) => setPurchaseForm({ ...purchaseForm, price: e.target.value })} required />
              </label>
            </div>
            <label style={labelStyle}>
              <span>Note (optionnel)</span>
              <input style={inputStyle} value={purchaseForm.description} onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })} />
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Enregistrement…" : "Ajouter au stock"}</button>
          </form>
        </Modal>
      )}

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