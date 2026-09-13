import type { DecisionRecord, DecisionStatus } from "@/types";

export function getLatestDecision(
  decisions: DecisionRecord[],
  versionId: string
): DecisionRecord | null {
  const filtered = decisions
    .filter((d) => d.versionId === versionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filtered[0] ?? null;
}

export function getDecisionHistory(
  decisions: DecisionRecord[],
  versionId: string
): DecisionRecord[] {
  return decisions
    .filter((d) => d.versionId === versionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function decisionLabel(status: DecisionStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "pending":
    default:
      return "Pending review";
  }
}
