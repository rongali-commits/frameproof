import { useState } from "react";
import { Download, Copy, X } from "lucide-react";
import { useReview } from "@/store/ReviewContext";
import { useDialog } from "@/lib/useDialog";
import { createReviewRecord, downloadReviewRecord } from "@/lib/exportRecord";

export function ExportRecordButton() {
  const review = useReview();
  const [json, setJson] = useState<string | null>(null);
  return (
    <>
      <button
        className="fp-btn"
        onClick={() =>
          setJson(
            JSON.stringify(
              createReviewRecord(review, review.projectName),
              null,
              2,
            ),
          )
        }
      >
        <Download size={14} />
        Export record
      </button>
      {json !== null && (
        <ExportDialog json={json} close={() => setJson(null)} />
      )}
    </>
  );
}

function ExportDialog({ json, close }: { json: string; close: () => void }) {
  const ref = useDialog(close);
  const [notice, setNotice] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setNotice("Review record copied.");
    } catch {
      setNotice(
        "Select the record below and copy it manually. Your browser has blocked clipboard access.",
      );
    }
  };
  return (
    <div className="fp-overlay fp-overlay-modal">
      <div
        className="fp-tool-dialog fp-export-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        tabIndex={-1}
      >
        <header>
          <h2 id="export-title">Your review record</h2>
          <button
            className="fp-icon-btn"
            onClick={close}
            aria-label="Close export"
          >
            <X size={18} />
          </button>
        </header>
        <p>
          A snapshot of artwork versions, comments and decisions. Temporary
          image-access URLs are excluded. This is not a legal signature.
        </p>
        <div className="fp-export-actions">
          <button
            className="fp-btn fp-btn-primary"
            onClick={() => {
              downloadReviewRecord(json);
              setNotice(
                "Download requested. If your browser blocks it, use Copy record below.",
              );
            }}
          >
            <Download size={15} />
            Download JSON
          </button>
          <button className="fp-btn" onClick={copy}>
            <Copy size={15} />
            Copy record
          </button>
        </div>
        {notice && (
          <p className="fp-form-notice" role="status">
            {notice}
          </p>
        )}
        <label className="fp-export-label">
          Record preview
          <textarea
            readOnly
            value={json}
            onFocus={(e) => e.currentTarget.select()}
            spellCheck={false}
          />
        </label>
      </div>
    </div>
  );
}
