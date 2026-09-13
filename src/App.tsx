import { useState } from "react";
import { Menu, PanelRightOpen } from "lucide-react";
import { ReviewProvider, useReview } from "@/store/ReviewStore";
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

export function Workspace() {
  const { resetDemo, selectedAssetId, selectedVersionId, isDemo, error, dismissError, busy } = useReview();
  const [railOpen, setRailOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="fp-app">
      <Toolbar onReset={() => setShowReset(true)} />
      {error && <div className="fp-error-banner" role="alert">{error}<button onClick={dismissError}>Dismiss</button></div>}
      {busy && <div className="fp-save-notice" role="status">Saving changes...</div>}

      <div className="fp-workspace">
        <div className="fp-mobile-bar">
          <button
            className="fp-icon-btn fp-mobile-toggle"
            onClick={() => setRailOpen(!railOpen)}
            aria-label="Toggle asset list"
          >
            <Menu size={18} />
          </button>
          <span className="fp-mobile-bar-title">Assets</span>
          <button
            className="fp-icon-btn fp-mobile-toggle"
            onClick={() => setPanelOpen(!panelOpen)}
            aria-label="Toggle comments"
          >
            <PanelRightOpen size={18} />
          </button>
        </div>

        <AssetRail open={railOpen} onClose={() => setRailOpen(false)} />

        <main className="fp-main">
          <ReviewCanvas key={`${selectedAssetId}/${selectedVersionId}`} />
        </main>

        <div className={`fp-comments-region ${panelOpen ? "is-open" : ""}`}>
          <button className="fp-mobile-close fp-btn" onClick={() => setPanelOpen(false)}>Close comments</button>
          <CommentPanel key={`${selectedAssetId}/${selectedVersionId}`} />
        </div>
        {(railOpen || panelOpen) && <button className="fp-panel-backdrop" aria-label="Close side panels" onClick={() => { setRailOpen(false); setPanelOpen(false); }} />}
      </div>

      <VersionStrip
        onOpenCompare={() => setShowCompare(true)}
        onOpenDecision={() => setShowDecision(true)}
        onOpenUpload={() => setShowUpload(true)}
      />

      <div className="fp-demo-notice">
        {isDemo ? PROJECT_DESCRIPTION : "Private workspace. Decisions are tied to the exact image revision shown."}
      </div>

      {showCompare && <CompareView onClose={() => setShowCompare(false)} />}
      {showDecision && (
        <DecisionDialog onClose={() => setShowDecision(false)} />
      )}
      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} />}
      {showReset && (
        <ResetConfirm
          onConfirm={() => {
            resetDemo();
            setShowReset(false);
          }}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReviewProvider>
      <Workspace />
    </ReviewProvider>
  );
}
