export type AgentEpochKind = "initial_bootstrap" | "rebootstrap";

export function epochKindLabel(kind: AgentEpochKind): string {
  return kind === "rebootstrap" ? "Re-bootstrap" : "Initial bootstrap";
}
