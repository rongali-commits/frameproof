import { useEffect, useState } from "react";
import { Menu, PanelRightOpen } from "lucide-react";
import { useReview } from "@/store/ReviewContext";
import { Toolbar } from "@/components/Toolbar";
import { AssetRail } from "@/components/AssetRail";
import { ReviewCanvas } from "@/components/ReviewCanvas";
import { CommentPanel } from "@/components/CommentPanel";
import { VersionStrip } from "@/components/VersionStrip";
import { CompareView } from "@/components/CompareView";
import { DecisionDialog } from "@/components/DecisionDialog";
import { UploadDialog } from "@/components/UploadDialog";
import { ResetConfirm } from "@/components/ResetConfirm";
import { PROJECT_DESCRIPTION } from "@/demoData";
import { useDialog } from "./lib/useDialog";

export function Workspace() {
  const {
    resetDemo,
    selectedAssetId,
    selectedVersionId,
    selectedCommentId,
    assets,
    isDemo,
    error,
    dismissError,
    busy,
  } = useReview();
  const [railOpen, setRailOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const commentDrawer = useDialog(() => setPanelOpen(false), panelOpen);
  useEffect(() => {
    if (selectedCommentId && window.matchMedia("(max-width: 1024px)").matches) {
      setRailOpen(false);
      setPanelOpen(true);
    }
  }, [selectedCommentId]);

  return (
    <div className="fp-app">
      <Toolbar onReset={() => setShowReset(true)} />
      {error && (
        <div className="fp-error-banner" role="alert">
          {error}
          <button onClick={dismissError}>Dismiss</button>
        </div>
      )}
      {busy && (
        <div className="fp-save-notice" role="status">
          Saving changes...
        </div>
      )}

      <div className="fp-workspace">
        <div className="fp-mobile-bar">
          <button
            className="fp-icon-btn fp-mobile-toggle"
            onClick={() => {
              setPanelOpen(false);
              setRailOpen(!railOpen);
            }}
            aria-label="Toggle asset list"
          >
            <Menu size={18} />
          </button>
          <span className="fp-mobile-bar-title">
            {assets.find((a) => a.id === selectedAssetId)?.name || "Assets"}
          </span>
          <button
            className="fp-icon-btn fp-mobile-toggle"
            onClick={() => {
              setRailOpen(false);
              setPanelOpen(!panelOpen);
            }}
            aria-label="Toggle comments"
          >
            <PanelRightOpen size={18} />
          </button>
        </div>

        <AssetRail open={railOpen} onClose={() => setRailOpen(false)} />

        <main className="fp-main">
          <ReviewCanvas key={`${selectedAssetId}/${selectedVersionId}`} />
        </main>

        <div
          ref={commentDrawer}
          className={`fp-comments-region ${panelOpen ? "is-open" : ""}`}
          role={panelOpen ? "dialog" : undefined}
          aria-modal={panelOpen || undefined}
          aria-label={panelOpen ? "Comments panel" : undefined}
        >
          <button
            className="fp-mobile-close fp-btn"
            onClick={() => setPanelOpen(false)}
          >
            Close comments
          </button>
          <CommentPanel key={`${selectedAssetId}/${selectedVersionId}`} />
        </div>
        {(railOpen || panelOpen) && (
          <button
            className="fp-panel-backdrop"
            aria-label="Close side panels"
            onClick={() => {
              setRailOpen(false);
              setPanelOpen(false);
            }}
          />
        )}
      </div>

      <VersionStrip
        onOpenCompare={() => setShowCompare(true)}
        onOpenDecision={() => setShowDecision(true)}
        onOpenUpload={() => setShowUpload(true)}
      />

      <div className="fp-demo-notice">
        {isDemo
          ? PROJECT_DESCRIPTION
          : "Private workspace. Decisions are tied to the exact image revision shown."}
      </div>

      {showCompare && <CompareView onClose={() => setShowCompare(false)} />}
      {showDecision && (
        <DecisionDialog onClose={() => setShowDecision(false)} />
      )}
      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} />}
      {showReset && (
        <ResetConfirm
          onConfirm={async () => {
            await resetDemo();
            setShowReset(false);
          }}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}
