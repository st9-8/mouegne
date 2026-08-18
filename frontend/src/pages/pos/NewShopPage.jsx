import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

export default function NewShopPage() {
  const { refreshMe } = useAuth();
  const { setActiveShopId } = useShop();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", address: "", email: "", phone_number: "", currency: "XAF" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/shops/", form);
      await refreshMe();
      setActiveShopId(data.id);
      navigate("/pos/vente", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Nouvelle boutique" subtitle="Ajoutez un point de vente à votre commerce" />

      <div style={{ padding: "26px 32px 40px", maxWidth: 560 }}>
        <form onSubmit={handleSubmit} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={labelStyle}>
            <span>Nom de la boutique</span>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label style={labelStyle}>
            <span>Adresse</span>
            <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label style={labelStyle}>
            <span>Téléphone</span>
            <input style={inputStyle} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </label>

          {error && <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

          <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Création…" : "Créer la boutique"}</button>
        </form>
      </div>
    </div>
  );
}
