import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { apiClient, extractErrorMessage } from "../../lib/apiClient";
import { useShop } from "../../context/ShopContext";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

export default function SettingsPage() {
  const { activeShopId, activeShop } = useShop();
  const [shop, setShop] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!activeShopId) return;
    apiClient.get(`/shops/${activeShopId}/`).then(({ data }) => setShop(data));
    apiClient.get(`/shops/${activeShopId}/settings/`).then(({ data }) => setSettings(data));
  }, [activeShopId]);

  async function handleToggleZeroStock() {
    const previous = settings.allow_zero_stock_sale;
    setSettings({ ...settings, allow_zero_stock_sale: !previous }); // optimiste
    setSettingsSaving(true);
    try {
      const { data } = await apiClient.patch(`/shops/${activeShopId}/settings/`, {
        allow_zero_stock_sale: !previous,
      });
      setSettings(data);
    } catch (err) {
      setSettings({ ...settings, allow_zero_stock_sale: previous }); // rollback
      setMessage({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleLogoUpload(file) {
    if (!file) return;
    setLogoUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const { data } = await apiClient.patch(`/shops/${activeShopId}/settings/`, formData);
      setSettings(data);
    } catch (err) {
      setMessage({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoRemove() {
    setLogoUploading(true);
    setMessage(null);
    try {
      const { data } = await apiClient.patch(`/shops/${activeShopId}/settings/`, { logo: null });
      setSettings(data);
    } catch (err) {
      setMessage({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSaveShop(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch(`/shops/${activeShopId}/`, {
        name: shop.name,
        address: shop.address,
        email: shop.email,
        phone_number: shop.phone_number,
        currency: shop.currency,
      });
      setMessage({ type: "success", text: "Boutique mise à jour." });
    } catch (err) {
      setMessage({ type: "error", text: extractErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  if (!shop) return null;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle={`Boutique ${activeShop?.shop_name} · règles de vente`} />

      <div style={{ padding: "26px 32px 40px", maxWidth: 780 }}>
        <form onSubmit={handleSaveShop} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "26px 28px" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Boutique</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <label style={labelStyle}>
              <span>Nom de la boutique</span>
              <input style={inputStyle} value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
            </label>
            <label style={labelStyle}>
              <span>Adresse</span>
              <input style={inputStyle} value={shop.address || ""} onChange={(e) => setShop({ ...shop, address: e.target.value })} />
            </label>
            <label style={labelStyle}>
              <span>Adresse email</span>
              <input style={inputStyle} value={shop.email || ""} onChange={(e) => setShop({ ...shop, email: e.target.value })} />
            </label>
            <label style={labelStyle}>
              <span>Téléphone</span>
              <input style={inputStyle} value={shop.phone_number || ""} onChange={(e) => setShop({ ...shop, phone_number: e.target.value })} />
            </label>
            <label style={labelStyle}>
              <span>Devise</span>
              <input style={inputStyle} value={shop.currency} onChange={(e) => setShop({ ...shop, currency: e.target.value })} />
            </label>
          </div>

          {message && (
            <div style={{ marginTop: 16, fontSize: 13.5, color: message.type === "error" ? "var(--color-danger)" : "var(--color-accent)", background: message.type === "error" ? "var(--color-danger-soft)" : "var(--color-accent-soft)", padding: "10px 12px", borderRadius: 10 }}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, width: "auto", padding: "0 24px", marginTop: 20 }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "26px 28px", marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Logo</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 18 }}>
            Affiché en en-tête du reçu PDF de vos ventes.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo de la boutique" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span className="icon" style={{ fontSize: 32, color: "var(--color-text-ghost)" }}>storefront</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  height: 38,
                  padding: "0 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  borderRadius: 9,
                  fontSize: 13.5,
                  cursor: logoUploading ? "wait" : "pointer",
                  opacity: logoUploading ? 0.6 : 1,
                  width: "fit-content",
                }}
              >
                <span className="icon" style={{ fontSize: 18 }}>upload</span>
                {logoUploading ? "Envoi…" : settings?.logo ? "Changer le logo" : "Ajouter un logo"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={logoUploading}
                  onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
              </label>

              {settings?.logo && (
                <button
                  onClick={handleLogoRemove}
                  disabled={logoUploading}
                  style={{ border: "none", background: "transparent", color: "var(--color-danger)", fontSize: 12.5, cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "26px 28px", marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Règles de vente</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 0" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>Autoriser la vente en stock nul</div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                Les ventes peuvent inclure des articles épuisés, ce qui peut générer un stock négatif.
              </div>
            </div>
            <button
              onClick={handleToggleZeroStock}
              disabled={settingsSaving || !settings}
              style={{
                width: 44,
                height: 26,
                borderRadius: 20,
                border: "none",
                background: settings?.allow_zero_stock_sale ? "var(--color-accent)" : "var(--color-border)",
                position: "relative",
                cursor: settingsSaving ? "wait" : "pointer",
                opacity: settingsSaving ? 0.7 : 1,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: settings?.allow_zero_stock_sale ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.15s ease",
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--color-text-ghost)" }}>
          Mouegne — solution de vente comptoir éditée par AEME Consulting SARL.
        </div>
      </div>
    </div>
  );
}