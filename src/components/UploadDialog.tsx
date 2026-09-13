import { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { inspectImage } from "@/lib/validation";
import { useDialog } from "@/lib/useDialog";
export function UploadDialog({ onClose }: { onClose: () => void }) {
  const { uploadVersion, isDemo, assets, selectedAssetId } = useReview();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useDialog(() => { if (!busy) onClose(); });
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  async function select(file?: File) { if (!file) return; setError(""); try { await inspectImage(file); setFile(file); } catch (e) { setFile(null); setError((e as Error).message); } }
  async function upload() { if (!file) return; setBusy(true); try { await uploadVersion(file); onClose(); } catch (e) { setError((e as Error).message); setBusy(false); } }
  return <div className="fp-overlay fp-overlay-modal" role="presentation">
    <div className="fp-upload-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="upload-title" tabIndex={-1}>
      <div className="fp-upload-header"><div><h2 id="upload-title" className="fp-upload-title">Add a new revision</h2><p className="fp-upload-sub">{assets.find(a => a.id === selectedAssetId)?.name}. Earlier versions stay unchanged.</p></div><button className="fp-icon-btn" onClick={onClose} disabled={busy} aria-label="Close upload dialog"><X size={20} /></button></div>
      <p className="fp-upload-demo-notice">{isDemo ? "Demo: this image stays in your browser on this device." : "Stored privately for this project and its authorized reviewers."} Every new revision starts pending.</p>
      <div className="fp-upload-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) void select(e.dataTransfer.files[0]); }}>
        <Upload size={24}/><label className="fp-field-label" htmlFor="revision-file">Choose a PNG, JPEG or WebP image</label><input id="revision-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => void select(e.target.files?.[0])} />
        <p className="fp-upload-formats">Up to 10 MB. Maximum 40 megapixels.</p>
        {preview && <div className="fp-upload-preview"><img src={preview} alt="New revision preview" /><p>{file?.name}</p></div>}
      </div>
      {error && <p className="fp-upload-error" role="alert">{error}</p>}
      <div className="fp-upload-footer"><button className="fp-btn fp-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="fp-btn fp-btn-primary" disabled={!file || busy} onClick={() => void upload()}>{busy ? "Saving revision..." : "Save new revision"}</button></div>
    </div>
  </div>;
}
