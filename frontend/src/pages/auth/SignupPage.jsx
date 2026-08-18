import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../lib/apiClient";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

const FIELDS = [
  { name: "companyName", label: "Nom de l'entreprise", type: "text", placeholder: "AEME Boutiques" },
  { name: "shopName", label: "Nom de la première boutique", type: "text", placeholder: "Boutique Bastos" },
  { name: "phoneNumber", label: "Téléphone", type: "tel", placeholder: "+237 6XX XX XX XX" },
  { name: "username", label: "Nom d'utilisateur", type: "text", placeholder: "jdupont" },
  { name: "password", label: "Mot de passe", type: "password", placeholder: "••••••••" },
];

export default function SignupPage() {
  const { registerMerchant } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    shopName: "",
    phoneNumber: "",
    username: "",
    password: "",
  });
  const [cgu, setCgu] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!cgu) {
      setError("Merci d'accepter les conditions d'utilisation pour continuer.");
      return;
    }

    setLoading(true);
    try {
      await registerMerchant(form);
      navigate("/pos/vente", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout quote="Un compte, votre première boutique, opérationnelle dans l'heure.">
      <h1 style={{ margin: 0, fontSize: 27, fontWeight: 600, letterSpacing: "-0.028em" }}>Créer votre compte</h1>
      <p style={{ margin: "9px 0 0", fontSize: 14.5, color: "var(--color-text-muted)" }}>
        30 jours d'essai, sans carte bancaire.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          {FIELDS.map((field) => (
            <label key={field.name} style={labelStyle}>
              <span>{field.label}</span>
              <input
                type={field.type}
                style={inputStyle}
                placeholder={field.placeholder}
                value={form[field.name]}
                onChange={(e) => update(field.name, e.target.value)}
                required={field.name !== "phoneNumber"}
              />
            </label>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={cgu}
            onChange={(e) => setCgu(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 13.5, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            J'accepte les conditions d'utilisation de Mouegne et la politique de confidentialité d'AEME
            Consulting SARL.
          </span>
        </label>

        {error && (
          <div
            style={{
              marginTop: 16,
              fontSize: 13.5,
              color: "var(--color-danger)",
              background: "var(--color-danger-soft)",
              padding: "10px 12px",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, width: "100%", marginTop: 20 }}>
          {loading ? "Création du compte…" : "Créer mon compte"}
        </button>

        <div style={{ textAlign: "center", fontSize: 14, color: "var(--color-text-muted)", marginTop: 16 }}>
          Déjà client ?{" "}
          <Link to="/login" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
            Se connecter
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
