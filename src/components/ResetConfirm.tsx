import { X, AlertTriangle } from "lucide-react";

interface ResetConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetConfirm({ onConfirm, onCancel }: ResetConfirmProps) {
  return (
    <div
      className="fp-overlay fp-overlay-modal"
      onClick={onCancel}
      role="dialog"
      aria-label="Confirm reset demo"
    >
      <div className="fp-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fp-confirm-header">
          <div className="fp-confirm-icon">
            <AlertTriangle size={20} />
          </div>
          <h2 className="fp-confirm-title">Reset demo data?</h2>
          <button
            className="fp-icon-btn"
            onClick={onCancel}
            aria-label="Cancel reset"
          >
            <X size={18} />
          </button>
        </div>
        <p className="fp-confirm-body">
          This will restore all comments, decisions, and artwork to their
          original demo state. Any uploaded demo images will be removed from
          this device.
        </p>
        <div className="fp-confirm-actions">
          <button className="fp-btn fp-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="fp-btn fp-btn-danger" onClick={onConfirm}>
            Reset demo
          </button>
        </div>
      </div>
    </div>
  );
}
