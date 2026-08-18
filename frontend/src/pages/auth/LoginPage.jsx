import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../lib/apiClient";
import { inputStyle, labelStyle, primaryButtonStyle } from "../../styles/formStyles";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      const redirectTo = location.state?.from?.pathname || "/pos/vente";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err) || "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout quote="La caisse qui tient le rythme de votre comptoir.">
      <h1 style={{ margin: 0, fontSize: 27, fontWeight: 600, letterSpacing: "-0.028em" }}>Connexion</h1>
      <p style={{ margin: "9px 0 0", fontSize: 14.5, color: "var(--color-text-muted)" }}>
        Accédez à la caisse de votre boutique.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 30 }}>
        <label style={labelStyle}>
          <span>Nom d'utilisateur</span>
          <input
            style={inputStyle}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="superuser"
            autoComplete="username"
            required
          />
        </label>

        <label style={labelStyle}>
          <span>Mot de passe</span>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div style={{ fontSize: 13.5, color: "var(--color-danger)", background: "var(--color-danger-soft)", padding: "10px 12px", borderRadius: 10 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={primaryButtonStyle}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>

        <div style={{ textAlign: "center", fontSize: 14, color: "var(--color-text-muted)", marginTop: 4 }}>
          Pas encore de compte ?{" "}
          <Link to="/signup" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
            Créer un compte
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
