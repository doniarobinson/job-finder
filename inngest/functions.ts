import { runSearchCycle } from "@/lib/agent/runSearchCycle";

import { inngest } from "./client";

export const jobFinderCycle = inngest.createFunction(
  {
    id: "job-finder-cycle",
    name: "Job Finder Agent Cycle",
    retries: 2,
    triggers: [{ event: "job-finder/cycle.run" }],
  },
  async ({ step }) => {
    const result = await step.run("run-search-cycle", async () => runSearchCycle());
    return result;
  }
);

export const inngestFunctions = [jobFinderCycle];
