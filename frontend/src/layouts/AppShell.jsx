import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";

const NAV_ITEMS = [
  { to: "/pos/vente", icon: "point_of_sale", label: "Vente", roles: null, merchantOnly: false },
  { to: "/pos/dashboard", icon: "space_dashboard", label: "Tableau de bord", roles: null, merchantOnly: false },
  { to: "/pos/produits", icon: "inventory_2", label: "Produits", roles: null, merchantOnly: false },
  { to: "/pos/categories", icon: "sell", label: "Catégories", roles: null, merchantOnly: false },
  { to: "/pos/ventes", icon: "receipt_long", label: "Historique", roles: null, merchantOnly: false },
  { to: "/pos/clients", icon: "groups", label: "Clients", roles: null, merchantOnly: false },
  { to: "/pos/achats", icon: "local_shipping", label: "Achats & fournisseurs", roles: null, merchantOnly: false },
  { to: "/pos/employes", icon: "badge", label: "Employés", roles: ["OWNER", "MANAGER"], merchantOnly: false },
  { to: "/pos/boutiques", icon: "storefront", label: "Mes boutiques", roles: null, merchantOnly: true },
  { to: "/pos/parametres", icon: "settings", label: "Paramètres", roles: ["OWNER", "MANAGER"], merchantOnly: false },
];

function initials(name) {
  return (name || "?").slice(0, 2).toUpperCase();
}

export default function AppShell() {
  const { me, logout } = useAuth();
  const { shops, activeShop, setActiveShopId, role } = useShop();
  const navigate = useNavigate();
  const [shopMenuOpen, setShopMenuOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.merchantOnly && !me?.is_merchant) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ============== SIDEBAR ============== */}
      <aside
        style={{
          width: 232,
          flex: "0 0 232px",
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 14px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 22px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--color-accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>Mouegne</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-faint)", marginTop: 1 }}>par AEME Consulting</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 11,
                height: 40,
                padding: "0 12px",
                borderRadius: 10,
                fontSize: 14,
                textDecoration: "none",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                background: isActive ? "var(--color-accent-soft)" : "transparent",
                fontWeight: isActive ? 600 : 500,
              })}
            >
              <span className="icon" style={{ fontSize: 19 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-accent-soft)",
              color: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {initials(me?.username)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {me?.username}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-faint)" }}>
              {me?.is_merchant ? "Propriétaire" : "Employé"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            style={{
              width: 30,
              height: 30,
              color: "var(--color-text-faint)",
              border: "none",
              background: "transparent",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="icon" style={{ fontSize: 19 }}>
              logout
            </span>
          </button>
        </div>
      </aside>

      {/* ============== MAIN ============== */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            flex: "0 0 auto",
            height: 56,
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "0 20px 0 28px",
            position: "relative",
            zIndex: 30,
          }}
        >
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-faint)" }}>
            <span className="icon" style={{ fontSize: 18 }}>
              storefront
            </span>
            {activeShop ? `Session · ${activeShop.role}` : "Aucune boutique"}
          </div>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShopMenuOpen((v) => !v)}
              style={{
                height: 38,
                padding: "0 10px 0 8px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {initials(activeShop?.shop_name)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{activeShop?.shop_name || "Sélectionner"}</span>
              <span className="icon" style={{ fontSize: 19, color: "var(--color-text-faint)" }}>
                expand_more
              </span>
            </button>

            {shopMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 46,
                  right: 0,
                  width: 306,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 13,
                  boxShadow: "var(--shadow-dropdown)",
                  overflow: "hidden",
                  zIndex: 40,
                }}
              >
                <div
                  style={{
                    padding: "12px 16px 10px",
                    fontSize: 11.5,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--color-text-faint)",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--color-divider)",
                  }}
                >
                  Mes boutiques
                </div>
                {shops.map((s) => (
                  <button
                    key={s.shop_id}
                    onClick={() => {
                      setActiveShopId(s.shop_id);
                      setShopMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      background: "var(--color-surface)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "var(--color-accent-soft)",
                        color: "var(--color-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {initials(s.shop_name)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 500 }}>{s.shop_name}</span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--color-text-faint)", marginTop: 2 }}>
                        {s.role}
                      </span>
                    </span>
                    {s.shop_id === activeShop?.shop_id && (
                      <span className="icon" style={{ fontSize: 18, color: "var(--color-accent)" }}>
                        check
                      </span>
                    )}
                  </button>
                ))}
                {me?.is_merchant && (
                  <button
                    onClick={() => {
                      setShopMenuOpen(false);
                      navigate("/pos/boutiques/nouvelle");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "13px 16px",
                      border: "none",
                      background: "var(--color-surface)",
                      cursor: "pointer",
                      fontSize: 13.5,
                      color: "var(--color-text-secondary)",
                      textAlign: "left",
                      borderTop: "1px solid var(--color-divider)",
                    }}
                  >
                    <span className="icon" style={{ fontSize: 19, color: "var(--color-text-faint)" }}>
                      add_business
                    </span>
                    Ajouter une boutique
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}