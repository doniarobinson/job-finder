"use client";

import { useRouter } from "next/navigation";

import {
  dashboardSearchHref,
  type DashboardSearchParams,
} from "@/lib/dashboardSearchParams";
import {
  JOB_MATCHES_PAGE_SIZE_OPTIONS,
  type JobMatchesPageSize,
} from "@/lib/jobMatchesPagination";

export function JobMatchesPageSizeSelect({
  searchParams,
  pageSize,
}: {
  searchParams: DashboardSearchParams;
  pageSize: JobMatchesPageSize;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500">
      Jobs per page
      <select
        value={pageSize}
        aria-label="Job matches page size"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800"
        onChange={(event) => {
          const value = event.target.value;
          const nextSize: JobMatchesPageSize =
            value === "all" ? "all" : (Number(value) as JobMatchesPageSize);
          router.push(
            dashboardSearchHref(searchParams, { jobsPage: 1, jobsPageSize: nextSize })
          );
        }}
      >
        {JOB_MATCHES_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size === "all" ? "All" : size}
          </option>
        ))}
      </select>
    </label>
  );
}
