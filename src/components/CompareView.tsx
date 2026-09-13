import { useState } from "react";
import { X } from "lucide-react";
import { useReview } from "@/store/ReviewStore";
import { useDialog } from "@/lib/useDialog";
export function CompareView({ onClose }: { onClose: () => void }) {
  const { assets, selectedAssetId, versionBlobURLs } = useReview();
  const asset = assets.find(a => a.id === selectedAssetId);
  const [left, setLeft] = useState(asset?.versions.at(-2)?.id ?? "");
  const [right, setRight] = useState(asset?.versions.at(-1)?.id ?? "");
  const [slider, setSlider] = useState(50);
  const ref = useDialog(onClose);
  const v1 = asset?.versions.find(v => v.id === left);
  const v2 = asset?.versions.find(v => v.id === right);
  if (!asset || !v1 || !v2) return null;
  const src1 = versionBlobURLs[v1.id] || v1.src, src2 = versionBlobURLs[v2.id] || v2.src;
  return <div className="fp-overlay fp-overlay-modal">
    <div className="fp-compare-modal" role="dialog" aria-modal="true" aria-label="Compare versions" ref={ref} tabIndex={-1}>
      <header className="fp-compare-header"><div><h2 className="fp-compare-title">See exactly what changed.</h2><p className="fp-compare-sub">{asset.name}</p></div><button className="fp-icon-btn" aria-label="Close compare view" onClick={onClose}><X size={20}/></button></header>
      <div className="fp-compare-selectors"><label>Before<select aria-label="Before version" value={left} onChange={e => setLeft(e.target.value)}>{asset.versions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label><label>After<select aria-label="After version" value={right} onChange={e => setRight(e.target.value)}>{asset.versions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label></div>
      <div className="fp-compare-modes">
        <div className="fp-compare-slider-wrap"><div className="fp-comparison-stage"><img src={src2} alt={`After: ${v2.label}`} /><img src={src1} alt={`Before: ${v1.label}`} style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }} /><div className="fp-comparison-divider" style={{ left: `${slider}%` }}/><input type="range" min="0" max="100" value={slider} onChange={e => setSlider(Number(e.target.value))} aria-label="Before and after comparison position" /></div><p className="fp-compare-hint">Drag to reveal. Arrow keys also work. Each complete image is fitted without cropping.</p></div>
        <div className="fp-compare-side-by-side">{[v1, v2].map((v, i) => <div className="fp-compare-side" key={i}><span className="fp-compare-side-label">{i ? "After" : "Before"} / {v.label}</span><div className="fp-compare-side-img"><img src={versionBlobURLs[v.id] || v.src} alt={`${asset.name} ${v.label} side by side`} /></div></div>)}</div>
      </div>
    </div>
  </div>;
}
