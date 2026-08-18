import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useShopResource } from "../../lib/useShopResource";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

const EMPTY_FORM = { first_name: "", last_name: "", phone: "", address: "" };

function initials(customer) {
  return `${customer.first_name?.[0] || ""}${customer.last_name?.[0] || ""}`.toUpperCase();
}

export default function CustomersPage() {
  const { activeShopId } = useShop();
  const { items, count, totalPages, page, setPage, loading, reload } = useShopResource("customers/");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/shops/${activeShopId}/customers/`, form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Fiches et points de fidélité"
        actions={
          <button onClick={() => setModalOpen(true)} style={{ ...primaryButtonStyle, height: 42, padding: "0 16px" }}>
            <span className="icon" style={{ fontSize: 20 }}>person_add</span>Nouveau client
          </button>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {loading && <div style={{ color: "var(--color-text-faint)" }}>Chargement…</div>}
          {!loading && items.length === 0 && <div style={{ color: "var(--color-text-faint)" }}>Aucun client enregistré.</div>}

          {items.map((c) => (
            <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--color-accent-soft)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>
                  {initials(c)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                  <div className="mono" style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2 }}>{c.phone}</div>
                </div>
              </div>
              {c.address && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, color: "var(--color-text-muted)" }}>
                  <span className="icon" style={{ fontSize: 18, color: "var(--color-text-ghost)" }}>location_on</span>{c.address}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--color-divider)" }}>
                <span style={{ fontSize: 12.5, color: "var(--color-text-faint)" }}>Fidélité</span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, background: "var(--color-accent-soft)", color: "var(--color-accent)", padding: "4px 10px", borderRadius: 20 }}>
                  {c.loyalty_points} pts
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} count={count} />
        </div>
      </div>

      {modalOpen && (
        <Modal title="Nouveau client" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span>Prénom</span>
                <input style={inputStyle} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </label>
              <label style={labelStyle}>
                <span>Nom</span>
                <input style={inputStyle} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </label>
            </div>
            <label style={labelStyle}>
              <span>Téléphone</span>
              <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237 6XX XX XX XX" />
            </label>
            <label style={labelStyle}>
              <span>Adresse</span>
              <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Enregistrement…" : "Créer le client"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
