import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ShopProvider } from "./context/ShopContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import RequireRole from "./routes/RequireRole";
import RequireMerchant from "./routes/RequireMerchant";
import AppShell from "./layouts/AppShell";

import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import SalePage from "./pages/pos/SalePage";
import DashboardPage from "./pages/pos/DashboardPage";
import ProductsPage from "./pages/pos/ProductsPage";
import CategoriesPage from "./pages/pos/CategoriesPage";
import SalesHistoryPage from "./pages/pos/SalesHistoryPage";
import CustomersPage from "./pages/pos/CustomersPage";
import PurchasesPage from "./pages/pos/PurchasesPage";
import EmployeesPage from "./pages/pos/EmployeesPage";
import ShopsPage from "./pages/pos/ShopsPage";
import SettingsPage from "./pages/pos/SettingsPage";
import NewShopPage from "./pages/pos/NewShopPage";

function GlobalLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--color-text-faint)" }}>
      Chargement…
    </div>
  );
}

function RootRedirect() {
  const { status } = useAuth();
  if (status === "loading") return <GlobalLoader />;
  return <Navigate to={status === "authenticated" ? "/pos/vente" : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ShopProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/pos" element={<AppShell />}>
                <Route index element={<Navigate to="vente" replace />} />
                <Route path="vente" element={<SalePage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="produits" element={<ProductsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="ventes" element={<SalesHistoryPage />} />
                <Route path="clients" element={<CustomersPage />} />
                <Route path="achats" element={<PurchasesPage />} />
                <Route path="boutiques/nouvelle" element={<NewShopPage />} />

                <Route element={<RequireMerchant />}>
                  <Route path="boutiques" element={<ShopsPage />} />
                </Route>

                <Route element={<RequireRole roles={["OWNER", "MANAGER"]} />}>
                  <Route path="employes" element={<EmployeesPage />} />
                  <Route path="parametres" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ShopProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}