import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { cropFrameToRectJpegBlob } from '../utils/cropFrameToRectBlob';
import { uploadImageKitBlob } from '../utils/imagekitUploadBlob';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Max rectangle of aspect aw:ah that fits inside dw × dh */
function maxFrameInDisplay(dw: number, dh: number, aw: number, ah: number) {
  const A = aw / ah;
  let fw = Math.min(dw, dh * A);
  let fh = fw / A;
  if (fh > dh) {
    fh = dh;
    fw = fh * A;
  }
  return { fw, fh };
}

export interface AboutCropEditorProps {
  sourceUrl: string;
  /** Crop frame aspect width : height (e.g. 4 and 3 → 4:3) */
  aspectW: number;
  aspectH: number;
  folder: string;
  tags?: string[];
  /** Long edge in pixels for exported JPEG */
  outputLongEdge: number;
  /** Crop work area size (matches how much room the image has on screen) */
  containerClassName?: string;
  onComplete: (finalUrl: string) => void;
  onCancel: () => void;
  onError?: (message: string) => void;
}

/**
 * Movable rectangular crop + zoom (same interaction model as Profile Settings).
 */
const AboutCropEditor: React.FC<AboutCropEditorProps> = ({
  sourceUrl,
  aspectW,
  aspectH,
  folder,
  tags = ['about-site', 'cropped'],
  outputLongEdge,
  containerClassName = 'h-80 w-full max-w-3xl',
  onComplete,
  onCancel,
  onError,
}) => {
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [displayRect, setDisplayRect] = useState<{
    offX: number;
    offY: number;
    dw: number;
    dh: number;
  } | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [frameLeft, setFrameLeft] = useState(0);
  const [frameTop, setFrameTop] = useState(0);
  const frameDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const frameInitRef = useRef(false);
  const prevDisplaySizeRef = useRef<{ dw: number; dh: number } | null>(null);

  const aspect = aspectW / aspectH;

  const measureDisplayedImage = useCallback(() => {
    const container = cropContainerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scale = Math.min(cw / nw, ch / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const offX = (cw - dw) / 2;
    const offY = (ch - dh) / 2;
    setDisplayRect({ offX, offY, dw, dh });
  }, []);

  const placeMaxFrame = useCallback(
    (rect: { offX: number; offY: number; dw: number; dh: number }) => {
      const { fw, fh } = maxFrameInDisplay(rect.dw, rect.dh, aspectW, aspectH);
      setFrameWidth(fw);
      setFrameHeight(fh);
      setFrameLeft(rect.offX + (rect.dw - fw) / 2);
      setFrameTop(rect.offY + (rect.dh - fh) / 2);
    },
    [aspectW, aspectH]
  );

  useEffect(() => {
    setDisplayRect(null);
    frameInitRef.current = false;
    prevDisplaySizeRef.current = null;
  }, [sourceUrl]);

  /** Re-fit max frame when the letterboxed image size changes (e.g. window resize). */
  useEffect(() => {
    if (!displayRect) return;
    const prev = prevDisplaySizeRef.current;
    if (prev && (prev.dw !== displayRect.dw || prev.dh !== displayRect.dh)) {
      frameInitRef.current = false;
    }
    prevDisplaySizeRef.current = { dw: displayRect.dw, dh: displayRect.dh };
  }, [displayRect]);

  useEffect(() => {
    if (!displayRect || frameInitRef.current) return;
    placeMaxFrame(displayRect);
    frameInitRef.current = true;
  }, [displayRect, placeMaxFrame]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = frameDragRef.current;
      const rect = displayRect;
      if (!d || !rect) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      const { offX, offY, dw, dh } = rect;
      let fl = d.startLeft + dx;
      let ft = d.startTop + dy;
      fl = clamp(fl, offX, offX + dw - frameWidth);
      ft = clamp(ft, offY, offY + dh - frameHeight);
      setFrameLeft(fl);
      setFrameTop(ft);
    };
    const onUp = () => {
      frameDragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [displayRect, frameWidth, frameHeight]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const d = frameDragRef.current;
      const rect = displayRect;
      if (!d || !rect) return;
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - d.startClientX;
      const dy = t.clientY - d.startClientY;
      const { offX, offY, dw, dh } = rect;
      let fl = d.startLeft + dx;
      let ft = d.startTop + dy;
      fl = clamp(fl, offX, offX + dw - frameWidth);
      ft = clamp(ft, offY, offY + dh - frameHeight);
      setFrameLeft(fl);
      setFrameTop(ft);
    };
    const onTouchEnd = () => {
      frameDragRef.current = null;
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [displayRect, frameWidth, frameHeight]);

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureDisplayedImage());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureDisplayedImage, sourceUrl]);

  const onFrameMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    frameDragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: frameLeft,
      startTop: frameTop,
    };
  };

  const onFrameTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    frameDragRef.current = {
      startClientX: t.clientX,
      startClientY: t.clientY,
      startLeft: frameLeft,
      startTop: frameTop,
    };
  };

  const adjustZoom = (delta: number) => {
    const rect = displayRect;
    if (!rect) return;
    const { offX, offY, dw, dh } = rect;
    const { fw: maxFw, fh: maxFh } = maxFrameInDisplay(dw, dh, aspectW, aspectH);
    const cx = frameLeft + frameWidth / 2;
    const cy = frameTop + frameHeight / 2;
    let nfw = frameWidth * (1 + delta);
    let nfh = nfw / aspect;
    const minW = Math.max(40, maxFw * 0.08);
    nfw = clamp(nfw, minW, maxFw);
    nfh = nfw / aspect;
    if (nfh > maxFh) {
      nfh = maxFh;
      nfw = nfh * aspect;
    }
    let fl = cx - nfw / 2;
    let ft = cy - nfh / 2;
    fl = clamp(fl, offX, offX + dw - nfw);
    ft = clamp(ft, offY, offY + dh - nfh);
    setFrameWidth(nfw);
    setFrameHeight(nfh);
    setFrameLeft(fl);
    setFrameTop(ft);
  };

  const handleConfirm = async () => {
    if (!displayRect || frameWidth <= 0 || frameHeight <= 0) return;
    setConfirming(true);
    try {
      const outW =
        aspect >= 1 ? outputLongEdge : Math.round(outputLongEdge * aspect);
      const outH =
        aspect >= 1 ? Math.round(outputLongEdge / aspect) : outputLongEdge;
      const blob = await cropFrameToRectJpegBlob(
        sourceUrl,
        displayRect,
        frameLeft,
        frameTop,
        frameWidth,
        frameHeight,
        outW,
        outH
      );
      const fileName = `about-${Date.now()}.jpg`;
      const { url } = await uploadImageKitBlob(blob, fileName, { folder, tags });
      onComplete(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onError?.(msg);
      if (!onError) window.alert(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <p className="text-sm text-gray-800 font-medium">Adjust crop (drag frame, use + / − to zoom)</p>
      <div
        ref={cropContainerRef}
        className={`relative rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 mx-auto ${containerClassName}`}
      >
        <img
          ref={imgRef}
          src={sourceUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          onLoad={measureDisplayedImage}
        />
        {displayRect && frameWidth > 0 && (
          <div
            className="absolute z-20 touch-none"
            style={{
              left: frameLeft,
              top: frameTop,
              width: frameWidth,
              height: frameHeight,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              cursor: 'move',
            }}
            onMouseDown={onFrameMouseDown}
            onTouchStart={onFrameTouchStart}
          >
            <div className="absolute inset-0 border-2 border-white rounded-sm pointer-events-none shadow-md" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => adjustZoom(0.1)}
          disabled={!displayRect || confirming}
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 disabled:opacity-40"
        >
          <Minus className="w-4 h-4 inline" /> Zoom out
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(-0.1)}
          disabled={!displayRect || confirming}
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 disabled:opacity-40"
        >
          <Plus className="w-4 h-4 inline" /> Zoom in
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!displayRect || confirming}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
          {confirming ? 'Uploading…' : 'Confirm crop'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="px-4 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AboutCropEditor;
