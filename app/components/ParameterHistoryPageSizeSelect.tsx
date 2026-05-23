"use client";

import { useRouter } from "next/navigation";

import {
  dashboardSearchHref,
  type DashboardSearchParams,
} from "@/lib/dashboardSearchParams";
import {
  PARAMETER_HISTORY_PAGE_SIZE_OPTIONS,
  type ParameterHistoryPageSize,
} from "@/lib/parameterHistoryPagination";

export function ParameterHistoryPageSizeSelect({
  searchParams,
  pageSize,
}: {
  searchParams: DashboardSearchParams;
  pageSize: ParameterHistoryPageSize;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500">
      Versions per page
      <select
        value={pageSize}
        aria-label="Parameter history page size"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800"
        onChange={(event) => {
          const nextSize = Number(event.target.value) as ParameterHistoryPageSize;
          router.push(
            dashboardSearchHref(searchParams, { historyPage: 1, historyPageSize: nextSize })
          );
        }}
      >
        {PARAMETER_HISTORY_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
