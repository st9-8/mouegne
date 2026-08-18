import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/Modal";
import { apiClient, extractErrorMessage, asList } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

export default function ShopsPage() {
  const { me } = useAuth();
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Seules les boutiques où l'utilisateur porte le rôle OWNER lui appartiennent
  // vraiment (rôle posé automatiquement à la création par tenants.services.create_shop) —
  // une boutique où il n'est qu'Employee ne doit pas apparaître ici.
  const ownedShopIds = new Set((me?.shops || []).filter((s) => s.role === "OWNER").map((s) => s.shop_id));

  function load() {
    setLoading(true);
    apiClient
      .get("/shops/")
      .then(({ data }) => setShops(asList(data).filter((s) => ownedShopIds.has(s.id))))
      .finally(() => setLoading(false));
  }

  useEffect(load, [me]);

  function openEdit(shop) {
    setEditing(shop);
    setForm({
      name: shop.name,
      address: shop.address || "",
      email: shop.email || "",
      phone_number: shop.phone_number || "",
      currency: shop.currency,
    });
    setError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/shops/${editing.id}/`, form);
      setEditing(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(shop) {
    await apiClient.patch(`/shops/${shop.id}/`, { is_active: !shop.is_active });
    load();
  }

  function initials(name) {
    return (name || "?").slice(0, 2).toUpperCase();
  }

  return (
    <div>
      <PageHeader
        title="Mes boutiques"
        subtitle={`${shops.length} boutique(s) enregistrée(s)`}
        actions={
          <button onClick={() => navigate("/pos/boutiques/nouvelle")} style={{ ...primaryButtonStyle, height: 42, padding: "0 16px" }}>
            <span className="icon" style={{ fontSize: 20 }}>add_business</span>Nouvelle boutique
          </button>
        }
      />

      <div style={{ padding: "22px 32px 40px" }}>
        {loading && <div style={{ color: "var(--color-text-faint)" }}>Chargement…</div>}
        {!loading && shops.length === 0 && (
          <div style={{ color: "var(--color-text-faint)" }}>Aucune boutique. Créez-en une pour commencer.</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {shops.map((s) => (
            <div key={s.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--color-accent-soft)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                  {initials(s.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: s.is_active ? "var(--color-accent)" : "var(--color-text-faint)", marginTop: 2 }}>
                    {s.is_active ? "Active" : "Désactivée"}
                  </div>
                </div>
              </div>

              {s.address && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: "var(--color-text-muted)" }}>
                  <span className="icon" style={{ fontSize: 18, color: "var(--color-text-ghost)" }}>location_on</span>{s.address}
                </div>
              )}
              {s.phone_number && (
                <div className="mono" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "var(--color-text-muted)" }}>
                  <span className="icon" style={{ fontSize: 18, color: "var(--color-text-ghost)" }}>call</span>{s.phone_number}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--color-divider)" }}>
                <button onClick={() => openEdit(s)} style={{ flex: 1, height: 36, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, fontSize: 13, cursor: "pointer" }}>
                  Modifier
                </button>
                <button onClick={() => toggleActive(s)} style={{ flex: 1, height: 36, border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 9, fontSize: 13, cursor: "pointer" }}>
                  {s.is_active ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <Modal title={`Modifier ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              <span>Nom de la boutique</span>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label style={labelStyle}>
              <span>Adresse</span>
              <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span>Email</span>
                <input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label style={labelStyle}>
                <span>Téléphone</span>
                <input style={inputStyle} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              </label>
            </div>
            <label style={labelStyle}>
              <span>Devise</span>
              <input style={inputStyle} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </label>

            {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}