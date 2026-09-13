import { useRef, useState, useCallback, type MouseEvent } from "react";
import { X } from "lucide-react";
import { useReview } from "@/store/ReviewStore";

interface CompareViewProps {
  onClose: () => void;
}

export function CompareView({ onClose }: CompareViewProps) {
  const { assets, selectedAssetId, versionBlobURLs } = useReview();
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const asset = assets.find((a) => a.id === selectedAssetId);
  if (!asset) return null;

  const v1 = asset.versions[0];
  const v2 = asset.versions[1];
  if (!v1 || !v2) return null;

  const v1Src = versionBlobURLs[v1.id] ?? v1.src;
  const v2Src = versionBlobURLs[v2.id] ?? v2.src;

  const updateSlider = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const handleMouseDown = (e: MouseEvent) => {
    isDragging.current = true;
    updateSlider(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) updateSlider(e.clientX);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      className="fp-overlay fp-overlay-modal"
      onClick={onClose}
      role="dialog"
      aria-label="Compare versions"
    >
      <div
        className="fp-compare-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fp-compare-header">
          <div>
            <h2 className="fp-compare-title">Compare versions</h2>
            <p className="fp-compare-sub">{asset.name}</p>
          </div>
          <button
            className="fp-icon-btn"
            onClick={onClose}
            aria-label="Close compare view"
          >
            <X size={20} />
          </button>
        </div>

        <div className="fp-compare-modes">
          <div className="fp-compare-slider-wrap">
            <div className="fp-compare-labels">
              <span className="fp-compare-label-left">{v1.label}</span>
              <span className="fp-compare-label-right">{v2.label}</span>
            </div>
            <div
              ref={containerRef}
              className="fp-compare-slider"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={v2Src}
                alt={`${asset.name} ${v2.label}`}
                className="fp-compare-img fp-compare-bottom"
                draggable={false}
              />
              <div
                className="fp-compare-top-wrap"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={v1Src}
                  alt={`${asset.name} ${v1.label}`}
                  className="fp-compare-img fp-compare-top"
                  style={{ width: containerRef.current?.clientWidth ?? 0 }}
                  draggable={false}
                />
              </div>
              <div
                className="fp-compare-handle"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="fp-compare-handle-line" />
                <div className="fp-compare-handle-grip">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2L2 6L4 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 2L10 6L8 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <p className="fp-compare-hint">
              Drag the handle to compare. Left side shows {v1.label}, right side shows {v2.label}.
            </p>
          </div>

          <div className="fp-compare-side-by-side">
            <div className="fp-compare-side">
              <span className="fp-compare-side-label">{v1.label}</span>
              <div className="fp-compare-side-img">
                <img src={v1Src} alt={`${asset.name} ${v1.label}`} draggable={false} />
              </div>
            </div>
            <div className="fp-compare-side">
              <span className="fp-compare-side-label">{v2.label}</span>
              <div className="fp-compare-side-img">
                <img src={v2Src} alt={`${asset.name} ${v2.label}`} draggable={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
