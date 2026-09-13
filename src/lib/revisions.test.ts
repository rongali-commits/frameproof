import { describe, it, expect } from "vitest";
import { appendRevision } from "./revisions";
import { getLatestDecision } from "./decisions";
import type { Asset, DecisionRecord } from "@/types";

describe("immutable image revisions", () => {
  it("appends v3 without overwriting v2 or inheriting approval", () => {
    const asset: Asset = {
      id: "a",
      name: "Poster",
      subtitle: "",
      versions: [
        {
          id: "one",
          version: "v1",
          label: "v1",
          src: "old",
          uploadedAt: "2026-01-01",
        },
        {
          id: "two",
          version: "v2",
          label: "v2",
          src: "approved-file",
          uploadedAt: "2026-01-02",
        },
      ],
    };
    const next = appendRevision(asset, {
      id: "three",
      src: "new-file",
      uploadedAt: "2026-01-03",
    });
    const decisions: DecisionRecord[] = [
      {
        id: "d",
        assetId: "a",
        versionId: "two",
        status: "approved",
        note: "",
        reviewer: "Test",
        createdAt: "2026-01-02",
      },
    ];
    expect(asset.versions).toHaveLength(2);
    expect(next.versions[1].src).toBe("approved-file");
    expect(next.versions[2].version).toBe("v3");
    expect(getLatestDecision(decisions, "three")).toBeNull();
  });
});
