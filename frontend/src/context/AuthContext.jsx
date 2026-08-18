import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiClient, tokenStore } from "../lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // `me` = { id, username, is_merchant, shops: [{shop_id, shop_name, role}] }
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | anonymous

  const loadMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/me/");
      setMe(data);
      setStatus("authenticated");
      return data;
    } catch {
      tokenStore.clear();
      setMe(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  useEffect(() => {
    if (tokenStore.getAccess()) {
      loadMe();
    } else {
      setStatus("anonymous");
    }
  }, [loadMe]);

  const login = useCallback(
    async (username, password) => {
      const { data } = await apiClient.post("/auth/token/", { username, password });
      tokenStore.set(data.access, data.refresh);
      return loadMe();
    },
    [loadMe]
  );

  const registerMerchant = useCallback(
    async ({ username, password, companyName, phoneNumber, shopName }) => {
      const { data } = await apiClient.post("/register-merchant/", {
        username,
        password,
        company_name: companyName,
        phone_number: phoneNumber,
        shop_name: shopName,
      });
      tokenStore.set(data.access, data.refresh);
      await loadMe();
      return data; // contient shop_id, shop_name pour redirection immédiate
    },
    [loadMe]
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setMe(null);
    setStatus("anonymous");
  }, []);

  return (
    <AuthContext.Provider value={{ me, status, login, registerMerchant, logout, refreshMe: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>.");
  return ctx;
}
