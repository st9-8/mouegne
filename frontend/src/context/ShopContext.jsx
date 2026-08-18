import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";

const ShopContext = createContext(null);
const ACTIVE_SHOP_KEY = "mouegne_active_shop";

export function ShopProvider({ children }) {
  const { me } = useAuth();
  const shops = me?.shops ?? [];
  const [activeShopId, setActiveShopId] = useState(() => localStorage.getItem(ACTIVE_SHOP_KEY));

  // Si la boutique mémorisée n'est plus accessible (changement de compte,
  // employé désactivé...), on retombe sur la première boutique disponible.
  useEffect(() => {
    if (shops.length === 0) return;
    const stillValid = shops.some((s) => s.shop_id === activeShopId);
    if (!stillValid) {
      setActiveShopId(shops[0].shop_id);
    }
  }, [shops, activeShopId]);

  useEffect(() => {
    if (activeShopId) localStorage.setItem(ACTIVE_SHOP_KEY, activeShopId);
  }, [activeShopId]);

  const activeShop = useMemo(
    () => shops.find((s) => s.shop_id === activeShopId) ?? null,
    [shops, activeShopId]
  );

  const value = {
    shops,
    activeShop, // { shop_id, shop_name, role }
    activeShopId,
    setActiveShopId,
    role: activeShop?.role ?? null,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop doit être utilisé dans un <ShopProvider>.");
  return ctx;
}
