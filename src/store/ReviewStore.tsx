import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Asset, Comment, DecisionRecord, DecisionStatus, Pin, DemoState } from "@/types";
import { ASSETS, DEMO_COMMENTS, DEMO_DECISIONS } from "@/demoData";
import { loadState, saveState, clearState } from "@/lib/storage";
import { clearAllBlobs, putBlob, getBlobURL } from "@/lib/idb";
import { inspectImage } from "@/lib/validation";
import { appendRevision } from "@/lib/revisions";

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
const initial = (): DemoState => loadState() ?? { schemaVersion: 2, assets: ASSETS, comments: DEMO_COMMENTS, decisions: DEMO_DECISIONS, customVersionBlobs: {} };
export const newId = () => crypto.randomUUID();
const text = (value: string) => value.trim().slice(0, 2000);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [selectedAssetId, setAsset] = useState(state.assets[0]?.id ?? "");
  const [selectedVersionId, setVersion] = useState(state.assets[0]?.versions.at(-1)?.id ?? "");
  const [selectedCommentId, selectComment] = useState<string | null>(null);
  const [versionBlobURLs, setURLs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const uploading = useRef(false);

  useEffect(() => { try { saveState(state); } catch (e) { setError(String(e)); } }, [state]);
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    Promise.all(state.assets.flatMap(a => a.versions).filter(v => v.blobId).map(async v => {
      const url = await getBlobURL(v.blobId!);
      if (url) created.push(url);
      return [v.id, url] as const;
    })).then(entries => {
      if (cancelled) { created.forEach(URL.revokeObjectURL); return; }
      setURLs(Object.fromEntries(entries.filter((e): e is readonly [string, string] => !!e[1])));
    }).catch(() => { if (!cancelled) setError("Uploaded demo images could not be restored. Check browser storage permissions."); });
    return () => { cancelled = true; created.forEach(URL.revokeObjectURL); };
  }, [state.assets]);

  const selectAsset = (id: string) => {
    const asset = state.assets.find(a => a.id === id);
    if (!asset) return;
    setAsset(id); setVersion(asset.versions.at(-1)?.id ?? ""); selectComment(null);
  };
  const selectVersion = (id: string) => {
    if (!state.assets.find(a => a.id === selectedAssetId)?.versions.some(v => v.id === id)) return;
    setVersion(id); selectComment(null);
  };
  const addComment = (pin: Pin, body: string) => {
    if (!text(body)) return;
    setState(s => ({ ...s, comments: [...s.comments, { id: newId(), assetId: selectedAssetId, versionId: selectedVersionId, pin: { ...pin, id: newId() }, author: "You (demo)", body: text(body), createdAt: new Date().toISOString(), resolved: false, replies: [] }] }));
  };
  const addReply = (id: string, body: string) => {
    if (!text(body)) return;
    setState(s => ({ ...s, comments: s.comments.map(c => c.id === id ? { ...c, replies: [...c.replies, { id: newId(), author: "You (demo)", body: text(body), createdAt: new Date().toISOString() }] } : c) }));
  };
  const toggleResolved = (id: string) => setState(s => ({ ...s, comments: s.comments.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c) }));
  const setDecision = (status: DecisionStatus, note: string) => setState(s => ({ ...s, decisions: [...s.decisions, { id: newId(), assetId: selectedAssetId, versionId: selectedVersionId, status, reviewer: "You (demo)", note: text(note), createdAt: new Date().toISOString() }] }));
  const uploadVersion = async (file: File) => {
    if (uploading.current) throw new Error("An upload is already in progress.");
    uploading.current = true;
    try {
      await inspectImage(file);
      const id = newId();
      await putBlob(id, file);
      setState(s => ({ ...s, assets: s.assets.map(a => a.id === selectedAssetId ? appendRevision(a, { id, blobId: id, src: "", uploadedAt: new Date().toISOString(), isUploaded: true }) : a) }));
      setVersion(id); selectComment(null);
    } finally { uploading.current = false; }
  };
  const resetDemo = useCallback(async () => {
    await clearAllBlobs(); clearState();
    setState({ schemaVersion: 2, assets: ASSETS, comments: DEMO_COMMENTS, decisions: DEMO_DECISIONS, customVersionBlobs: {} });
    setAsset(ASSETS[0].id); setVersion(ASSETS[0].versions.at(-1)!.id); selectComment(null); setError(null);
  }, []);
  return <ReviewContext.Provider value={{ ...state, selectedAssetId, selectedVersionId, selectedCommentId, selectAsset, selectVersion, selectComment, addComment, addReply, toggleResolved, setDecision, uploadVersion, resetDemo, versionBlobURLs, isDemo: true, canEdit: true, canResolve: true, projectName: "Aster Studio / Spring identity", error, dismissError: () => setError(null), busy: false }}>{children}</ReviewContext.Provider>;
}

export function useReview() {
  const value = useContext(ReviewContext);
  if (!value) throw new Error("ReviewProvider is required.");
  return value;
}
