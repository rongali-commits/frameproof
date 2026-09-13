import { useState, useRef, type ChangeEvent } from "react";
import { X, Upload, FileImage } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { validateImageFile, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/validation";

interface UploadDialogProps {
  onClose: () => void;
}

export function UploadDialog({ onClose }: UploadDialogProps) {
  const { assets, selectedAssetId, uploadVersion } = useReview();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState<"v1" | "v2">("v2");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const asset = assets.find((a) => a.id === selectedAssetId);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);
    const validation = validateImageFile(selected);
    if (!validation.ok) {
      setError(validation.error ?? "Invalid file.");
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(selected);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadVersion(file, targetVersion);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  };

  return (
    <div
      className="fp-overlay fp-overlay-modal"
      onClick={handleClose}
      role="dialog"
      aria-label="Upload new version"
    >
      <div className="fp-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fp-upload-header">
          <div>
            <h2 className="fp-upload-title">Upload new version</h2>
            <p className="fp-upload-sub">
              Replace a version with a local image. Demo only.
            </p>
          </div>
          <button
            className="fp-icon-btn"
            onClick={handleClose}
            aria-label="Close upload dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="fp-upload-demo-notice">
          <p>
            Demo data is stored on this device only. No real uploads are sent
            to any server. Uploaded images are stored in your browser's
            IndexedDB.
          </p>
        </div>

        <div className="fp-upload-target">
          <label className="fp-field-label">Replace version</label>
          <div className="fp-upload-target-options">
            {(["v1", "v2"] as const).map((tag) => (
              <button
                key={tag}
                className={`fp-upload-target-btn ${
                  targetVersion === tag ? "fp-upload-target-selected" : ""
                }`}
                onClick={() => setTargetVersion(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {asset && (
            <p className="fp-upload-target-hint">
              Will replace {asset.name} {targetVersion}.
            </p>
          )}
        </div>

        <div
          className="fp-upload-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped) {
              const fakeEvent = {
                target: { files: [dropped] },
              } as unknown as ChangeEvent<HTMLInputElement>;
              handleFileChange(fakeEvent);
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {preview ? (
            <div className="fp-upload-preview">
              <img src={preview} alt="Preview" />
              <div className="fp-upload-file-info">
                <FileImage size={14} />
                <span>{file?.name}</span>
                <span className="fp-upload-file-size">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
                </span>
              </div>
            </div>
          ) : (
            <div className="fp-upload-placeholder">
              <Upload size={28} strokeWidth={1.5} />
              <p>Click or drop an image here</p>
              <p className="fp-upload-formats">
                PNG, JPEG, or WebP. Max {MAX_IMAGE_SIZE / (1024 * 1024)} MB.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="fp-upload-error" role="alert">
            {error}
          </div>
        )}

        <div className="fp-upload-footer">
          <button
            className="fp-btn fp-btn-ghost"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="fp-btn fp-btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Upload version"}
          </button>
        </div>
      </div>
    </div>
  );
}
