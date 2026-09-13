import { useReview } from "@/store/ReviewStore";
import { ChevronLeft } from "lucide-react";

interface AssetRailProps {
  open: boolean;
  onClose: () => void;
}

export function AssetRail({ open, onClose }: AssetRailProps) {
  const { assets, selectedAssetId, selectAsset, selectedVersionId, versionBlobURLs } =
    useReview();

  return (
    <>
      <aside
        className={`fp-asset-rail ${open ? "fp-rail-open" : "fp-rail-closed"}`}
        aria-label="Asset list"
      >
        <div className="fp-rail-header">
          <span className="fp-rail-title">Assets</span>
          <button
            className="fp-icon-btn"
            onClick={onClose}
            aria-label="Close asset list"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="fp-rail-list">
          {assets.map((asset) => {
            const isActive = asset.id === selectedAssetId;
            const activeVersion = asset.versions.find(
              (v) => v.id === selectedVersionId
            );
            return (
              <button
                key={asset.id}
                className={`fp-asset-card ${isActive ? "fp-asset-active" : ""}`}
                onClick={() => { selectAsset(asset.id); onClose(); }}
              >
                <div className="fp-asset-thumb">
                  {asset.versions.length > 0 ? <img
                    src={versionBlobURLs[asset.versions[0].id] || asset.versions[0].src}
                    alt={asset.name}
                    loading="lazy"
                  /> : <span>No image yet</span>}
                </div>
                <div className="fp-asset-meta">
                  <div className="fp-asset-name">{asset.name}</div>
                  <div className="fp-asset-sub">{asset.subtitle}</div>
                  <div className="fp-asset-ver">
                    {isActive && activeVersion
                      ? activeVersion.label
                      : `${asset.versions.length} versions`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
