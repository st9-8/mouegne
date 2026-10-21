import axios from "axios";

const ACCESS_KEY = "mouegne_access";
const REFRESH_KEY = "mouegne_refresh";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// File d'attente pour éviter plusieurs refresh simultanés si plusieurs
// requêtes échouent en même temps avec un token expiré.
let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error("Aucun refresh token disponible.");

  // Même base que apiClient. Une URL relative « /api/... » ignorerait VITE_API_BASE_URL : avec une API sur un autre
  // domaine, le renouvellement viserait le frontend, échouerait, et l'utilisateur serait déconnecté à l'expiration du token.
  const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, "");
  const { data } = await axios.post(`${base}/auth/token/refresh/`, { refresh });
  tokenStore.set(data.access, data.refresh);
  return data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/token/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccess = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Construit les endpoints nestés sous /shops/{shopId}/..., conformément
 * au routing manuel posé côté API (pas de router imbriqué tiers).
 */
export function shopScoped(shopId) {
  const base = `/shops/${shopId}`;
  return {
    categories: `${base}/categories/`,
    items: `${base}/items/`,
    vendors: `${base}/vendors/`,
    purchases: `${base}/purchases/`,
    customers: `${base}/customers/`,
    sales: `${base}/sales/`,
    employees: `${base}/employees/`,
  };
}

/**
 * Normalise une réponse liste : accepte aussi bien une réponse paginée
 * ({ results: [...] }) qu'une liste brute ([...]), pour rester robuste
 * si la pagination n'est pas active sur un endpoint donné.
 */
export function asList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

/** Extrait un message d'erreur lisible depuis une réponse DRF standard. */
export function extractErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Une erreur réseau est survenue. Réessayez.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(" ");
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    return Array.isArray(value) ? value[0] : String(value);
  }
  return "Une erreur est survenue.";
}

/**
 * Reçu PDF d'une vente : impression automatique (iframe invisible) ou ouverture dans un nouvel onglet.
 */
export async function printSaleReceipt(shopId, saleId) {
  const response = await apiClient.get(`/shops/${shopId}/sales/${saleId}/receipt/`, {
    responseType: "blob",
  });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // Certains navigateurs bloquent l'impression déclenchée automatiquement —
      // le bouton "Reçu PDF" de la modale reste le filet de sécurité.
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  };
}

export async function openSaleReceipt(shopId, saleId) {
  const response = await apiClient.get(`/shops/${shopId}/sales/${saleId}/receipt/`, {
    responseType: "blob",
  });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  window.open(blobUrl, "_blank");
}

/**
 * Photos d'un article. Chaque appel renvoie la liste COMPLÈTE et à jour des photos
 * de l'article : [{ id, position, url, thumbnail_url }], triées par position
 * (la position 1 est la photo d'aperçu).
 */
export async function uploadItemImage(shopId, itemId, file) {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post(`/shops/${shopId}/items/${itemId}/images/`, formData);
  return data;
}

export async function reorderItemImages(shopId, itemId, orderedImageIds) {
  const { data } = await apiClient.put(`/shops/${shopId}/items/${itemId}/images/order/`, { order: orderedImageIds });
  return data;
}

export async function deleteItemImage(shopId, itemId, imageId) {
  const { data } = await apiClient.delete(`/shops/${shopId}/items/${itemId}/images/${imageId}/`);
  return data;
}

/**
 * Historique du stock d'un article (tous les mouvements : ventes, réceptions, annulations, ajustements).
 * Renvoie { results, next, ... } trié du plus récent au plus ancien.
 */
export async function fetchStockMovements(shopId, itemId, page = 1, pageSize = 20) {
  const { data } = await apiClient.get(`/shops/${shopId}/items/${itemId}/stock-movements/`, {
    params: { page, page_size: pageSize },
  });
  return Array.isArray(data) ? { results: data, next: null } : data;
}

/** Ajoute ou retire une quantité. direction : "add" | "remove". Renvoie le mouvement créé. */
export async function adjustItemStock(shopId, itemId, { direction, quantity, note }) {
  const { data } = await apiClient.post(`/shops/${shopId}/items/${itemId}/stock-adjustments/`, { direction, quantity, note });
  return data;
}