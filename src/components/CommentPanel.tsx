import { useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  CircleDot,
  RotateCcw,
  CornerDownRight,
  Send,
  Inbox,
} from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { formatRelativeTime } from "@/lib/format";

export function CommentPanel() {
  const {
    comments,
    selectedAssetId,
    selectedVersionId,
    selectedCommentId,
    selectComment,
    addReply,
    toggleResolved,
  } = useReview();

  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const versionComments = comments
    .filter(
      (c) =>
        c.assetId === selectedAssetId && c.versionId === selectedVersionId
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const handleReply = (commentId: string) => {
    const text = replyText[commentId]?.trim();
    if (!text) return;
    addReply(commentId, text);
    setReplyText((prev) => ({ ...prev, [commentId]: "" }));
  };

  return (
    <aside className="fp-comment-panel" aria-label="Comments">
      <div className="fp-panel-header">
        <MessageSquare size={16} strokeWidth={2} />
        <span className="fp-panel-title">Comments</span>
        <span className="fp-panel-count">{versionComments.length}</span>
      </div>

      {versionComments.length === 0 ? (
        <div className="fp-panel-empty">
          <Inbox size={28} strokeWidth={1.5} />
          <p>No comments on this version yet.</p>
          <p className="fp-panel-empty-hint">
            Click the artwork to pin the first comment.
          </p>
        </div>
      ) : (
        <div className="fp-comment-list">
          {versionComments.map((comment, idx) => {
            const isSelected = comment.id === selectedCommentId;
            return (
              <div
                key={comment.id}
                className={`fp-comment-thread ${isSelected ? "fp-comment-selected" : ""} ${
                  comment.resolved ? "fp-comment-resolved" : ""
                }`}
                onClick={() => selectComment(isSelected ? null : comment.id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectComment(isSelected ? null : comment.id);
                  }
                }}
                aria-label={`Comment ${idx + 1} by ${comment.author}`}
              >
                <div className="fp-comment-header">
                  <span className="fp-comment-pin-num">{idx + 1}</span>
                  <span className="fp-comment-author">{comment.author}</span>
                  <span className="fp-comment-time">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                  {comment.resolved && (
                    <span className="fp-badge fp-badge-resolved">
                      <CheckCircle2 size={11} /> Resolved
                    </span>
                  )}
                </div>
                <p className="fp-comment-body">{comment.body}</p>

                {comment.replies.length > 0 && (
                  <div className="fp-replies">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="fp-reply">
                        <CornerDownRight
                          size={12}
                          className="fp-reply-icon"
                        />
                        <div className="fp-reply-content">
                          <div className="fp-reply-meta">
                            <span className="fp-reply-author">
                              {reply.author}
                            </span>
                            <span className="fp-reply-time">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="fp-reply-body">{reply.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="fp-reply-input">
                  <input
                    type="text"
                    value={replyText[comment.id] ?? ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({
                        ...prev,
                        [comment.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleReply(comment.id);
                      }
                    }}
                    placeholder="Reply..."
                    className="fp-reply-input-field"
                    aria-label={`Reply to comment by ${comment.author}`}
                  />
                  <button
                    className="fp-icon-btn fp-send-btn"
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyText[comment.id]?.trim()}
                    aria-label="Send reply"
                  >
                    <Send size={14} />
                  </button>
                </div>

                <button
                  className="fp-btn fp-btn-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleResolved(comment.id);
                  }}
                >
                  {comment.resolved ? (
                    <>
                      <RotateCcw size={12} /> Reopen
                    </>
                  ) : (
                    <>
                      <CircleDot size={12} /> Resolve
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
