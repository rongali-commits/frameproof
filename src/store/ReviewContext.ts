import { createContext, useContext } from "react";
import type {
  Asset,
  Comment,
  DecisionRecord,
  DecisionStatus,
  Pin,
} from "@/types";

export interface ReviewContextValue {
  assets: Asset[];
  selectedAssetId: string;
  selectedVersionId: string;
  comments: Comment[];
  decisions: DecisionRecord[];
  selectedCommentId: string | null;
  selectAsset: (id: string) => void;
  selectVersion: (id: string) => void;
  selectComment: (id: string | null) => void;
  addComment: (pin: Pin, body: string) => void | Promise<void>;
  addReply: (id: string, body: string) => void | Promise<void>;
  toggleResolved: (id: string) => void | Promise<void>;
  setDecision: (status: DecisionStatus, note: string) => void | Promise<void>;
  uploadVersion: (file: File) => Promise<void>;
  resetDemo: () => Promise<void>;
  versionBlobURLs: Record<string, string>;
  isDemo: boolean;
  canEdit: boolean;
  canResolve: boolean;
  projectName: string;
  error: string | null;
  dismissError: () => void;
  busy: boolean;
}

export const ReviewContext = createContext<ReviewContextValue | null>(null);

export function useReview() {
  const value = useContext(ReviewContext);
  if (!value) throw new Error("ReviewProvider is required.");
  return value;
}
