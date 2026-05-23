import { searchParamsSchema, type SearchParams } from "@/lib/types";

/** Keywords introduced when params change after an agent search/refinement cycle. */
export function keywordsAddedInRefinement(before: SearchParams, after: SearchParams): string[] {
  const beforeKeys = new Set(before.keywords.map((keyword) => keyword.toLowerCase()));
  return after.keywords.filter((keyword) => !beforeKeys.has(keyword.toLowerCase()));
}

export function searchParamsFingerprint(params: SearchParams): string {
  return JSON.stringify(searchParamsSchema.parse(params));
}

export function cycleAddedKeywordsByAfterParams(
  rows: Array<{ beforeJson: unknown; afterJson: unknown }>
): Map<string, string[]> {
  const byAfter = new Map<string, string[]>();

  for (const row of rows) {
    const before = searchParamsSchema.parse(row.beforeJson);
    const after = searchParamsSchema.parse(row.afterJson);
    byAfter.set(
      searchParamsFingerprint(after),
      keywordsAddedInRefinement(before, after)
    );
  }

  return byAfter;
}
