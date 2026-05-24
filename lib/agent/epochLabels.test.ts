import { describe, expect, it } from "vitest";

import { epochKindLabel } from "./epochLabels";

describe("epochKindLabel", () => {
  it("labels bootstrap kinds for display", () => {
    expect(epochKindLabel("initial_bootstrap")).toBe("Initial bootstrap");
    expect(epochKindLabel("rebootstrap")).toBe("Re-bootstrap");
  });
});
