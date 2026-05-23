import { and, count, desc, eq, inArray, isNotNull, min, ne } from "drizzle-orm";

import {
  ensureCurrentEpoch,
  epochKindLabel,
  listEpochsForProfile,
  type AgentEpochKind,
} from "@/lib/agent/epochs";
import { db, schema } from "@/lib/db";
import { formatFriendlyDbError } from "@/lib/db/friendlyError";
import { cycleAddedKeywordsByAfterParams, searchParamsFingerprint } from "@/lib/paramsDiff";
import {
  DEFAULT_PARAMETER_HISTORY_PAGE_SIZE,
  parseParameterHistoryPageSize,
  type ParameterHistoryPageSize,
} from "@/lib/parameterHistoryPagination";
import {
  DEFAULT_JOB_MATCHES_PAGE_SIZE,
  jobMatchesLimit,
  jobMatchesTotalPages,
  parseJobMatchesPageSize,
  type JobMatchesPageSize,
} from "@/lib/jobMatchesPagination";
import { searchParamsSchema, type SearchParams } from "@/lib/types";

export {
  DEFAULT_JOB_MATCHES_PAGE_SIZE,
  JOB_MATCHES_PAGE_SIZE_OPTIONS,
  parseJobMatchesPage,
  parseJobMatchesPageSize,
  type JobMatchesPageSize,
} from "@/lib/jobMatchesPagination";

/** @deprecated Use DEFAULT_PARAMETER_HISTORY_PAGE_SIZE */
export const PARAMETER_HISTORY_PAGE_SIZE = DEFAULT_PARAMETER_HISTORY_PAGE_SIZE;

export {
  DEFAULT_PARAMETER_HISTORY_PAGE_SIZE,
  PARAMETER_HISTORY_PAGE_SIZE_OPTIONS,
  parseParameterHistoryPage,
  parseParameterHistoryPageSize,
  type ParameterHistoryPageSize,
} from "@/lib/parameterHistoryPagination";

export type ParameterHistoryEntry = {
  id: number;
  params: SearchParams;
  isCurrent: boolean;
  createdAt: Date;
  epochId: number | null;
  epochKind: AgentEpochKind | null;
  epochLabel: string | null;
  epochStartedAt: Date | null;
  showEpochDividerAfter: boolean;
  /** Keywords added after an Adzuna search cycle (from param_history). */
  cycleAddedKeywords: string[];
};

export type ParameterHistoryPage = {
  entries: ParameterHistoryEntry[];
  page: number;
  pageSize: ParameterHistoryPageSize;
  totalCount: number;
  currentEpochCount: number;
  totalPages: number;
};

export type DashboardData = {
  configured: boolean;
  /** Set when DATABASE_URL exists but the DB is unreachable or schema is missing */
  dbError?: string;
  paused: boolean;
  archivedJobCount: number;
  currentEpochLabel: string | null;
  currentParams: Record<string, unknown> | null;
};

export type JobMatchRow = {
  id: number;
  title: string;
  company: string;
  score: number | null;
  status: string;
  url: string;
  createdAt: Date;
};

export type JobMatchesPage = {
  jobs: JobMatchRow[];
  page: number;
  pageSize: JobMatchesPageSize;
  totalCount: number;
  totalPages: number;
};

const emptyDashboard: DashboardData = {
  configured: false,
  paused: false,
  archivedJobCount: 0,
  currentEpochLabel: null,
  currentParams: null,
};

const emptyJobMatchesPage = (
  page: number,
  pageSize: JobMatchesPageSize = DEFAULT_JOB_MATCHES_PAGE_SIZE
): JobMatchesPage => ({
  jobs: [],
  page,
  pageSize,
  totalCount: 0,
  totalPages: 1,
});

const emptyParameterHistoryPage = (
  page: number,
  pageSize: ParameterHistoryPageSize = DEFAULT_PARAMETER_HISTORY_PAGE_SIZE
): ParameterHistoryPage => ({
  entries: [],
  page,
  pageSize,
  totalCount: 0,
  currentEpochCount: 0,
  totalPages: 1,
});

async function getLatestProfileId(): Promise<number | null> {
  if (!db) return null;

  const [profile] = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .orderBy(desc(schema.profiles.id))
    .limit(1);

  return profile?.id ?? null;
}

