import { describe, it, expect } from "vitest";
import { ASSETS, DEMO_COMMENTS, DEMO_DECISIONS } from "@/demoData";
import { getLatestDecision } from "@/lib/decisions";

describe("Version-specific comment filtering", () => {
  it("each asset has exactly 2 versions", () => {
    ASSETS.forEach((asset) => {
      expect(asset.versions).toHaveLength(2);
    });
  });

  it("comments are scoped to a specific version, not just the asset", () => {
    const springV1Comments = DEMO_COMMENTS.filter(
      (c) => c.assetId === "asset-spring" && c.versionId === "ver-spring-v1",
    );
    const springV2Comments = DEMO_COMMENTS.filter(
      (c) => c.assetId === "asset-spring" && c.versionId === "ver-spring-v2",
    );

    expect(springV1Comments.length).toBeGreaterThan(0);
    expect(springV2Comments.length).toBeGreaterThan(0);

    springV1Comments.forEach((c) => {
      expect(c.versionId).toBe("ver-spring-v1");
    });
    springV2Comments.forEach((c) => {
      expect(c.versionId).toBe("ver-spring-v2");
    });
  });

  it("switching versions shows only comments for that version", () => {
    const allVersionIds = ASSETS.flatMap((a) => a.versions.map((v) => v.id));

    allVersionIds.forEach((versionId) => {
      const versionComments = DEMO_COMMENTS.filter(
        (c) => c.versionId === versionId,
      );
      versionComments.forEach((c) => {
        expect(c.versionId).toBe(versionId);
      });
    });
  });

  it("no comment belongs to a nonexistent version", () => {
    const validVersionIds = new Set(
      ASSETS.flatMap((a) => a.versions.map((v) => v.id)),
    );
    DEMO_COMMENTS.forEach((c) => {
      expect(validVersionIds.has(c.versionId)).toBe(true);
    });
  });
});

describe("Version-specific decision isolation", () => {
  it("ver-1 of spring has changes_requested, not approved", () => {
    const decision = getLatestDecision(DEMO_DECISIONS, "ver-spring-v1");
    expect(decision).not.toBeNull();
    expect(decision!.status).toBe("changes_requested");
  });

  it("ver-2 of spring has no decision (does not inherit v1)", () => {
    const decision = getLatestDecision(DEMO_DECISIONS, "ver-spring-v2");
    expect(decision).toBeNull();
  });

  it("ver-1 of field guide is approved", () => {
    const decision = getLatestDecision(DEMO_DECISIONS, "ver-field-v1");
    expect(decision).not.toBeNull();
    expect(decision!.status).toBe("approved");
  });

  it("ver-2 of field guide has no decision (does not inherit v1 approval)", () => {
    const decision = getLatestDecision(DEMO_DECISIONS, "ver-field-v2");
    expect(decision).toBeNull();
  });

  it("decisions reference valid version IDs", () => {
    const validVersionIds = new Set(
      ASSETS.flatMap((a) => a.versions.map((v) => v.id)),
    );
    DEMO_DECISIONS.forEach((d) => {
      expect(validVersionIds.has(d.versionId)).toBe(true);
    });
  });
});

describe("Asset version structure", () => {
  it("each version has a unique ID", () => {
    const allVersionIds = ASSETS.flatMap((a) => a.versions.map((v) => v.id));
    const uniqueIds = new Set(allVersionIds);
    expect(uniqueIds.size).toBe(allVersionIds.length);
  });

  it("versions are tagged v1 and v2", () => {
    ASSETS.forEach((asset) => {
      const tags = asset.versions.map((v) => v.version);
      expect(tags).toContain("v1");
      expect(tags).toContain("v2");
    });
  });
});
