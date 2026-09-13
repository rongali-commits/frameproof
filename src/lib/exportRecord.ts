import type { Asset, Comment, DecisionRecord } from "@/types";

export function createReviewRecord(
  snapshot: {
    assets: Asset[];
    comments: Comment[];
    decisions: DecisionRecord[];
  },
  projectName: string,
) {
  return {
    project: projectName,
    exportedAt: new Date().toISOString(),
    notice:
      "Review activity record, not an electronic signature. Guest names are self-reported.",
    assets: snapshot.assets.map((a) => ({
      id: a.id,
      name: a.name,
      subtitle: a.subtitle,
      versions: a.versions.map((v) => ({
        id: v.id,
        version: v.version,
        label: v.label,
        uploadedAt: v.uploadedAt,
      })),
    })),
    comments: snapshot.comments,
    decisions: snapshot.decisions,
  };
}

export function downloadReviewRecord(json: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "frameproof-review-record.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
