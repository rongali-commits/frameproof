import { useState } from "react";
import { Upload, Check, AlertTriangle, Clock } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { getLatestDecision, decisionLabel } from "@/lib/decisions";
import { formatRelativeTime } from "@/lib/format";
import { validateImageFile } from "@/lib/validation";

interface VersionStripProps {
  onOpenCompare: () => void;
  onOpenDecision: () => void;
  onOpenUpload: () => void;
}

export function VersionStrip({
  onOpenCompare,
  onOpenDecision,
  onOpenUpload,
}: VersionStripProps) {
  const {
    assets,
    selectedAssetId,
    selectedVersionId,
    selectVersion,
    decisions,
  versionBlobURLs,
  uploadVersion,
  comments,
  } = useReview();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const asset = assets.find((a) => a.id === selectedAssetId);
  if (!asset) return null;

  const currentVersion = asset.versions.find(
    (v) => v.id === selectedVersionId
  );

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    versionTag: "v1" | "v2"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setUploadError(validation.error ?? "Invalid file.");
      return;
    }
    setUploading(true);
    try {
      await uploadVersion(file, versionTag);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <footer className="fp-version-strip">
      <div className="fp-strip-label">Versions</div>
      <div className="fp-version-tabs">
        {asset.versions.map((version) => {
          const isActive = version.id === selectedVersionId;
          const decision = getLatestDecision(decisions, version.id);
          const versionCommentCount = comments.filter(
            (c) => c.versionId === version.id
          ).length;
          const hasBlob = !!versionBlobURLs[version.id];

          return (
            <div
              key={version.id}
              className={`fp-version-tab ${isActive ? "fp-version-active" : ""}`}
            >
              <button
                className="fp-version-btn"
                onClick={() => selectVersion(version.id)}
                aria-pressed={isActive}
              >
                <div className="fp-version-thumb">
                  <img
                    src={versionBlobURLs[version.id] ?? version.src}
                    alt={`${version.label} thumbnail`}
                    loading="lazy"
                  />
                  {hasBlob && (
                    <span className="fp-version-custom-badge">Demo upload</span>
                  )}
                </div>
                <div className="fp-version-info">
                  <span className="fp-version-tag-label">
                    {version.label}
                  </span>
                  <span className="fp-version-date">
                    {formatRelativeTime(version.uploadedAt)}
                  </span>
                  <span className="fp-version-comments">
                    {versionCommentCount} comments
                  </span>
                </div>
              </button>
              <div className="fp-version-decision">
                {decision ? (
                  <span
                    className={`fp-decision-badge fp-decision-${decision.status}`}
                  >
                    {decision.status === "approved" && (
                      <Check size={11} />
                    )}
                    {decision.status === "changes_requested" && (
                      <AlertTriangle size={11} />
                    )}
                    {decision.status === "pending" && (
                      <Clock size={11} />
                    )}
                    {decisionLabel(decision.status)}
                  </span>
                ) : (
                  <span className="fp-decision-badge fp-decision-pending">
                    <Clock size={11} />
                    {decisionLabel("pending")}
                  </span>
                )}
              </div>
              <label
                className="fp-version-upload-btn"
                title={`Upload replacement for ${version.label}`}
              >
                <Upload size={12} />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    handleFileSelect(e, version.version)
                  }
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="fp-strip-actions">
        <button
          className="fp-btn fp-btn-outline"
          onClick={onOpenCompare}
        >
          Compare v1 / v2
        </button>
        <button
          className="fp-btn fp-btn-primary"
          onClick={onOpenDecision}
          disabled={!currentVersion}
        >
          Review decision
        </button>
        <button
          className="fp-btn fp-btn-ghost"
          onClick={onOpenUpload}
        >
          <Upload size={13} /> New version
        </button>
      </div>

      {uploadError && (
        <div className="fp-upload-error" role="alert">
          {uploadError}
          <button
            className="fp-btn fp-btn-text"
            onClick={() => setUploadError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </footer>
  );
}
