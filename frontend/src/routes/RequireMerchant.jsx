import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Restreint l'accès aux pages qui ne concernent que les comptes Merchant (pas les Employee). */
export default function RequireMerchant() {
  const { me } = useAuth();

  if (me && !me.is_merchant) {
    return <Navigate to="/pos/vente" replace />;
  }

  return <Outlet />;
}