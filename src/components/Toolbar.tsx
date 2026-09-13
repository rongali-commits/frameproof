import { Layers, RotateCcw, Check, MessageSquare } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { PROJECT_NAME, PROJECT_SUBTITLE } from "@/demoData";

interface ToolbarProps {
  onReset: () => void;
}

export function Toolbar({ onReset }: ToolbarProps) {
  const { comments, decisions, selectedAssetId, selectedVersionId } =
    useReview();

  const assetComments = comments.filter(
    (c) => c.assetId === selectedAssetId && c.versionId === selectedVersionId
  );
  const openCount = assetComments.filter((c) => !c.resolved).length;
  const assetDecisions = decisions.filter(
    (d) => d.assetId === selectedAssetId && d.versionId === selectedVersionId
  );

  return (
    <header className="fp-toolbar">
      <div className="fp-toolbar-left">
        <div className="fp-logo">
          <Layers size={18} strokeWidth={2.2} />
          <span className="fp-logo-text">FrameProof</span>
        </div>
        <div className="fp-toolbar-divider" />
        <div className="fp-project-info">
          <div className="fp-project-name">
            {PROJECT_NAME} / {PROJECT_SUBTITLE}
          </div>
          <div className="fp-project-tag">Demo project</div>
        </div>
      </div>
      <div className="fp-toolbar-right">
        <div className="fp-stat">
          <MessageSquare size={14} strokeWidth={2} />
          <span>{openCount} open</span>
        </div>
        <div className="fp-stat">
          <Check size={14} strokeWidth={2} />
          <span>{assetDecisions.length} decisions</span>
        </div>
        <button
          className="fp-btn fp-btn-ghost"
          onClick={onReset}
          aria-label="Reset demo data"
        >
          <RotateCcw size={14} strokeWidth={2} />
          <span>Reset demo</span>
        </button>
      </div>
    </header>
  );
}
