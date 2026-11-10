"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const MAX_DIM = 2400;
const PREVIEW_MAX = 1000;

type Adjustments = { brightness: number; contrast: number; sharpness: number };

const DEFAULT_ADJ: Adjustments = { brightness: 0, contrast: 0, sharpness: 0 };

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function rotateCanvas(
  src: HTMLCanvasElement,
  deg: 90 | -90 | 180,
): HTMLCanvasElement {
  const quarter = deg === 90 || deg === -90;
  const out = makeCanvas(
    quarter ? src.height : src.width,
    quarter ? src.width : src.height,
  );
  const ctx = out.getContext("2d")!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

function flipCanvas(
  src: HTMLCanvasElement,
  horizontal: boolean,
): HTMLCanvasElement {
  const out = makeCanvas(src.width, src.height);
  const ctx = out.getContext("2d")!;
  ctx.translate(horizontal ? src.width : 0, horizontal ? 0 : src.height);
  ctx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
  ctx.drawImage(src, 0, 0);
  return out;
}

function cropCanvas(src: HTMLCanvasElement, r: CropRect): HTMLCanvasElement {
  const out = makeCanvas(r.w, r.h);
  out
    .getContext("2d")!
    .drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return out;
}

/** Downscaled copy used for orientation scoring. */
function smallCopy(src: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(src.width, src.height));
  const c = makeCanvas(src.width * scale, src.height * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function rotatedCopy(src: HTMLCanvasElement, deg: number): HTMLCanvasElement {
  const quarter = deg === 90 || deg === 270;
  const out = makeCanvas(
    quarter ? src.height : src.width,
    quarter ? src.width : src.height,
  );
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

/**
 * Upright ID cards produce strong horizontal bands (text lines), which shows up
 * as high variance in per-row edge energy. Rotated 90° the bands disappear.
 * Returns the rotation (0/90/180/270) most likely to be upright.
 */
function orientationScore(c: HTMLCanvasElement): number {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const rowEnergy = new Float32Array(c.height);
  for (let y = 0; y < c.height; y++) {
    let sum = 0;
    const row = y * c.width * 4;
    for (let x = 1; x < c.width; x++) {
      const i = row + x * 4;
      const j = i - 4;
      sum +=
        Math.abs(data[i] - data[j]) +
        Math.abs(data[i + 1] - data[j + 1]) +
        Math.abs(data[i + 2] - data[j + 2]);
    }
    rowEnergy[y] = sum / Math.max(1, c.width - 1);
  }
  let mean = 0;
  for (const v of rowEnergy) mean += v;
  mean /= rowEnergy.length;
  let variance = 0;
  for (const v of rowEnergy) variance += (v - mean) * (v - mean);
  return variance / rowEnergy.length;
}

function bestOrientation(src: HTMLCanvasElement): 0 | 90 | 180 | 270 {
  const thumb = smallCopy(src, 96);
  const angles = [0, 90, 180, 270] as const;
  let best: (typeof angles)[number] = 0;
  let bestScore = -1;
  for (const a of angles) {
    const score = orientationScore(rotatedCopy(thumb, a));
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

/** Unsharp-mask style sharpen. `amount` is roughly 0..1. */
function applySharpen(canvas: HTMLCanvasElement, amount: number) {
  if (amount <= 0) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const out = new Uint8ClampedArray(img.data);
  const a = amount;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const up = i - w * 4;
      const down = i + w * 4;
      const left = i - 4;
      const right = i + 4;
      for (let ch = 0; ch < 3; ch++) {
        out[i + ch] =
          src[i + ch] * (1 + 4 * a) -
          a * (src[left + ch] + src[right + ch] + src[up + ch] + src[down + ch]);
      }
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

function filterString(adj: Adjustments): string {
  const parts: string[] = [];
  if (adj.brightness !== 0)
    parts.push(`brightness(${1 + adj.brightness / 100})`);
  if (adj.contrast !== 0) parts.push(`contrast(${1 + adj.contrast / 100})`);
  return parts.length ? parts.join(" ") : "none";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the document image"));
    img.src = url;
  });
}

interface KycImageEditorProps {
  imageUrl: string;
  title?: string;
  onSave: (fileBase64: string, mimeType: "image/jpeg") => Promise<void> | void;
  onClose: () => void;
}

export function KycImageEditor({
  imageUrl,
  title,
  onSave,
  onClose,
}: KycImageEditorProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adj, setAdj] = useState<Adjustments>(DEFAULT_ADJ);
  const [version, setVersion] = useState(0); // bumped when base canvas changes
  const [cropMode, setCropMode] = useState(false);
  const [cropSel, setCropSel] = useState<CropRect | null>(null); // fractions 0..1
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setLoadError(null);
    (async () => {
      try {
        const img = await loadImage(imageUrl);
        if (cancelled) return;
        const scale = Math.min(
          1,
          MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const base = makeCanvas(
          img.naturalWidth * scale,
          img.naturalHeight * scale,
        );
        base.getContext("2d")!.drawImage(img, 0, 0, base.width, base.height);
        baseRef.current = base;
        setStatus("ready");
        setVersion((v) => v + 1);
      } catch (e) {
        if (cancelled) return;
        setLoadError(
          e instanceof Error
            ? e.message
            : "Could not load the image for editing.",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // ── Preview render ────────────────────────────────────────────────
  useEffect(() => {
    const base = baseRef.current;
    const pv = previewRef.current;
    if (!base || !pv || status !== "ready") return;

    const scale = Math.min(
      1,
      PREVIEW_MAX / Math.max(base.width, base.height),
    );
    pv.width = Math.max(1, Math.round(base.width * scale));
    pv.height = Math.max(1, Math.round(base.height * scale));
    const ctx = pv.getContext("2d")!;
    ctx.filter = filterString(adj);
    ctx.drawImage(base, 0, 0, pv.width, pv.height);
    ctx.filter = "none";
    if (adj.sharpness > 0) {
      applySharpen(pv, (adj.sharpness / 100) * 0.9);
    }
  }, [adj, version, status]);

  // ── Geometry ops ──────────────────────────────────────────────────
  const applyGeometry = useCallback((fn: (b: HTMLCanvasElement) => HTMLCanvasElement) => {
    const base = baseRef.current;
    if (!base) return;
    baseRef.current = fn(base);
    setCropSel(null);
    setCropMode(false);
    setVersion((v) => v + 1);
  }, []);

  const rotate = (deg: 90 | -90 | 180) =>
    applyGeometry((b) => rotateCanvas(b, deg));

  const flip = (horizontal: boolean) =>
    applyGeometry((b) => flipCanvas(b, horizontal));

  const autoOrient = () => {
    const base = baseRef.current;
    if (!base) return;
    const angle = bestOrientation(base);
    if (angle === 90) rotate(90);
    else if (angle === 180) rotate(180);
    else if (angle === 270) rotate(-90);
  };

  const applyCrop = () => {
    const base = baseRef.current;
    if (!base || !cropSel) return;
    const x = Math.round(cropSel.x * base.width);
    const y = Math.round(cropSel.y * base.height);
    const w = Math.round(cropSel.w * base.width);
    const h = Math.round(cropSel.h * base.height);
    if (w < 16 || h < 16) return;
    applyGeometry((b) =>
      cropCanvas(b, {
        x: Math.min(x, b.width - 1),
        y: Math.min(y, b.height - 1),
        w: Math.min(w, b.width - x),
        h: Math.min(h, b.height - y),
      }),
    );
  };

  const resetAll = () => {
    setAdj(DEFAULT_ADJ);
    // Reload the original image to undo baked geometry too.
    setStatus("loading");
    setVersion((v) => v + 1);
    (async () => {
      try {
        const img = await loadImage(imageUrl);
        const scale = Math.min(
          1,
          MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const base = makeCanvas(
          img.naturalWidth * scale,
          img.naturalHeight * scale,
        );
        base.getContext("2d")!.drawImage(img, 0, 0, base.width, base.height);
        baseRef.current = base;
        setCropSel(null);
        setCropMode(false);
        setStatus("ready");
        setVersion((v) => v + 1);
      } catch {
        setStatus("error");
        setLoadError("Could not reload the image.");
      }
    })();
  };

  // ── Crop pointer handling (fractions of displayed canvas) ─────────
  const pointFraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cropMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFraction(e);
    dragStart.current = p;
    setCropSel({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = dragStart.current;
    if (!cropMode || !start) return;
    const p = pointFraction(e);
    setCropSel({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStart.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // ── Export & save ─────────────────────────────────────────────────
  const handleSave = async () => {
    const base = baseRef.current;
    if (!base) return;
    setSaving(true);
    setSaveError(null);
    try {
      const out = makeCanvas(base.width, base.height);
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.filter = filterString(adj);
      ctx.drawImage(base, 0, 0);
      ctx.filter = "none";
      if (adj.sharpness > 0) {
        applySharpen(out, (adj.sharpness / 100) * 0.9);
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        out.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not render the edited image"));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () =>
              reject(new Error("Could not encode the edited image"));
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.92,
        );
      });
      await onSave(dataUrl, "image/jpeg");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Failed to save the edited image.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => rotate(-90)}
          title="Rotate 90° left"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => rotate(90)}
          title="Rotate 90° right"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => flip(true)}
          title="Flip horizontal"
        >
          <FlipHorizontal2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => flip(false)}
          title="Flip vertical"
        >
          <FlipVertical2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={autoOrient}
          title="Auto-orient: detect the upright card layout"
        >
          <Wand2 className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Auto-orient</span>
        </Button>
        <Button
          variant={cropMode ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setCropMode((m) => !m);
            setCropSel(null);
          }}
          title="Crop: drag a rectangle on the image"
        >
          <Crop className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Crop</span>
        </Button>
        {cropMode && cropSel && cropSel.w > 0.02 && cropSel.h > 0.02 && (
          <>
            <Button variant="default" size="sm" onClick={applyCrop}>
              Apply crop
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCropSel(null)}
            >
              Clear
            </Button>
          </>
        )}
        <div className="ml-auto" />
        <Button variant="ghost" size="sm" onClick={resetAll} title="Reset all edits">
          <Undo2 className="mr-1 h-4 w-4" />
          Reset
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} title="Close editor">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/40 p-4">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading image…
          </div>
        )}
        {status === "error" && (
          <div className="max-w-sm rounded-lg border border-danger/30 bg-danger/5 p-4 text-center text-sm text-danger">
            {loadError ?? "Could not load the image for editing."}
          </div>
        )}
        {status === "ready" && (
          <div className="relative inline-block max-w-full">
            <canvas
              ref={previewRef}
              className={cn(
                "max-h-[46vh] w-auto max-w-full rounded-md border border-border bg-white shadow-sm",
                cropMode ? "cursor-crosshair" : "cursor-default",
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
            {cropMode && cropSel && cropSel.w > 0.005 && cropSel.h > 0.005 && (
              <div
                className="pointer-events-none absolute border-2 border-brand-bronze bg-brand-bronze/10"
                style={{
                  left: `${cropSel.x * 100}%`,
                  top: `${cropSel.y * 100}%`,
                  width: `${cropSel.w * 100}%`,
                  height: `${cropSel.h * 100}%`,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Adjustments */}
      <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Brightness</span>
            <span className="text-muted-foreground">{adj.brightness}</span>
          </div>
          <Slider
            min={-100}
            max={100}
            step={1}
            value={[adj.brightness]}
            onValueChange={([v]) =>
              setAdj((a) => ({ ...a, brightness: v ?? 0 }))
            }
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Contrast</span>
            <span className="text-muted-foreground">{adj.contrast}</span>
          </div>
          <Slider
            min={-100}
            max={100}
            step={1}
            value={[adj.contrast]}
            onValueChange={([v]) => setAdj((a) => ({ ...a, contrast: v ?? 0 }))}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Sharpness</span>
            <span className="text-muted-foreground">{adj.sharpness}</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[adj.sharpness]}
            onValueChange={([v]) =>
              setAdj((a) => ({ ...a, sharpness: v ?? 0 }))
            }
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          {title ? `${title} — ` : ""}Edits are saved back to the document record.
        </p>
        {saveError && (
          <p className="text-xs text-danger">{saveError}</p>
        )}
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving || status !== "ready"}
        >
          {saving ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save edited image"}
        </Button>
      </div>
    </div>
  );
}
