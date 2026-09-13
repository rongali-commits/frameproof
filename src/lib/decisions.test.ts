import { describe, it, expect } from "vitest";
import {
  getLatestDecision,
  getDecisionHistory,
  decisionLabel,
} from "@/lib/decisions";
import type { DecisionRecord } from "@/types";

const mockDecisions: DecisionRecord[] = [
  {
    id: "d1",
    assetId: "asset-1",
    versionId: "ver-1",
    status: "changes_requested",
    reviewer: "Mara",
    note: "First pass needs work",
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "d2",
    assetId: "asset-1",
    versionId: "ver-1",
    status: "approved",
    reviewer: "Mara",
    note: "Looks good now",
    createdAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "d3",
    assetId: "asset-1",
    versionId: "ver-2",
    status: "changes_requested",
    reviewer: "Devin",
    note: "New version, new issues",
    createdAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "d4",
    assetId: "asset-2",
    versionId: "ver-3",
    status: "approved",
    reviewer: "Mara",
    note: "Different asset",
    createdAt: "2026-09-10T10:00:00.000Z",
  },
];

describe("getLatestDecision", () => {
  it("returns the most recent decision for a version", () => {
    const latest = getLatestDecision(mockDecisions, "ver-1");
    expect(latest).not.toBeNull();
    expect(latest!.status).toBe("approved");
    expect(latest!.id).toBe("d2");
  });

  it("returns null when no decisions exist for a version", () => {
    const latest = getLatestDecision(mockDecisions, "ver-nonexistent");
    expect(latest).toBeNull();
  });

  it("does not return decisions from other versions", () => {
    const latest = getLatestDecision(mockDecisions, "ver-2");
    expect(latest).not.toBeNull();
    expect(latest!.id).toBe("d3");
    expect(latest!.status).toBe("changes_requested");
  });

  it("does not return decisions from other assets", () => {
    const latest = getLatestDecision(mockDecisions, "ver-1");
    expect(latest!.assetId).toBe("asset-1");
  });
});

describe("getDecisionHistory", () => {
  it("returns all decisions for a version sorted newest first", () => {
    const history = getDecisionHistory(mockDecisions, "ver-1");
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe("d2");
    expect(history[1].id).toBe("d1");
  });

  it("returns empty array for unknown version", () => {
    const history = getDecisionHistory(mockDecisions, "ver-unknown");
    expect(history).toHaveLength(0);
  });

  it("does not include decisions from other versions", () => {
    const history = getDecisionHistory(mockDecisions, "ver-2");
    expect(history).toHaveLength(1);
    expect(history[0].versionId).toBe("ver-2");
  });
});

describe("decisionLabel", () => {
  it("returns human-readable labels", () => {
    expect(decisionLabel("approved")).toBe("Approved");
    expect(decisionLabel("changes_requested")).toBe("Changes requested");
    expect(decisionLabel("pending")).toBe("Pending review");
  });
});

describe("Version-specific decision isolation", () => {
  it("ver-1 approved does not affect ver-2 status", () => {
    const v1Latest = getLatestDecision(mockDecisions, "ver-1");
    const v2Latest = getLatestDecision(mockDecisions, "ver-2");
    expect(v1Latest!.status).toBe("approved");
    expect(v2Latest!.status).toBe("changes_requested");
  });

  it("a new version starts without inheriting approval", () => {
    const newVersionDecisions = getDecisionHistory(
      mockDecisions,
      "ver-brand-new",
    );
    expect(newVersionDecisions).toHaveLength(0);
    const latest = getLatestDecision(mockDecisions, "ver-brand-new");
    expect(latest).toBeNull();
  });
});
