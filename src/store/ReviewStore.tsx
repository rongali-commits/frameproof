import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  Asset,
  Comment,
  DecisionRecord,
  DecisionStatus,
  Pin,
  Reply,
} from "@/types";
import { ASSETS, DEMO_COMMENTS, DEMO_DECISIONS } from "@/demoData";
import { loadState, saveState, clearState } from "@/lib/storage";
import { clearAllBlobs, putBlob, getBlobURL } from "@/lib/idb";
import { validateImageFile } from "@/lib/validation";

interface ReviewContextValue {
  assets: Asset[];
  selectedAssetId: string;
  selectedVersionId: string;
  comments: Comment[];
  decisions: DecisionRecord[];
  selectedCommentId: string | null;
  selectAsset: (assetId: string) => void;
  selectVersion: (versionId: string) => void;
  selectComment: (commentId: string | null) => void;
  addComment: (pin: Pin, body: string) => void;
  addReply: (commentId: string, body: string) => void;
  toggleResolved: (commentId: string) => void;
  setDecision: (status: DecisionStatus, note: string) => void;
  uploadVersion: (file: File, replaceVersionTag: "v1" | "v2") => Promise<void>;
  resetDemo: () => Promise<void>;
  versionBlobURLs: Record<string, string>;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<Comment[]>(DEMO_COMMENTS);
  const [decisions, setDecisions] =
    useState<DecisionRecord[]>(DEMO_DECISIONS);
  const [selectedAssetId, setSelectedAssetId] = useState(ASSETS[0].id);
  const [selectedVersionId, setSelectedVersionId] = useState(
    ASSETS[0].versions[0].id
  );
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );
  const [versionBlobURLs, setVersionBlobURLs] = useState<Record<string, string>>(
    {}
  );
  const loaded = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    const stored = loadState();
    if (stored) {
      setComments(stored.comments);
      setDecisions(stored.decisions);
    }
    loaded.current = true;
  }, []);

  // Persist on changes (after initial load)
  useEffect(() => {
    if (!loaded.current) return;
    saveState({ comments, decisions, customVersionBlobs: {} });
  }, [comments, decisions]);

  // Restore blob URLs from IndexedDB for uploaded versions
  useEffect(() => {
    const customVersions = ASSETS.flatMap((a) => a.versions).filter(
      (v) => v.isUploaded && v.blobId
    );
    customVersions.forEach(async (v) => {
      if (v.blobId && !versionBlobURLs[v.id]) {
        const url = await getBlobURL(v.blobId);
        if (url) {
          setVersionBlobURLs((prev) => ({ ...prev, [v.id]: url }));
        }
      }
    });
  }, [versionBlobURLs]);

  const selectAsset = useCallback((assetId: string) => {
    const asset = ASSETS.find((a) => a.id === assetId);
    if (asset) {
      setSelectedAssetId(assetId);
      setSelectedVersionId(asset.versions[0].id);
      setSelectedCommentId(null);
    }
  }, []);

  const selectVersion = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
    setSelectedCommentId(null);
  }, []);

  const selectComment = useCallback((commentId: string | null) => {
    setSelectedCommentId(commentId);
  }, []);

  const addComment = useCallback(
    (pin: Pin, body: string) => {
      const newComment: Comment = {
        id: uid("c"),
        assetId: selectedAssetId,
        versionId: selectedVersionId,
        pin: { ...pin, id: uid("p") },
        author: "You",
        body,
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: [],
      };
      setComments((prev) => [...prev, newComment]);
    },
    [selectedAssetId, selectedVersionId]
  );

  const addReply = useCallback((commentId: string, body: string) => {
    const reply: Reply = {
      id: uid("r"),
      author: "You",
      body,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    );
  }, []);

  const toggleResolved = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      )
    );
  }, []);

  const setDecision = useCallback(
    (status: DecisionStatus, note: string) => {
      const record: DecisionRecord = {
        id: uid("d"),
        assetId: selectedAssetId,
        versionId: selectedVersionId,
        status,
        reviewer: "You",
        note,
        createdAt: new Date().toISOString(),
      };
      setDecisions((prev) => [...prev, record]);
    },
    [selectedAssetId, selectedVersionId]
  );

  const uploadVersion = useCallback(
    async (file: File, replaceVersionTag: "v1" | "v2") => {
      const validation = validateImageFile(file);
      if (!validation.ok) {
        throw new Error(validation.error);
      }
      const asset = ASSETS.find((a) => a.id === selectedAssetId);
      if (!asset) return;
      const targetVersion = asset.versions.find(
        (v) => v.version === replaceVersionTag
      );
      if (!targetVersion) return;

      const blobId = uid("blob");
      await putBlob(blobId, file);

      const url = URL.createObjectURL(file);
      setVersionBlobURLs((prev) => ({ ...prev, [targetVersion.id]: url }));

      // Store blob ID mapping in a custom version entry via state
      // We add a decision-like record noting the upload
      const record: DecisionRecord = {
        id: uid("d"),
        assetId: selectedAssetId,
        versionId: targetVersion.id,
        status: "pending",
        reviewer: "System",
        note: `Uploaded replacement ${replaceVersionTag}: ${file.name}`,
        createdAt: new Date().toISOString(),
      };
      setDecisions((prev) => [...prev, record]);
    },
    [selectedAssetId]
  );

  const resetDemo = useCallback(async () => {
    clearState();
    await clearAllBlobs();
    setComments(DEMO_COMMENTS);
    setDecisions(DEMO_DECISIONS);
    setSelectedAssetId(ASSETS[0].id);
    setSelectedVersionId(ASSETS[0].versions[0].id);
    setSelectedCommentId(null);
    setVersionBlobURLs({});
  }, []);

  const value = useMemo<ReviewContextValue>(
    () => ({
      assets: ASSETS,
      selectedAssetId,
      selectedVersionId,
      comments,
      decisions,
      selectedCommentId,
      selectAsset,
      selectVersion,
      selectComment,
      addComment,
      addReply,
      toggleResolved,
      setDecision,
      uploadVersion,
      resetDemo,
      versionBlobURLs,
    }),
    [
      selectedAssetId,
      selectedVersionId,
      comments,
      decisions,
      selectedCommentId,
      selectAsset,
      selectVersion,
      selectComment,
      addComment,
      addReply,
      toggleResolved,
      setDecision,
      uploadVersion,
      resetDemo,
      versionBlobURLs,
    ]
  );

  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  );
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview must be used within ReviewProvider");
  return ctx;
}
