import { X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useDialog } from "@/lib/useDialog";

interface ResetConfirmProps {
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ResetConfirm({ onConfirm, onCancel }: ResetConfirmProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useDialog(() => {
    if (!busy) onCancel();
  });
  return (
    <div
      className="fp-overlay fp-overlay-modal"
      onClick={() => {
        if (!busy) onCancel();
      }}
      role="dialog"
      aria-label="Confirm reset demo"
      aria-modal="true"
      ref={ref}
      tabIndex={-1}
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
          {error && <p role="alert">{error}</p>}
          <button
            className="fp-btn fp-btn-danger"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              Promise.resolve(onConfirm()).catch((e) => {
                setError(e.message);
                setBusy(false);
              });
            }}
          >
            {busy ? "Resetting..." : "Reset demo"}
          </button>
        </div>
      </div>
    </div>
  );
}