export async function getParameterHistoryPage(
  page = 1,
  pageSizeInput?: number
): Promise<ParameterHistoryPage> {
  const pageSize = parseParameterHistoryPageSize(
    pageSizeInput != null ? String(pageSizeInput) : undefined
  );

  if (!db) {
    return emptyParameterHistoryPage(page, pageSize);
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  try {
    const profileId = await getLatestProfileId();
    if (!profileId) {
      return emptyParameterHistoryPage(safePage, pageSize);
    }

    const epochs = await listEpochsForProfile(profileId);
    const epochById = new Map(epochs.map((epoch) => [epoch.id, epoch]));

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(schema.searchParams)
      .where(eq(schema.searchParams.profileId, profileId));

    const currentEpoch = await ensureCurrentEpoch(profileId);
    const [{ value: currentEpochCount }] = await db
      .select({ value: count() })
      .from(schema.searchParams)
      .where(
        and(
          eq(schema.searchParams.profileId, profileId),
          eq(schema.searchParams.epochId, currentEpoch.id)
        )
      );

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const clampedPage = Math.min(safePage, totalPages);

    const epochStartRows = await db
      .select({
        epochId: schema.searchParams.epochId,
        firstParamId: min(schema.searchParams.id),
      })
      .from(schema.searchParams)
      .where(and(eq(schema.searchParams.profileId, profileId), isNotNull(schema.searchParams.epochId)))
      .groupBy(schema.searchParams.epochId);

    const epochStartParamIdByEpoch = new Map(
      epochStartRows.map((row) => [row.epochId!, row.firstParamId!])
    );

    const rows = await db
      .select()
      .from(schema.searchParams)
      .where(eq(schema.searchParams.profileId, profileId))
      .orderBy(desc(schema.searchParams.id))
      .limit(pageSize)
      .offset((clampedPage - 1) * pageSize);

    const epochIds = [...new Set(rows.map((row) => row.epochId).filter((id): id is number => id != null))];
    const paramHistoryRows =
      epochIds.length > 0
        ? await db
            .select({
              beforeJson: schema.paramHistory.beforeJson,
              afterJson: schema.paramHistory.afterJson,
            })
            .from(schema.paramHistory)
            .where(inArray(schema.paramHistory.epochId, epochIds))
        : [];
    const cycleAddedByAfter = cycleAddedKeywordsByAfterParams(paramHistoryRows);

    const mapped = rows.map((row) => {
      const params = searchParamsSchema.parse(row.paramsJson);
      const epoch = row.epochId ? epochById.get(row.epochId) : undefined;
      const kind = (epoch?.kind as AgentEpochKind | undefined) ?? null;
      const isEpochStartEntry =
        row.epochId != null && row.id === epochStartParamIdByEpoch.get(row.epochId);
      return {
        id: row.id,
        params,
        isCurrent: row.isCurrent,
        createdAt: row.createdAt,
        epochId: row.epochId,
        epochKind: kind,
        epochLabel: kind && isEpochStartEntry ? epochKindLabel(kind) : null,
        epochStartedAt: epoch?.startedAt ?? null,
        showEpochDividerAfter: false,
        cycleAddedKeywords: cycleAddedByAfter.get(searchParamsFingerprint(params)) ?? [],
      };
    });

    for (let i = 0; i < mapped.length; i += 1) {
      const next = mapped[i + 1];
      if (next && mapped[i]!.epochId !== next.epochId) {
        mapped[i]!.showEpochDividerAfter = true;
      }
    }

    return {
      entries: mapped,
      page: clampedPage,
      pageSize,
      totalCount,
      currentEpochCount,
      totalPages,
    };
  } catch (error) {
    console.warn("Dashboard: parameter history unavailable.", error);
    return emptyParameterHistoryPage(safePage, pageSize);
  }
}

export async function getJobMatchesPage(
  page = 1,
  pageSizeInput?: number | JobMatchesPageSize
): Promise<JobMatchesPage> {
  const pageSize = parseJobMatchesPageSize(
    pageSizeInput != null ? String(pageSizeInput) : undefined
  );

  if (!db) {
    return emptyJobMatchesPage(page, pageSize);
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  try {
    const profileId = await getLatestProfileId();
    if (!profileId) {
      return emptyJobMatchesPage(safePage, pageSize);
    }

    const epoch = await ensureCurrentEpoch(profileId);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(schema.jobs)
      .where(eq(schema.jobs.epochId, epoch.id));

    const totalPages = jobMatchesTotalPages(pageSize, totalCount);
    const clampedPage = Math.min(safePage, totalPages);
    const limit = jobMatchesLimit(pageSize, totalCount);
    const offset = pageSize === "all" ? 0 : (clampedPage - 1) * pageSize;

    const jobRows = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.epochId, epoch.id))
      .orderBy(desc(schema.jobs.score), desc(schema.jobs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      jobs: jobRows.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        score: job.score,
        status: job.status,
        url: job.url,
        createdAt: job.createdAt,
      })),
      page: clampedPage,
      pageSize,
      totalCount,
      totalPages,
    };
  } catch (error) {
    console.warn("Dashboard: job matches unavailable.", error);
    return emptyJobMatchesPage(safePage, pageSize);
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!db) {
    return emptyDashboard;
  }

  try {
    const [settings] = await db
      .select()
      .from(schema.agentSettings)
      .where(eq(schema.agentSettings.id, 1))
      .limit(1);

    const profileId = await getLatestProfileId();
    let currentEpochLabel: string | null = null;
    let archivedJobCount = 0;

    if (profileId) {
      const epoch = await ensureCurrentEpoch(profileId);
      currentEpochLabel = epochKindLabel(epoch.kind);

      const [{ value: archived }] = await db
        .select({ value: count() })
        .from(schema.jobs)
        .where(and(isNotNull(schema.jobs.epochId), ne(schema.jobs.epochId, epoch.id)));

      archivedJobCount = archived;
    }

    const [currentParamsRow] = await db
      .select()
      .from(schema.searchParams)
      .where(eq(schema.searchParams.isCurrent, true))
      .orderBy(desc(schema.searchParams.id))
      .limit(1);

    return {
      configured: true,
      paused: settings?.paused ?? false,
      archivedJobCount,
      currentEpochLabel,
      currentParams: currentParamsRow
        ? searchParamsSchema.parse(currentParamsRow.paramsJson)
        : null,
    };
  } catch (error) {
    console.warn("Dashboard: database unavailable, showing UI without data.", error);
    return {
      ...emptyDashboard,
      dbError: formatFriendlyDbError(error),
    };
  }
}
