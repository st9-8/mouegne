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

  const { data } = await axios.post("/api/auth/token/refresh/", { refresh });
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