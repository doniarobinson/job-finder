export const AGENT_CYCLE_STEPS = [
  "Load profile and current search parameters",
  "Search job listings",
  "Dedupe results within the current era",
  "Score matches against your resume",
  "Refine search parameters from strong matches",
  "Persist jobs and updated parameters",
] as const;

export function formatAgentCycleInProgressMessage(): string {
  return [
    "Running search cycle…",
    "",
    ...AGENT_CYCLE_STEPS.map((step, index) => `${index + 1}. ${step}`),
  ].join("\n");
}
