import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LandingPage from "../pages/public/LandingPage";

/**
 * Route « / » : visiteur anonyme → page d'accueil ; utilisateur connecté → directement la caisse.
 */
export default function RootRoute() {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--color-text-faint)" }}>
        Chargement…
      </div>
    );
  }
  if (status === "authenticated") return <Navigate to="/pos/vente" replace />;
  return <LandingPage />;
}