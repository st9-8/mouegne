# Mouegne — Frontend (React + Vite)

Interface de vente au comptoir pour Mouegne (AEME Consulting), câblée sur l'API DRF multi-tenant.

## Installation

```bash
npm install
npm run dev
```

Le serveur de dev tourne sur `http://localhost:5173` et proxy tout `/api/...` vers
`http://localhost:8000` (Django). Adapter `vite.config.js` si l'API tourne ailleurs.

## Structure

```
src/
  context/       AuthContext (JWT + /me/), ShopContext (boutique active)
  lib/            apiClient (axios + refresh JWT auto), useShopResource (pagination)
  routes/         ProtectedRoute, RequireRole (garde par rôle)
  layouts/        AppShell (sidebar + topbar)
  pages/auth/     Login, Signup
  pages/pos/      Vente, Dashboard, Produits, Historique, Clients, Achats, Employés, Paramètres
  styles/         theme.css (tokens), formStyles.js
```

## Décisions prises côté frontend

- **Pas de sélecteur "nombre de boutiques" à l'inscription** — retiré du mockup original,
  conformément à `POST /register-merchant/` qui ne crée qu'une seule boutique. L'ajout de
  boutiques supplémentaires se fait ensuite via l'écran "Nouvelle boutique" (`POST /shops/`,
  réservé aux comptes Merchant).
- **Écrans ajoutés, absents du mockup** : Achats & fournisseurs (`Vendor`/`Purchase`),
  Employés (`Employee`/rôles) — le backend les expose déjà, le mockup ne les montrait pas.
- **Rôles** : `employes` et `parametres` sont réservés à `OWNER`/`MANAGER` via `RequireRole`.
  Un `CASHIER` n'y a pas accès (redirection vers l'écran de vente).
- **Historique des ventes** : par défaut, n'affiche que les ventes du jour (reflète le
  comportement de `SaleViewSet.get_queryset`). Un filtre par plage de dates permet de sortir
  de cette restriction.

## Écart connu à combler côté backend

Le toggle "Autoriser la vente en stock nul" (écran Paramètres) n'est **pas encore câblé** :
`ShopSettings.allow_zero_stock_sale` n'a pas d'endpoint DRF dédié. Il faut ajouter un
`GET/PATCH /api/shops/{shop_pk}/settings/` (ou l'exposer en sous-ressource de `ShopViewSet`)
avant que ce contrôle ait un effet réel. Actuellement l'état du toggle est local à l'écran
uniquement, il n'est ni chargé ni persisté.

De même, l'écran Employés attend un `user` (ID entier) déjà existant pour ajouter un employé —
il n'y a pas encore de flux d'invitation (créer un compte + l'associer en une étape).
