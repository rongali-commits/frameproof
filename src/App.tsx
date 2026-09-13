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

function Workspace() {
  const { resetDemo } = useReview();
  const [railOpen, setRailOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="fp-app">
      <Toolbar onReset={() => setShowReset(true)} />

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
          <ReviewCanvas />
        </main>

        <CommentPanel />

        <div className={`fp-panel-mobile ${panelOpen ? "fp-panel-mobile-open" : ""}`}>
          <CommentPanel />
        </div>
      </div>

      <VersionStrip
        onOpenCompare={() => setShowCompare(true)}
        onOpenDecision={() => setShowDecision(true)}
        onOpenUpload={() => setShowUpload(true)}
      />

      <div className="fp-demo-notice">
        {PROJECT_DESCRIPTION}
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
