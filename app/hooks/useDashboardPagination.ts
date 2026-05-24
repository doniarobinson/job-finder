"use client";

import { useCallback, useState } from "react";

import type { DashboardSearchParams } from "@/lib/dashboardSearchParams";
import {
  buildPaginatedApiUrl,
  replaceDashboardSearchParams,
} from "@/lib/dashboardPaginationUrl";

type PaginatedPayload = {
  page: number;
  pageSize: number | string;
};

export function useDashboardPagination<T extends PaginatedPayload>({
  endpoint,
  initialData,
  deserialize,
  buildUrlUpdates,
}: {
  endpoint: string;
  initialData: T;
  deserialize: (json: unknown) => T;
  buildUrlUpdates: (page: number, pageSize: T["pageSize"]) => Partial<DashboardSearchParams>;
}) {
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setData(initialData);
    setError(null);
  }

  const load = useCallback(
    async (page: number, pageSize: T["pageSize"]) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildPaginatedApiUrl(endpoint, page, pageSize));
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const json: unknown = await response.json();
        const next = deserialize(json);
        setData(next);
        replaceDashboardSearchParams(buildUrlUpdates(next.page, next.pageSize));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load page");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, deserialize, buildUrlUpdates]
  );

  const setPage = useCallback(
    (page: number) => {
      void load(page, data.pageSize);
    },
    [data.pageSize, load]
  );

  const setPageSize = useCallback(
    (pageSize: T["pageSize"]) => {
      void load(1, pageSize);
    },
    [load]
  );

  return {
    data,
    loading,
    error,
    setPage,
    setPageSize,
  };
}
