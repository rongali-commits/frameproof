import type { Asset, AssetVersion } from "@/types";

export function appendRevision(
  asset: Asset,
  source: Omit<AssetVersion, "version" | "label">,
): Asset {
  const number =
    Math.max(0, ...asset.versions.map((v) => Number(v.version.slice(1)) || 0)) +
    1;
  return {
    ...asset,
    versions: [
      ...asset.versions,
      { ...source, version: `v${number}`, label: `v${number}` },
    ],
  };
}
