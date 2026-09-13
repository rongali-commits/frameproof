import { describe, expect, it } from "vitest";
import { createReviewRecord } from "./exportRecord";
import { ASSETS, DEMO_COMMENTS, DEMO_DECISIONS } from "@/demoData";

describe("review record export", () => {
  const snapshot = {
    assets: ASSETS,
    comments: DEMO_COMMENTS,
    decisions: DEMO_DECISIONS,
  };
  it("keeps exact version identities and all review events", () => {
    const record = createReviewRecord(snapshot, "QA");
    expect(record.project).toBe("QA");
    expect(record.assets[0].versions[0].id).toBe(ASSETS[0].versions[0].id);
    expect(record.comments).toEqual(DEMO_COMMENTS);
    expect(record.decisions).toEqual(DEMO_DECISIONS);
  });
  it("omits image URLs and browser-only blob identifiers", () => {
    const record = createReviewRecord(snapshot, "QA");
    for (const asset of record.assets)
      for (const version of asset.versions) {
        expect(version).not.toHaveProperty("src");
        expect(version).not.toHaveProperty("blobId");
      }
  });
  it("includes explicit attribution limits and a valid export date", () => {
    const record = createReviewRecord(snapshot, "QA");
    expect(record.notice).toContain("self-reported");
    expect(Number.isNaN(Date.parse(record.exportedAt))).toBe(false);
  });
});
