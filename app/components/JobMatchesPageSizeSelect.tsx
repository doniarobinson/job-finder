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
    <label className="flex items-center gap-2 text-xs text-muted">
      Jobs per page
      <select
        value={pageSize}
        aria-label="Job matches page size"
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
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
