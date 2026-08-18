import { Navigate, Outlet } from "react-router-dom";
import { useShop } from "../context/ShopContext";

/**
 * Restreint l'accès à une page selon le rôle de l'utilisateur sur la
 * boutique active. Usage : <RequireRole roles={["OWNER", "MANAGER"]} />
 */
export default function RequireRole({ roles }) {
  const { role } = useShop();

  if (role && !roles.includes(role)) {
    return <Navigate to="/pos/vente" replace />;
  }

  return <Outlet />;
}
