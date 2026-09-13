import {
  useRef,
  useState,
  useCallback,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import { Plus, MessageSquare } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { normalizePin, pinToPercent } from "@/lib/pinMath";
import type { Pin } from "@/types";

export function ReviewCanvas() {
  const {
    assets,
    selectedAssetId,
    selectedVersionId,
    comments,
    selectedCommentId,
    selectComment,
    addComment,
    versionBlobURLs,
  } = useReview();

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [addingPin, setAddingPin] = useState<{
    x: number;
    y: number;
    pin: Pin;
  } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const asset = assets.find((a) => a.id === selectedAssetId);
  const version = asset?.versions.find((v) => v.id === selectedVersionId);

  const versionComments = comments.filter(
    (c) =>
      c.assetId === selectedAssetId && c.versionId === selectedVersionId
  );

  const handleImageClick = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      if (addingPin) return;
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const pin = normalizePin(rawX, rawY, rect.width, rect.height);
      setAddingPin({ x: rawX, y: rawY, pin });
      setCommentText("");
    },
    [addingPin]
  );

  const handleSubmitComment = useCallback(() => {
    if (!addingPin || !commentText.trim()) return;
    addComment(addingPin.pin, commentText.trim());
    setAddingPin(null);
    setCommentText("");
  }, [addingPin, commentText, addComment]);

  const handleCancelPin = useCallback(() => {
    setAddingPin(null);
    setCommentText("");
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitComment();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelPin();
    }
  };

  if (!asset || !version) {
    return (
      <div className="fp-canvas-empty">
        <MessageSquare size={32} strokeWidth={1.5} />
        <p>Select an asset to begin reviewing.</p>
      </div>
    );
  }

  const displaySrc = versionBlobURLs[version.id] ?? version.src;

  return (
    <div className="fp-canvas-area" ref={containerRef}>
      <div className="fp-canvas-frame">
        {!imageLoaded && !imageError && (
          <div className="fp-canvas-loading">
            <div className="fp-spinner" />
            <span>Loading artwork</span>
          </div>
        )}
        {imageError && (
          <div className="fp-canvas-error">
            <p>Could not load this artwork.</p>
            <button
              className="fp-btn fp-btn-ghost"
              onClick={() => {
                setImageError(false);
                setImageLoaded(false);
              }}
            >
              Try again
            </button>
          </div>
        )}
        <div className="fp-canvas-image-wrap">
          <img
            ref={imgRef}
            src={displaySrc}
            alt={`${asset.name} ${version.label}`}
            className={`fp-canvas-image ${imageLoaded ? "fp-img-loaded" : ""}`}
            onClick={handleImageClick}
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
            }}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
            tabIndex={0}
            role="button"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAddingPin({ x: 0, y: 0, pin: { id: "draft", x: 0.5, y: 0.5 } }); } }}
            aria-label={`${asset.name}, ${version.label}. Click to add a comment pin.`}
          />
          {imageLoaded &&
            versionComments.map((comment, idx) => {
              const pos = pinToPercent(comment.pin);
              const isSelected = comment.id === selectedCommentId;
              return (
                <button
                  key={comment.id}
                  className={`fp-pin ${isSelected ? "fp-pin-selected" : ""} ${
                    comment.resolved ? "fp-pin-resolved" : ""
                  }`}
                  style={{ left: pos.left, top: pos.top }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectComment(
                      isSelected ? null : comment.id
                    );
                  }}
                  aria-label={`Comment ${idx + 1}: ${comment.body.slice(0, 50)}`}
                >
                  <span className="fp-pin-number">{idx + 1}</span>
                </button>
              );
            })}
          {addingPin && (
            <div
              className="fp-pin fp-pin-new"
              style={{
                left: `${(addingPin.pin.x * 100).toFixed(2)}%`,
                top: `${(addingPin.pin.y * 100).toFixed(2)}%`,
              }}
            >
              <Plus size={14} strokeWidth={3} />
            </div>
          )}
        </div>
      </div>

      {addingPin && (
        <div className="fp-pin-composer" role="dialog" aria-label="New comment">
          <div className="fp-pin-composer-header">
            <strong>New comment</strong>
            <button
              className="fp-icon-btn"
              onClick={handleCancelPin}
              aria-label="Cancel comment"
            >
              <Plus size={16} className="fp-rotate-45" />
            </button>
          </div>
          <textarea
            autoFocus
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your comment..."
            rows={3}
            maxLength={4000}
            aria-label="New pinned comment"
            className="fp-textarea"
          />
          <div className="fp-pin-composer-actions">
            <span className="fp-pin-hint">
              Click to place. Cmd+Enter to post. Esc to cancel.
            </span>
            <button
              className="fp-btn fp-btn-primary"
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
            >
              Post comment
            </button>
          </div>
        </div>
      )}

      <div className="fp-canvas-hint">
        <Plus size={12} strokeWidth={2.5} />
        <span>Click anywhere on the artwork to pin a comment</span>
      </div>
    </div>
  );
}
