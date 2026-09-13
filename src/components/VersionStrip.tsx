import { Upload, Clock } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { getLatestDecision, decisionLabel } from "@/lib/decisions";
import { formatRelativeTime } from "@/lib/format";

interface Props { onOpenCompare: () => void; onOpenDecision: () => void; onOpenUpload: () => void; }
export function VersionStrip({ onOpenCompare, onOpenDecision, onOpenUpload }: Props) {
  const { assets, selectedAssetId, selectedVersionId, selectVersion, decisions, comments, versionBlobURLs, canEdit, busy } = useReview();
  const asset = assets.find(a => a.id === selectedAssetId);
  if (!asset) return null;
  return <footer className="fp-version-strip">
    <div className="fp-strip-label">Versions</div>
    <div className="fp-version-tabs">{asset.versions.map(v => {
      const status = getLatestDecision(decisions, v.id)?.status ?? "pending";
      return <div key={v.id} className={`fp-version-tab ${v.id === selectedVersionId ? "fp-version-active" : ""}`}>
        <button className="fp-version-btn" onClick={() => selectVersion(v.id)} aria-pressed={v.id === selectedVersionId}>
          <div className="fp-version-thumb"><img src={versionBlobURLs[v.id] || v.src} alt={`${v.label} thumbnail`} /></div>
          <div className="fp-version-info"><span className="fp-version-tag-label">{v.label}</span><span className="fp-version-date">{formatRelativeTime(v.uploadedAt)}</span><span className="fp-version-comments">{comments.filter(c => c.versionId === v.id).length} comments</span></div>
        </button>
        <span className={`fp-decision-badge fp-decision-${status}`}><Clock size={11} />{decisionLabel(status)}</span>
      </div>;
    })}</div>
    <div className="fp-strip-actions">
      <button className="fp-btn fp-btn-outline" disabled={asset.versions.length < 2} onClick={onOpenCompare}>Compare versions</button>
      <button className="fp-btn fp-btn-primary" disabled={!selectedVersionId || busy} onClick={onOpenDecision}>Review decision</button>
      {canEdit && <button className="fp-btn fp-btn-ghost" onClick={onOpenUpload}><Upload size={14} />New version</button>}
    </div>
  </footer>;
}
