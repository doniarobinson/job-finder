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
import { searchParamsSchema, type SearchParams } from "@/lib/types";

export const PARAMETER_HISTORY_PAGE_SIZE = 10;

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
  pageSize: number;
  totalCount: number;
  currentEpochCount: number;
  totalPages: number;
};

export type DashboardData = {
  configured: boolean;
  /** Set when DATABASE_URL exists but the DB is unreachable or schema is missing */
  dbError?: string;
  paused: boolean;
  jobs: Array<{
    id: number;
    title: string;
    company: string;
    score: number | null;
    status: string;
    url: string;
    createdAt: Date;
  }>;
  archivedJobCount: number;
  currentEpochLabel: string | null;
  currentParams: Record<string, unknown> | null;
};

const emptyDashboard: DashboardData = {
  configured: false,
  paused: false,
  jobs: [],
  archivedJobCount: 0,
  currentEpochLabel: null,
  currentParams: null,
};

const emptyParameterHistoryPage = (page: number): ParameterHistoryPage => ({
  entries: [],
  page,
  pageSize: PARAMETER_HISTORY_PAGE_SIZE,
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

export async function getParameterHistoryPage(page = 1): Promise<ParameterHistoryPage> {
  if (!db) {
    return emptyParameterHistoryPage(page);
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  try {
    const profileId = await getLatestProfileId();
    if (!profileId) {
      return emptyParameterHistoryPage(safePage);
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

    const totalPages = Math.max(1, Math.ceil(totalCount / PARAMETER_HISTORY_PAGE_SIZE));
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
      .limit(PARAMETER_HISTORY_PAGE_SIZE)
      .offset((clampedPage - 1) * PARAMETER_HISTORY_PAGE_SIZE);

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
      pageSize: PARAMETER_HISTORY_PAGE_SIZE,
      totalCount,
      currentEpochCount,
      totalPages,
    };
  } catch (error) {
    console.warn("Dashboard: parameter history unavailable.", error);
    return emptyParameterHistoryPage(safePage);
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
    let currentEpochId: number | null = null;
    let currentEpochLabel: string | null = null;
    let archivedJobCount = 0;

    if (profileId) {
      const epoch = await ensureCurrentEpoch(profileId);
      currentEpochId = epoch.id;
      currentEpochLabel = epochKindLabel(epoch.kind);

      const [{ value: archived }] = await db
        .select({ value: count() })
        .from(schema.jobs)
        .where(and(isNotNull(schema.jobs.epochId), ne(schema.jobs.epochId, epoch.id)));

      archivedJobCount = archived;
    }

    const jobRows = currentEpochId
      ? await db
          .select()
          .from(schema.jobs)
          .where(eq(schema.jobs.epochId, currentEpochId))
          .orderBy(desc(schema.jobs.score), desc(schema.jobs.createdAt))
          .limit(50)
      : [];

    const [currentParamsRow] = await db
      .select()
      .from(schema.searchParams)
      .where(eq(schema.searchParams.isCurrent, true))
      .orderBy(desc(schema.searchParams.id))
      .limit(1);

    return {
      configured: true,
      paused: settings?.paused ?? false,
      jobs: jobRows.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        score: j.score,
        status: j.status,
        url: j.url,
        createdAt: j.createdAt,
      })),
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
