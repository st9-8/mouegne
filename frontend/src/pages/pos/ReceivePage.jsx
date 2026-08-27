import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, asList, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import Modal from "../../components/Modal";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

export default function ReceivePage() {
  const { activeShopId, activeShop } = useShop();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [lines, setLines] = useState([]); // [{ itemId, name, quantity, price, vendorId }]

  const [vendors, setVendors] = useState([]);
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateForm, setQuickCreateForm] = useState({ name: "", price: "", quantity: 0 });
  const [quickCreateError, setQuickCreateError] = useState(null);
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);

  useEffect(() => {
    if (!activeShopId) return;
    apiClient.get(`/shops/${activeShopId}/vendors/`, { params: { page_size: 200 } }).then(({ data }) => setVendors(asList(data)));
  }, [activeShopId]);

  useEffect(() => {
    if (!activeShopId || query.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(`/shops/${activeShopId}/items/`, {
          params: { search: query, page_size: 6 },
        });
        setSuggestions(asList(data));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, activeShopId]);

  function addToCart(item) {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { itemId: item.id, name: item.name, quantity: 1, price: Number(item.purchase_price) || 0, vendorId: "" }];
    });
    setQuery("");
    setShowSuggest(false);
  }

  function updateLine(itemId, patch) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  function removeLine(itemId) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function openQuickCreate() {
    setQuickCreateForm({ name: query, price: "", quantity: 0 });
    setQuickCreateError(null);
    setShowSuggest(false);
    setQuickCreateOpen(true);
  }

  async function handleQuickCreateSubmit(e) {
    e.preventDefault();
    setQuickCreateSaving(true);
    setQuickCreateError(null);
    try {
      const { data } = await apiClient.post(`/shops/${activeShopId}/items/quick-create/`, quickCreateForm);
      addToCart({ ...data, purchase_price: quickCreateForm.price });
      setQuickCreateOpen(false);
    } catch (err) {
      setQuickCreateError(extractErrorMessage(err));
    } finally {
      setQuickCreateSaving(false);
    }
  }

  const totalValue = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);

  async function handleValidate() {
    setError(null);
    if (lines.length === 0) {
      setError("Ajoutez au moins un article à la réception.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(`/shops/${activeShopId}/purchase-batches/`, {
        description,
        items: lines.map((l) => ({
          item_id: l.itemId,
          vendor_id: l.vendorId || null,
          quantity: l.quantity,
          price: l.price.toFixed(2),
        })),
      });
      setReceipt(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function resetBatch() {
    setLines([]);
    setDescription("");
    setReceipt(null);
  }

  async function openReceiptPdf(batchId) {
    const response = await apiClient.get(`/shops/${activeShopId}/purchase-batches/${batchId}/receipt/`, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    window.open(blobUrl, "_blank");
  }

  return (
    <div>
      <header
        style={{
          padding: "22px 32px 20px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <button
          onClick={() => navigate("/pos/achats")}
          style={{ width: 38, height: 38, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span className="icon" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em" }}>Nouvelle réception</h1>
          <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--color-text-muted)" }}>
            Réapprovisionnement · {activeShop?.shop_name}
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, padding: 24 }}>
        {/* ======= ARTICLES ======= */}
        <section style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, minWidth: 0, alignSelf: "start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 16px" }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Articles réceptionnés</div>
            <button
              onClick={() => setLines([])}
              style={{ height: 34, padding: "0 12px", display: "flex", alignItems: "center", gap: 7, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, fontSize: 13, color: "var(--color-text-muted)", cursor: "pointer" }}
            >
              <span className="icon" style={{ fontSize: 17 }}>delete</span>Tout supprimer
            </button>
          </div>

          <div style={{ padding: "0 22px 18px", position: "relative" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span className="icon" style={{ fontSize: 21, color: "var(--color-text-faint)", position: "absolute", left: 15 }}>search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggest(true)}
                placeholder="Rechercher un article par nom…"
                style={{ width: "100%", height: 50, border: "1px solid var(--color-border)", background: "var(--color-surface-alt)", borderRadius: 12, padding: "0 16px 0 46px", fontSize: 15, boxSizing: "border-box" }}
              />
            </div>

            {showSuggest && query && (
              <div
                style={{
                  position: "absolute",
                  top: 56,
                  left: 22,
                  right: 22,
                  zIndex: 20,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 13,
                  boxShadow: "var(--shadow-dropdown)",
                  overflow: "hidden",
                }}
              >
                {suggestions.length === 0 && (
                  <div style={{ padding: "26px 18px", textAlign: "center", color: "var(--color-text-faint)", fontSize: 14 }}>
                    Aucun article ne correspond à « {query} »
                  </div>
                )}
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      width: "100%",
                      padding: "13px 18px",
                      border: "none",
                      borderBottom: "1px solid var(--color-divider)",
                      background: "var(--color-surface)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.name}</div>
                      <div className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)", marginTop: 3 }}>{p.category_name}</div>
                    </div>
                    <span style={{ fontSize: 12.5, color: "var(--color-text-faint)" }}>Stock {p.quantity}</span>
                  </button>
                ))}
                <button
                  onClick={openQuickCreate}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "13px 18px",
                    border: "none",
                    background: "var(--color-accent-soft)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-accent)",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <span className="icon" style={{ fontSize: 19 }}>add_circle</span>
                  Créer « {query} » comme nouvel article
                </button>
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(160px,1.2fr) 1fr 90px 118px 118px 40px",
                gap: 10,
                padding: "12px 22px",
                background: "var(--color-surface-alt)",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
                fontSize: 11,
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
                fontWeight: 600,
              }}
            >
              <span>Article</span><span>Fournisseur</span><span style={{ textAlign: "center" }}>Qté</span><span>Prix unit.</span><span style={{ textAlign: "right" }}>Total</span><span></span>
            </div>

            {lines.length === 0 && (
              <div style={{ padding: "64px 24px", textAlign: "center", color: "var(--color-text-faint)" }}>
                <span className="icon" style={{ fontSize: 38, color: "var(--color-border-hover)" }}>inventory_2</span>
                <div style={{ fontSize: 14.5, marginTop: 10 }}>Aucun article dans cette réception.</div>
              </div>
            )}

            {lines.map((l) => (
              <div
                key={l.itemId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(160px,1.2fr) 1fr 90px 118px 118px 40px",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 22px",
                  borderBottom: "1px solid var(--color-divider)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{l.name}</div>
                <select
                  value={l.vendorId}
                  onChange={(e) => updateLine(l.itemId, { vendorId: e.target.value })}
                  style={{ height: 38, border: "1px solid var(--color-border)", borderRadius: 9, padding: "0 8px", fontSize: 12.5, boxSizing: "border-box" }}
                >
                  <option value="">Aucun</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <input
                  type="number"
                  min="1"
                  className="mono"
                  value={l.quantity}
                  onChange={(e) => updateLine(l.itemId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  style={{ height: 38, border: "1px solid var(--color-border)", borderRadius: 9, textAlign: "center", fontSize: 13.5, boxSizing: "border-box" }}
                />
                <input
                  type="number"
                  className="mono"
                  value={l.price}
                  onChange={(e) => updateLine(l.itemId, { price: Number(e.target.value) || 0 })}
                  style={{ height: 38, border: "1px solid var(--color-border)", borderRadius: 9, padding: "0 8px", fontSize: 13.5, boxSizing: "border-box" }}
                />
                <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, textAlign: "right" }}>{formatFcfa(l.price * l.quantity)}</span>
                <button onClick={() => removeLine(l.itemId)} style={{ width: 32, height: 32, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, color: "var(--color-text-ghost)", cursor: "pointer", justifySelf: "end" }}>
                  <span className="icon" style={{ fontSize: 17 }}>delete</span>
                </button>
              </div>
            ))}

            <div style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-faint)" }}>
              <span>{lines.length} article(s)</span>
            </div>
          </div>
        </section>

        {/* ======= DÉTAILS ======= */}
        <aside style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, alignSelf: "start" }}>
          <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--color-border)", fontSize: 15.5, fontWeight: 600 }}>Détails</div>

          <div style={{ padding: "18px 22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={labelStyle}>
              <span>Note (optionnel)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Livraison du 20/08, BL n°1234"
                style={{ ...inputStyle, height: 80, padding: 12, boxSizing: "border-box" }}
              />
            </label>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Valeur totale</span>
              <span className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.035em" }}>{formatFcfa(totalValue)}</span>
            </div>

            {error && (
              <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleValidate}
              disabled={submitting}
              style={{ height: 50, border: "none", borderRadius: 12, background: "var(--color-accent)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <span className="icon" style={{ fontSize: 21 }}>check</span>
              {submitting ? "Validation…" : "Valider la réception"}
            </button>
          </div>
        </aside>
      </div>

      {quickCreateOpen && (
        <Modal title="Nouvel article" onClose={() => setQuickCreateOpen(false)} width={400}>
          <form onSubmit={handleQuickCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Nom</span>
              <input style={inputStyle} value={quickCreateForm.name} onChange={(e) => setQuickCreateForm({ ...quickCreateForm, name: e.target.value })} required autoFocus />
            </label>
            <label style={labelStyle}>
              <span>Prix d'achat unitaire</span>
              <input type="number" style={inputStyle} value={quickCreateForm.price} onChange={(e) => setQuickCreateForm({ ...quickCreateForm, price: e.target.value })} required />
            </label>
            <p style={{ fontSize: 12.5, color: "var(--color-text-faint)", margin: 0 }}>
              L'article sera classé dans la catégorie « Divers » et ajouté à la réception avec la quantité que vous saisirez dans le panier.
            </p>

            {quickCreateError && (
              <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{quickCreateError}</div>
            )}

            <button type="submit" disabled={quickCreateSaving} style={primaryButtonStyle}>{quickCreateSaving ? "Création…" : "Créer et ajouter"}</button>
          </form>
        </Modal>
      )}

      {receipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,22,19,0.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 400, maxWidth: "92vw", background: "var(--color-surface)", borderRadius: 20, padding: "34px 30px 26px", textAlign: "center", boxShadow: "var(--shadow-modal)" }}>
            <div style={{ width: 58, height: 58, margin: "0 auto", borderRadius: "50%", background: "var(--color-accent-soft)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="icon" style={{ fontSize: 30 }}>check</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 600, marginTop: 18 }}>Réception enregistrée</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6 }}>{receipt.reference}</div>
            <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 10 }}>{formatFcfa(receipt.total_value)}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => openReceiptPdf(receipt.id)}
                style={{ flex: 1, height: 48, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 12, fontSize: 14.5, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <span className="icon" style={{ fontSize: 19 }}>receipt_long</span>
                Bon PDF
              </button>
              <button
                onClick={resetBatch}
                style={{ flex: 1, height: 48, border: "none", background: "var(--color-accent)", color: "#fff", borderRadius: 12, fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
              >
                Nouvelle réception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}