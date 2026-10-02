'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  index?: number;
  total?: number;
  onCancel: () => void;
  onSave: (file: File) => void | Promise<void>;
};

const OUTPUT_SIZE = 1000;

/**
 * AI background removal → product on pure white → zoom/pan crop → JPEG upload.
 */
export default function ProductImageCropper({
  src,
  index = 1,
  total = 1,
  onCancel,
  onSave,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [saving, setSaving] = useState(false);
  const [vpSize, setVpSize] = useState(320);
  const [removing, setRemoving] = useState(true);
  const [progress, setProgress] = useState('Preparing…');
  const [error, setError] = useState('');

  // Run AI background removal when src changes
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function run() {
      setRemoving(true);
      setError('');
      setImg(null);
      setCutoutUrl(null);
      setProgress('Loading AI model (first time may take a minute)…');
      try {
        // Next/webpack interop: named export OR default function OR default.module
        const mod: Record<string, unknown> = await import('@imgly/background-removal');
        const maybeDefault = mod.default as unknown;
        const removeBackground = ([
          mod.removeBackground,
          maybeDefault,
          typeof maybeDefault === 'object' && maybeDefault !== null
            ? (maybeDefault as Record<string, unknown>).removeBackground
            : undefined,
        ].find((fn) => typeof fn === 'function') ?? null) as
          | ((image: string, config?: object) => Promise<Blob>)
          | null;

        if (!removeBackground) {
          throw new Error('Background removal library failed to load');
        }

        const blob = await removeBackground(src, {
          model: 'isnet_fp16',
          output: { format: 'image/png', type: 'foreground' },
          progress: (key: string, current: number, totalBytes: number) => {
            if (cancelled) return;
            if (totalBytes > 0) {
              const pct = Math.min(99, Math.round((current / totalBytes) * 100));
              setProgress(`Downloading model… ${pct}%`);
            } else {
              setProgress(`Processing… ${key}`);
            }
          },
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCutoutUrl(objectUrl);
        setProgress('Almost done…');
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Background removal failed. Try another photo or refresh.'
          );
          setRemoving(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  // Load cutout into Image for sizing / export
  useEffect(() => {
    if (!cutoutUrl) return;
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRemoving(false);
      setProgress('');
    };
    image.onerror = () => {
      setError('Could not load processed image');
      setRemoving(false);
    };
    image.src = cutoutUrl;
  }, [cutoutUrl]);

  useEffect(() => {
    function measure() {
      const el = viewportRef.current;
      if (!el) return;
      const w = Math.min(el.clientWidth, 420);
      setVpSize(Math.max(260, w));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [removing]);

  const baseScale = (() => {
    if (!img) return 1;
    // Fit inside square with a little padding so product isn't edge-to-edge
    return Math.min(vpSize / img.naturalWidth, vpSize / img.naturalHeight) * 0.92;
  })();

  const drawScale = baseScale * zoom;
  const drawW = img ? img.naturalWidth * drawScale : 0;
  const drawH = img ? img.naturalHeight * drawScale : 0;
  const left = (vpSize - drawW) / 2 + offset.x;
  const top = (vpSize - drawH) / 2 + offset.y;

  const onPointerDown = (e: React.PointerEvent) => {
    if (removing || !img) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const zoomBy = (delta: number) => {
    setZoom((z) => Math.min(4, Math.max(0.4, Math.round((z + delta) * 100) / 100)));
  };

  const exportCropped = useCallback(async () => {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Pure white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const scale = OUTPUT_SIZE / vpSize;
      ctx.drawImage(img, left * scale, top * scale, drawW * scale, drawH * scale);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/jpeg',
          0.92
        );
      });

      const file = new File([blob], `product-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onSave(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save crop');
    } finally {
      setSaving(false);
    }
  }, [img, vpSize, left, top, drawW, drawH, onSave]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl flex flex-col max-h-[100dvh]">
        <div className="sm:hidden flex justify-center pt-2">
          <span className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg">Edit product photo</h2>
            <p className="text-xs text-gray-500">
              Auto remove background · White BG · Photo {index}/{total}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-10 h-10 rounded-full hover:bg-gray-100 text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4 flex-1 overflow-y-auto">
          <div
            ref={viewportRef}
            className="mx-auto relative overflow-hidden rounded-xl border border-gray-200 touch-none select-none"
            style={{
              width: vpSize,
              height: vpSize,
              background: '#ffffff',
              cursor: removing ? 'wait' : dragging ? 'grabbing' : 'grab',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {removing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white px-4 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
                <p className="text-sm text-gray-600">{progress || 'Removing background…'}</p>
                <p className="text-xs text-gray-400">Hand / wall / extra objects will be removed</p>
              </div>
            ) : img && cutoutUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cutoutUrl}
                alt="Product cutout"
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{ width: drawW, height: drawH, left, top }}
              />
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-red-600">
                {error}
              </div>
            ) : null}
            {!removing && !error ? (
              <div className="absolute inset-0 pointer-events-none border-2 border-primary-500/40 rounded-xl" />
            ) : null}
          </div>

          {error ? (
            <p className="text-center text-xs text-red-500 mt-2">{error}</p>
          ) : (
            <p className="text-center text-xs text-gray-500 mt-2">
              {removing ? 'Please wait…' : 'Drag to move · Zoom below · Then Save'}
            </p>
          )}

          <div className={`mt-4 flex items-center gap-3 ${removing || error ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              type="button"
              onClick={() => zoomBy(-0.15)}
              className="w-11 h-11 shrink-0 border rounded-xl text-xl font-medium hover:bg-gray-50"
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={0.4}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-primary-600"
            />
            <button
              type="button"
              onClick={() => zoomBy(0.15)}
              className="w-11 h-11 shrink-0 border rounded-xl text-xl font-medium hover:bg-gray-50"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-1">{Math.round(zoom * 100)}%</p>
        </div>

        <div className="border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="py-3 border rounded-xl text-base"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={exportCropped}
            disabled={saving || removing || !img || !!error}
            className="py-3 bg-primary-600 text-white rounded-xl text-base disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
