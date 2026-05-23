import { describe, expect, it } from "vitest";

import {
  cycleAddedKeywordsByAfterParams,
  keywordsAddedInRefinement,
  searchParamsFingerprint,
} from "./paramsDiff";
import type { SearchParams } from "./types";

const baseParams: SearchParams = {
  keywords: ["typescript", "react", "node", "python", "sql"],
  titleVariants: ["software engineer"],
  locations: ["San Francisco, CA"],
  remote: false,
  negativeKeywords: [],
  maxResultsPerCycle: 20,
};

describe("paramsDiff", () => {
  it("returns keywords present in after but not before", () => {
    const after: SearchParams = {
      ...baseParams,
      keywords: [
        ...baseParams.keywords,
        "Full Stack",
        "Front End",
        ".NET",
        "C#",
        "distributed systems",
      ],
    };

    expect(keywordsAddedInRefinement(baseParams, after)).toEqual([
      "Full Stack",
      "Front End",
      ".NET",
      "C#",
      "distributed systems",
    ]);
  });

  it("maps cycle-added keywords by after-params fingerprint", () => {
    const after: SearchParams = {
      ...baseParams,
      keywords: [...baseParams.keywords, "kubernetes"],
    };

    const map = cycleAddedKeywordsByAfterParams([
      { beforeJson: baseParams, afterJson: after },
    ]);

    expect(map.get(searchParamsFingerprint(after))).toEqual(["kubernetes"]);
  });
});
