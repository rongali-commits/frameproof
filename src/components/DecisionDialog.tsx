import { useState } from "react";
import { X, Check, AlertTriangle, Clock, History } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import {
  getLatestDecision,
  getDecisionHistory,
  decisionLabel,
} from "@/lib/decisions";
import { formatFullDate } from "@/lib/format";
import type { DecisionStatus } from "@/types";
import { useDialog } from "@/lib/useDialog";

interface DecisionDialogProps {
  onClose: () => void;
}

export function DecisionDialog({ onClose }: DecisionDialogProps) {
  const dialogRef = useDialog(onClose);
  const {
    assets,
    selectedAssetId,
    selectedVersionId,
    decisions,
    setDecision,
    busy,
  } = useReview();

  const [status, setStatus] = useState<DecisionStatus>("pending");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState('');

  const asset = assets.find((a) => a.id === selectedAssetId);
  const version = asset?.versions.find((v) => v.id === selectedVersionId);

  if (!asset || !version) return null;

  const latest = getLatestDecision(decisions, version.id);
  const history = getDecisionHistory(decisions, version.id);

  const handleSubmit = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try { await setDecision(status, note.trim()); onClose(); }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'Decision could not be saved.'); }
  };

  const statusOptions: {
    value: DecisionStatus;
    label: string;
    icon: typeof Check;
    desc: string;
  }[] = [
    {
      value: "approved",
      label: "Approve",
      icon: Check,
      desc: "This version meets the standard and is approved.",
    },
    {
      value: "changes_requested",
      label: "Request changes",
      icon: AlertTriangle,
      desc: "This version needs revisions before approval.",
    },
    {
      value: "pending",
      label: "Mark pending",
      icon: Clock,
      desc: "No decision yet. Keep this version under review.",
    },
  ];

  return (
    <div
      className="fp-overlay fp-overlay-modal"
      onClick={onClose}
      role="dialog"
      aria-label="Review decision"
      aria-modal="true"
      ref={dialogRef}
      tabIndex={-1}
    >
      <div className="fp-decision-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fp-decision-header">
          <div>
            <h2 className="fp-decision-title">Review decision</h2>
            <p className="fp-decision-sub">
              {asset.name} / {version.label}
            </p>
          </div>
          <button
            className="fp-icon-btn"
            onClick={onClose}
            aria-label="Close decision dialog"
          >
            <X size={20} />
          </button>
        </div>

        {latest && (
          <div className="fp-decision-current">
            <span className="fp-decision-current-label">
              Current status:{" "}
            </span>
            <span
              className={`fp-decision-badge fp-decision-${latest.status}`}
            >
              {decisionLabel(latest.status)}
            </span>
            <span className="fp-decision-current-note">
              {latest.note || "No note provided."}
            </span>
          </div>
        )}

        <div className="fp-decision-options">
          {statusOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                className={`fp-decision-option ${
                  status === opt.value ? "fp-decision-option-selected" : ""
                }`}
                onClick={() => { setStatus(opt.value); setConfirming(false); }}
              >
                <Icon size={16} />
                <div>
                  <div className="fp-decision-option-label">{opt.label}</div>
                  <div className="fp-decision-option-desc">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="fp-decision-note">
          <label className="fp-field-label" htmlFor="decision-note">Note (optional)</label>
          <textarea
            id="decision-note"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context for this decision..."
            rows={3}
            className="fp-textarea"
          />
        </div>

        {history.length > 0 && (
          <div className="fp-decision-history">
            <div className="fp-decision-history-header">
              <History size={14} />
              <span>Decision history for {version.label}</span>
            </div>
            <div className="fp-decision-history-list">
              {history.map((d) => (
                <div key={d.id} className="fp-decision-history-item">
                  <span
                    className={`fp-decision-badge fp-decision-${d.status}`}
                  >
                    {decisionLabel(d.status)}
                  </span>
                  <span className="fp-decision-history-reviewer">
                    {d.reviewer}
                  </span>
                  <span className="fp-decision-history-date">
                    {formatFullDate(d.createdAt)}
                  </span>
                  {d.note && (
                    <span className="fp-decision-history-note">{d.note}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="fp-decision-footer">
          {saveError && <p role="alert">{saveError}</p>}
          {confirming && (
            <div className="fp-decision-confirm">
              <p>
                Confirm: set <strong>{version.label}</strong> of{" "}
                <strong>{asset.name}</strong> to{" "}
                <strong>{decisionLabel(status)}</strong>?
              </p>
              <p className="fp-decision-confirm-note">
                This decision applies only to {version.label}. A new version
                will not inherit it.
              </p>
            </div>
          )}
          <div className="fp-decision-actions">
            <button
              className="fp-btn fp-btn-ghost"
              onClick={() => {
                if (confirming) {
                  setConfirming(false);
                } else {
                  onClose();
                }
              }}
            >
              {confirming ? "Back" : "Cancel"}
            </button>
            <button
              className={`fp-btn ${
                status === "approved"
                  ? "fp-btn-success"
                  : status === "changes_requested"
                  ? "fp-btn-danger"
                  : "fp-btn-primary"
              }`}
              onClick={handleSubmit}
              disabled={busy}
            >
              {confirming ? "Confirm decision" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
