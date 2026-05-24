import type { JobMatchesPage, ParameterHistoryPage } from "@/lib/dashboard";
import type { DashboardSearchParams } from "@/lib/dashboardSearchParams";
import type { JobMatchesPageSize } from "@/lib/jobMatchesPagination";
import type { ParameterHistoryPageSize } from "@/lib/parameterHistoryPagination";

export type SerializedJobMatchRow = Omit<JobMatchesPage["jobs"][number], "createdAt"> & {
  createdAt: string;
};

export type SerializedJobMatchesPage = Omit<JobMatchesPage, "jobs"> & {
  jobs: SerializedJobMatchRow[];
};

export type SerializedParameterHistoryEntry = Omit<
  ParameterHistoryPage["entries"][number],
  "createdAt" | "epochStartedAt"
> & {
  createdAt: string;
  epochStartedAt: string | null;
};

export type SerializedParameterHistoryPage = Omit<ParameterHistoryPage, "entries"> & {
  entries: SerializedParameterHistoryEntry[];
};

export function serializeJobMatchesPage(page: JobMatchesPage): SerializedJobMatchesPage {
  return {
    ...page,
    jobs: page.jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
    })),
  };
}

export function deserializeJobMatchesPage(page: SerializedJobMatchesPage): JobMatchesPage {
  return {
    ...page,
    jobs: page.jobs.map((job) => ({
      ...job,
      createdAt: new Date(job.createdAt),
    })),
  };
}

export function serializeParameterHistoryPage(
  page: ParameterHistoryPage
): SerializedParameterHistoryPage {
  return {
    ...page,
    entries: page.entries.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      epochStartedAt: entry.epochStartedAt?.toISOString() ?? null,
    })),
  };
}

export function deserializeParameterHistoryPage(
  page: SerializedParameterHistoryPage
): ParameterHistoryPage {
  return {
    ...page,
    entries: page.entries.map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      epochStartedAt: entry.epochStartedAt ? new Date(entry.epochStartedAt) : null,
    })),
  };
}

export function jobMatchesUrlUpdates(
  page: number,
  pageSize: JobMatchesPageSize
): Partial<DashboardSearchParams> {
  return { jobsPage: page, jobsPageSize: pageSize };
}

export function parameterHistoryUrlUpdates(
  page: number,
  pageSize: ParameterHistoryPageSize
): Partial<DashboardSearchParams> {
  return { historyPage: page, historyPageSize: pageSize };
}
