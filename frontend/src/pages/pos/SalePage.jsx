import { useEffect, useMemo, useState } from "react";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import Modal from "../../components/Modal";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";
function formatFcfa(amount) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)) + " FCFA";
}

export default function SalePage() {
  const { activeShopId, activeShop } = useShop();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [lines, setLines] = useState([]); // [{ itemId, name, price, quantity, stock }]

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");

  const [tvaPct, setTvaPct] = useState(0);
  const [otherTaxes, setOtherTaxes] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("especes"); // especes | momo | mixte
  const [cashAmount, setCashAmount] = useState("");
  const [momoAmount, setMomoAmount] = useState("");
  const [hasSav, setHasSav] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null); // vente validée, pour la modale de confirmation

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateForm, setQuickCreateForm] = useState({ name: "", price: "", quantity: 1 });
  const [quickCreateError, setQuickCreateError] = useState(null);
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);

  // Recherche d'articles avec debounce simple
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
        setSuggestions(Array.isArray(data) ? data : data?.results || []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, activeShopId]);

  useEffect(() => {
    if (!activeShopId) return;
    apiClient
      .get(`/shops/${activeShopId}/customers/`, { params: { page_size: 100 } })
      .then(({ data }) => setCustomers(Array.isArray(data) ? data : data?.results || []))
      .catch(() => setCustomers([]));
  }, [activeShopId]);

  function addToCart(item) {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { itemId: item.id, name: item.name, price: Number(item.price), quantity: 1, stock: item.quantity }];
    });
    setQuery("");
    setShowSuggest(false);
  }

  function updateLine(itemId, patch) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  function openQuickCreate() {
    setQuickCreateForm({ name: query, price: "", quantity: 1 });
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
      addToCart(data);
      setQuickCreateOpen(false);
    } catch (err) {
      setQuickCreateError(extractErrorMessage(err));
    } finally {
      setQuickCreateSaving(false);
    }
  }

  function removeLine(itemId) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);
  const tvaAmount = useMemo(() => (subtotal * (Number(tvaPct) || 0)) / 100, [subtotal, tvaPct]);
  const total = useMemo(() => subtotal + tvaAmount + (Number(otherTaxes) || 0), [subtotal, tvaAmount, otherTaxes]);

  const { cash, momo } = useMemo(() => {
    if (paymentMethod === "especes") return { cash: total, momo: 0 };
    if (paymentMethod === "momo") return { cash: 0, momo: total };
    return { cash: Number(cashAmount) || 0, momo: Number(momoAmount) || 0 };
  }, [paymentMethod, total, cashAmount, momoAmount]);

  const amountPaid = cash + momo;
  const change = Math.max(0, amountPaid - total);

  async function handleValidate() {
    setError(null);
    if (lines.length === 0) {
      setError("Ajoutez au moins un article au ticket.");
      return;
    }
    if (Math.round(amountPaid) < Math.round(total)) {
      setError("Le montant payé doit couvrir le total de la vente.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post(`/shops/${activeShopId}/sales/`, {
        customer_id: customerId || null,
        sub_total: subtotal.toFixed(2),
        grand_total: total.toFixed(2),
        tax_amount: tvaAmount.toFixed(2),
        tax_percentage: Number(tvaPct) || 0,
        amount_paid: amountPaid.toFixed(2),
        amount_change: change.toFixed(2),
        total_mobile_money: momo.toFixed(2),
        cash_payment_amount: cash.toFixed(2),
        mobile_money_covers_total: paymentMethod === "momo",
        has_sav: hasSav,
        items: lines.map((l) => ({
          item_id: l.itemId,
          price: l.price.toFixed(2),
          quantity: l.quantity,
          total_item: (l.price * l.quantity).toFixed(2),
        })),
      });
      setReceipt(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function resetSale() {
    setLines([]);
    setCustomerId("");
    setTvaPct(0);
    setOtherTaxes(0);
    setCashAmount("");
    setMomoAmount("");
    setHasSav(false);
    setReceipt(null);
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
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em" }}>Nouvelle vente</h1>
          <p style={{ margin: "5px 0 0", fontSize: 13.5, color: "var(--color-text-muted)" }}>
            Comptoir · {activeShop?.shop_name}
          </p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, padding: 24 }}>
        {/* ======= ARTICLES ======= */}
        <section style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, minWidth: 0, alignSelf: "start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 16px" }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>Articles</div>
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
                style={{ width: "100%", height: 50, border: "1px solid var(--color-border)", background: "var(--color-surface-alt)", borderRadius: 12, padding: "0 16px 0 46px", fontSize: 15 }}
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
                      <div className="mono" style={{ fontSize: 12, color: "var(--color-text-faint)", marginTop: 3 }}>
                        {p.category_name}
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5, color: p.quantity > 0 ? "var(--color-accent)" : "var(--color-danger)" }}>
                      Stock {p.quantity}
                    </span>
                    <span className="mono" style={{ fontSize: 14.5, fontWeight: 600, minWidth: 108, textAlign: "right" }}>
                      {formatFcfa(p.price)}
                    </span>
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
                gridTemplateColumns: "34px minmax(180px,1fr) 132px 140px 128px 44px",
                gap: 12,
                padding: "12px 22px",
                background: "var(--color-surface-alt)",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
                fontSize: 11.5,
                textTransform: "uppercase",
                color: "var(--color-text-faint)",
                fontWeight: 600,
              }}
            >
              <span>#</span><span>Nom</span><span>Prix unitaire</span><span style={{ textAlign: "center" }}>Quantité</span><span style={{ textAlign: "right" }}>Total</span><span></span>
            </div>

            {lines.length === 0 && (
              <div style={{ padding: "64px 24px", textAlign: "center", color: "var(--color-text-faint)" }}>
                <span className="icon" style={{ fontSize: 38, color: "var(--color-border-hover)" }}>shopping_bag</span>
                <div style={{ fontSize: 14.5, marginTop: 10 }}>Aucun article dans le ticket.</div>
              </div>
            )}

            {lines.map((l, idx) => (
              <div
                key={l.itemId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px minmax(180px,1fr) 132px 140px 128px 44px",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 22px",
                  borderBottom: "1px solid var(--color-divider)",
                }}
              >
                <span className="mono" style={{ fontSize: 13, color: "var(--color-text-ghost)" }}>{idx + 1}</span>
                <div style={{ fontSize: 14.5, fontWeight: 500 }}>{l.name}</div>
                <input
                  className="mono"
                  value={l.price}
                  onChange={(e) => updateLine(l.itemId, { price: Number(e.target.value) || 0 })}
                  style={{ height: 42, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", fontSize: 14, textAlign: "right" }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--color-border)", borderRadius: 10, height: 42 }}>
                  <button onClick={() => updateLine(l.itemId, { quantity: Math.max(1, l.quantity - 1) })} style={{ width: 44, height: "100%", border: "none", background: "transparent", cursor: "pointer" }}>
                    <span className="icon" style={{ fontSize: 19 }}>remove</span>
                  </button>
                  <span className="mono" style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600 }}>{l.quantity}</span>
                  <button onClick={() => updateLine(l.itemId, { quantity: l.quantity + 1 })} style={{ width: 44, height: "100%", border: "none", background: "transparent", cursor: "pointer" }}>
                    <span className="icon" style={{ fontSize: 19 }}>add</span>
                  </button>
                </div>
                <span className="mono" style={{ fontSize: 14.5, fontWeight: 600, textAlign: "right" }}>{formatFcfa(l.price * l.quantity)}</span>
                <button onClick={() => removeLine(l.itemId)} style={{ width: 38, height: 38, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 10, color: "var(--color-text-ghost)", cursor: "pointer", justifySelf: "end" }}>
                  <span className="icon" style={{ fontSize: 18 }}>delete</span>
                </button>
              </div>
            ))}

            <div style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-faint)" }}>
              <span>{lines.length} article(s)</span>
              <span className="mono">Sous-total {formatFcfa(subtotal)}</span>
            </div>
          </div>
        </section>

        {/* ======= DÉTAILS ======= */}
        <aside style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, alignSelf: "start" }}>
          <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--color-border)", fontSize: 15.5, fontWeight: 600 }}>Détails</div>

          <div style={{ padding: "18px 22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Client (optionnel)</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={{ height: 46, border: "1px solid var(--color-border)", borderRadius: 11, background: "var(--color-surface-alt)", padding: "0 12px", fontSize: 14.5 }}
              >
                <option value="">Client comptoir</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--color-surface-alt)", border: "1px solid var(--color-divider)", borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>Sous-total</span>
                <span className="mono" style={{ fontSize: 14.5 }}>{formatFcfa(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>TVA %</span>
                <input
                  className="mono"
                  value={tvaPct}
                  onChange={(e) => setTvaPct(e.target.value)}
                  style={{ width: 68, height: 32, border: "1px solid var(--color-border)", borderRadius: 8, padding: "0 8px", fontSize: 13.5, textAlign: "right" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>Montant TVA</span>
                <span className="mono" style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{formatFcfa(tvaAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>Autres taxes</span>
                <input
                  className="mono"
                  value={otherTaxes}
                  onChange={(e) => setOtherTaxes(e.target.value)}
                  style={{ width: 128, height: 32, border: "1px solid var(--color-border)", borderRadius: 8, padding: "0 10px", fontSize: 13.5, textAlign: "right" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Total</span>
              <span className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.035em" }}>{formatFcfa(total)}</span>
            </div>

            <div style={{ height: 1, background: "var(--color-divider)" }} />

            <div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 8 }}>Méthode de paiement</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "especes", icon: "payments", label: "Espèces" },
                  { key: "momo", icon: "smartphone", label: "Mobile Money" },
                  { key: "mixte", icon: "call_split", label: "Mixte" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    style={{
                      flex: 1,
                      height: 60,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      border: paymentMethod === m.key ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                      background: paymentMethod === m.key ? "var(--color-accent-soft)" : "var(--color-surface)",
                      borderRadius: 10,
                      color: paymentMethod === m.key ? "var(--color-accent)" : "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <span className="icon" style={{ fontSize: 19 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "mixte" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    className="mono"
                    placeholder="Espèces"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    style={{ flex: 1, height: 42, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", fontSize: 14 }}
                  />
                  <input
                    className="mono"
                    placeholder="Mobile Money"
                    value={momoAmount}
                    onChange={(e) => setMomoAmount(e.target.value)}
                    style={{ flex: 1, height: 42, border: "1px solid var(--color-border)", borderRadius: 10, padding: "0 12px", fontSize: 14 }}
                  />
                </div>
              )}

              {paymentMethod !== "mixte" && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  Montant reçu : <span className="mono">{formatFcfa(total)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setHasSav((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 11, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", padding: 0 }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: hasSav ? "none" : "1.5px solid var(--color-border-hover)",
                  background: hasSav ? "var(--color-accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {hasSav && <span className="icon" style={{ fontSize: 14, color: "#fff" }}>check</span>}
              </span>
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Service après-vente</span>
            </button>

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
              {submitting ? "Validation…" : "Valider la vente"}
            </button>
          </div>
        </aside>
      </div>
             {quickCreateOpen && (
        <Modal title="Nouvel article" onClose={() => setQuickCreateOpen(false)} width={400}>
          <form onSubmit={handleQuickCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Nom</span>
              <input
                style={inputStyle}
                value={quickCreateForm.name}
                onChange={(e) => setQuickCreateForm({ ...quickCreateForm, name: e.target.value })}
                required
                autoFocus
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span>Prix de vente</span>
                <input
                  type="number"
                  style={inputStyle}
                  value={quickCreateForm.price}
                  onChange={(e) => setQuickCreateForm({ ...quickCreateForm, price: e.target.value })}
                  required
                />
              </label>
              <label style={labelStyle}>
                <span>Quantité</span>
                <input
                  type="number"
                  min="0"
                  style={inputStyle}
                  value={quickCreateForm.quantity}
                  onChange={(e) => setQuickCreateForm({ ...quickCreateForm, quantity: e.target.value })}
                  required
                />
              </label>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--color-text-faint)", margin: 0 }}>
              L'article sera classé dans la catégorie « Divers ». Vous pourrez le reclasser plus tard depuis Produits.
            </p>

            {quickCreateError && (
              <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>
                {quickCreateError}
              </div>
            )}

            <button type="submit" disabled={quickCreateSaving} style={primaryButtonStyle}>
              {quickCreateSaving ? "Création…" : "Créer et ajouter au ticket"}
            </button>
          </form>
        </Modal>
      )}
      {receipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16,22,19,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div style={{ width: 400, maxWidth: "92vw", background: "var(--color-surface)", borderRadius: 20, padding: "34px 30px 26px", textAlign: "center", boxShadow: "var(--shadow-modal)" }}>
            <div style={{ width: 58, height: 58, margin: "0 auto", borderRadius: "50%", background: "var(--color-accent-soft)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="icon" style={{ fontSize: 30 }}>check</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 600, marginTop: 18 }}>Vente enregistrée</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6 }}>
              {formatFcfa(receipt.grand_total)}
            </div>
            {change > 0 && (
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 14 }}>
                Monnaie à rendre : {formatFcfa(change)}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={resetSale}
                style={{ flex: 1, height: 48, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 12, fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
