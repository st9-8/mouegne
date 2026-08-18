import { useCallback, useEffect, useState } from "react";
import { apiClient } from "./apiClient";
import { useShop } from "../context/ShopContext";

export function useShopResource(path, params = {}) {
  const { activeShopId } = useShop();
  const [data, setData] = useState({ results: [], count: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);

  const reload = useCallback(async () => {
    if (!activeShopId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: responseData } = await apiClient.get(`/shops/${activeShopId}/${path}`, {
        params: { page, ...JSON.parse(paramsKey) },
      });
      if (Array.isArray(responseData)) {
        setData({ results: responseData, count: responseData.length, total_pages: 1 });
      } else {
        setData({
          results: responseData?.results || [],
          count: responseData?.count ?? 0,
          total_pages: responseData?.total_pages ?? 1,
        });
      }
    } catch (err) {
      setError(err);
      setData({ results: [], count: 0, total_pages: 1 });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, path, page, paramsKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items: data.results,
    count: data.count,
    totalPages: data.total_pages,
    page,
    setPage,
    loading,
    error,
    reload,
  };
}