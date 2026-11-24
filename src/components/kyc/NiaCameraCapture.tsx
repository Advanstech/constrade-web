"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Camera,
  Check,
  Crop,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Smartphone,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  NIA_FRAME_ASPECT,
  NIA_FRAME_HEIGHT,
  NIA_FRAME_WIDTH,
  NIA_SMALL_SOURCE_WIDTH,
  clampNiaCrop,
  initialNiaCrop,
  niaCropToDataUrl,
  niaSourceFromFile,
  niaSourceFromVideo,
  type NiaCrop,
  type NiaSource,
} from "@/lib/kyc-image-processing";

type Phase = "starting" | "live" | "adjust" | "review" | "blocked";

interface NiaCameraCaptureProps {
  /** Called with the 700x900 (35:45) PNG/JPEG data URL that should be submitted. */
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Set while the API is checking the captured frame. */
  busy?: boolean;
  error?: string | null;
}

function describeCameraError(error: unknown): string {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera access is blocked. Allow the camera for this site in your browser, or use one of the options below.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No camera was found on this device. Use one of the options below.";
      case "NotReadableError":
        return "The camera is being used by another app. Close it, or use one of the options below.";
      default:
        return error.message || "The camera could not start.";
    }
  }
  return error instanceof Error ? error.message : "The camera could not start.";
}

/**
 * Live camera, crop, review for the NIA face check.
 *
 * The frame that reaches NIA used to be a blind centre crop of the video, and on
 * a phone that cut the face off at the forehead. The camera now captures the
 * full sensor frame, then the investor drags and zooms it behind a 4:3 window
 * that is exactly what NIA receives. The rear camera is offered for someone
 * else taking the photo. Falls back to the phone camera or a photo when
 * getUserMedia is unavailable, refused or blocked on an insecure origin.
 */
export function NiaCameraCapture({
  onCapture,
  onClose,
  busy = false,
  error,
}: NiaCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [shot, setShot] = useState<{
    dataUrl: string;
    bytes: number;
    /** The crop came from a region too small to stay sharp at 700x900. */
    smallSource: boolean;
  } | null>(null);

  /// The captured photo being framed, and the region of it that is sent.
  const [source, setSource] = useState<NiaSource | null>(null);
  const [crop, setCrop] = useState<NiaCrop | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomMax, setZoomMax] = useState(4);
  const baseCropWidth = useRef(1);
  const drag = useRef<{ x: number; y: number; crop: NiaCrop } | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      stopStream();
      setCameraError(null);
      setPhase("starting");
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setPhase("blocked");
        setCameraError(
          "This browser cannot open a camera on this page. Use your phone camera or choose a photo.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stopStream();
          return;
        }
        video.srcObject = stream;
        await video.play().catch(() => {
          // Autoplay can be refused until the user interacts; the preview still
          // appears once the element renders, and capture reads the frame.
        });
        setPhase("live");
      } catch (err) {
        stopStream();
        setPhase("blocked");
        setCameraError(describeCameraError(err));
      }
    },
    [stopStream],
  );

  useEffect(() => {
    void startCamera(facing);
    return () => stopStream();
    // `facing` is applied by startCamera on flip; re-running on change would
    // restart the camera twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Hands the captured photo to the crop editor and releases the camera. */
  const openAdjuster = useCallback(
    (next: NiaSource) => {
      const initial = initialNiaCrop(next.width, next.height);
      baseCropWidth.current = initial.width;
      setSource(next);
      setCrop(initial);
      setZoom(1);
      // Stop at roughly 350 px of crop width: below that the 700 px frame is
      // upscaled and the comparison loses detail.
      setZoomMax(Math.min(4, Math.max(1, initial.width / 350)));
      setShot(null);
      setPhase("adjust");
      stopStream();
    },
    [stopStream],
  );

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera has not produced a frame yet. Try again.");
      return;
    }
    setCameraError(null);
    try {
      // The full sensor frame, not the cropped preview: the editor needs the
      // surrounding pixels so the investor can zoom back out.
      openAdjuster(niaSourceFromVideo(video));
    } catch (err) {
      setCameraError(describeCameraError(err));
    }
  };

  const handleFile = async (file: File) => {
    setProcessing(true);
    setCameraError(null);
    try {
      openAdjuster(await niaSourceFromFile(file));
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "That photo could not be used.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const applyZoom = (value: number) => {
    if (!source || !crop) return;
    const clamped = Math.min(Math.max(value, 1), zoomMax);
    const wanted = Math.min(
      baseCropWidth.current,
      Math.max(32, baseCropWidth.current / clamped),
    );
    const height = wanted / NIA_FRAME_ASPECT;
    setZoom(clamped);
    setCrop(
      clampNiaCrop(
        {
          x: crop.x + (crop.width - wanted) / 2,
          y: crop.y + (crop.height - height) / 2,
          width: wanted,
          height,
        },
        source.width,
        source.height,
      ),
    );
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!crop) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, crop };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || !source) return;
    const viewWidth = frameRef.current?.getBoundingClientRect().width ?? 0;
    if (viewWidth <= 0) return;
    // The window shows `viewWidth` px for `start.crop.width` source px, so
    // dragging the photo right moves the crop window left.
    const scale = start.crop.width / viewWidth;
    setCrop(
      clampNiaCrop(
        {
          ...start.crop,
          x: start.crop.x - (event.clientX - start.x) * scale,
          y: start.crop.y - (event.clientY - start.y) * scale,
        },
        source.width,
        source.height,
      ),
    );
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const confirmCrop = async () => {
    if (!source || !crop) return;
    setProcessing(true);
    setCameraError(null);
    // Two frames so the spinner and the overlay paint before the encode blocks
    // the main thread — without them Continue looked dead for a moment.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    try {
      const next = niaCropToDataUrl(source, crop);
      setShot({
        ...next,
        smallSource:
          clampNiaCrop(crop, source.width, source.height).width <
          NIA_SMALL_SOURCE_WIDTH,
      });
      setPhase("review");
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "That crop could not be prepared.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    setShot(null);
    setSource(null);
    setCrop(null);
    setZoom(1);
    drag.current = null;
    void startCamera(facing);
  };

  const adjustAgain = () => {
    if (!source) return;
    setShot(null);
    setPhase("adjust");
  };

  const close = () => {
    stopStream();
    onClose();
  };

  /** One JPEG of the photo for the preview; the sent frame is re-drawn from the
   * canvas so the preview's own encoding never reaches NIA. */
  const sourceUrl = useMemo(
    () => source?.canvas.toDataURL("image/jpeg", 0.92) ?? null,
    [source],
  );

  /**
   * `background-size`/`background-position` show exactly `crop` of the photo: a
   * percentage position aligns the same fraction of the image and of the box,
   * so `crop.x / (width - crop.width)` pans to the right pixel without measuring
   * the element.
   */
  const adjustBackground = useMemo((): CSSProperties | undefined => {
    if (!source || !crop || !sourceUrl) return undefined;
    const spanX = source.width - crop.width;
    const spanY = source.height - crop.height;
    return {
      backgroundImage: `url(${sourceUrl})`,
      backgroundSize: `${(source.width / crop.width) * 100}% ${
        (source.height / crop.height) * 100
      }%`,
      backgroundPosition: `${
        spanX > 0 ? (crop.x / spanX) * 100 : 0
      }% ${spanY > 0 ? (crop.y / spanY) * 100 : 0}%`,
      backgroundRepeat: "no-repeat",
    };
  }, [source, crop, sourceUrl]);

  const rearCamera = facing === "environment";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verification selfie camera"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12] text-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand-bronze" />
            <p className="text-sm font-semibold">Verification selfie</p>
          </div>
          <div className="flex items-center gap-1">
            {phase === "live" && (
              <button
                type="button"
                onClick={() => {
                  const next = rearCamera ? "user" : "environment";
                  setFacing(next);
                  void startCamera(next);
                }}
                className="rounded-md p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                title={
                  rearCamera ? "Use the front camera" : "Use the rear camera"
                }
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="rounded-md p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* One portrait window for every step that shows a frame: the live
            preview, the editor and the review are all the 35:45 (700x900)
            passport photo NIA receives. Height-driven so a short laptop window
            still fits the buttons. */}
        <div
          className={cn(
            "relative mx-auto overflow-hidden rounded-xl bg-black",
            phase === "blocked" && "w-[calc(100%-2rem)] aspect-[4/5]",
          )}
          style={
            phase === "blocked"
              ? undefined
              : {
                  height: "min(54vh, 500px)",
                  width: `calc(min(54vh, 500px) * ${NIA_FRAME_ASPECT})`,
                }
          }
        >
          {phase === "live" && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[72%] aspect-[4/5] rounded-[50%] border-[3px] border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              </div>
              <p className="absolute inset-x-4 top-3 text-center text-xs font-semibold text-white/90">
                {rearCamera
                  ? "Ask someone to take the photo — head inside the oval"
                  : "Head inside the oval — chin low, hairline high"}
              </p>
              <p className="absolute inset-x-4 bottom-3 text-center text-[11px] leading-relaxed text-white/70">
                Good light on your face · no hat, mask or sunglasses · look
                straight at the camera
              </p>
            </>
          )}

          {phase === "adjust" && source && crop && (
            <div
              ref={frameRef}
              className="relative h-full w-full cursor-move touch-none select-none"
              style={adjustBackground}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[72%] aspect-[4/5] rounded-[50%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
              </div>
              <p className="pointer-events-none absolute inset-x-3 top-2 text-center text-[11px] font-semibold text-white/90">
                This frame is exactly what NIA will compare
              </p>
              <p className="pointer-events-none absolute inset-x-3 bottom-2 text-center text-[11px] text-white/70">
                Drag to move · slide to zoom
              </p>
            </div>
          )}

          {phase === "adjust" && processing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60 text-white/85">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs font-semibold">
                Preparing your passport-size crop…
              </p>
            </div>
          )}

          {phase === "starting" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Starting the camera…</p>
            </div>
          )}

          {phase === "review" && shot && (
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shot.dataUrl}
                alt="Captured verification selfie"
                className="h-full w-full object-contain"
              />
              <p className="absolute inset-x-3 bottom-2 rounded-md bg-black/60 px-2 py-1 text-center text-[11px] text-white/80">
                Exactly what NIA will compare — {NIA_FRAME_WIDTH}×
                {NIA_FRAME_HEIGHT}, {Math.round(shot.bytes / 1024)} KB
              </p>
            </div>
          )}

          {phase === "blocked" && (
            <div className="flex h-full flex-col items-start justify-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <Camera className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">
                The in-app camera is not available
              </p>
              <p className="text-xs leading-relaxed text-white/70">
                {cameraError ??
                  "The camera could not start on this device or browser."}
              </p>
              <div className="mt-1 grid w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  disabled={processing}
                  onClick={() => phoneInputRef.current?.click()}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Open the phone camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  disabled={processing}
                  onClick={() => libraryInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Choose a photo instead
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  disabled={processing}
                  onClick={() => void startCamera(facing)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try the camera again
                </Button>
              </div>
            </div>
          )}
        </div>

        {phase === "adjust" && (
          <div className="mx-4 mt-3 flex items-center gap-3 text-white/70">
            <ZoomOut className="h-4 w-4 shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={zoomMax}
              step={0.01}
              onValueChange={([value]) => applyZoom(value)}
              disabled={zoomMax <= 1.001}
              aria-label="Zoom"
              className="[&>span]:bg-white/20 [&>span>span:first-child]:bg-brand-bronze [&_[role=slider]]:border-white [&_[role=slider]]:bg-white"
            />
            <ZoomIn className="h-4 w-4 shrink-0" />
          </div>
        )}

        {phase === "review" && shot?.smallSource && (
          <p className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            This crop came from a small part of the photo, so it is upscaled. If
            NIA cannot match it, retake it closer with the live camera.
          </p>
        )}

        {(cameraError || error) && phase !== "blocked" && (
          <p className="mx-4 mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error ?? cameraError}
          </p>
        )}

        <div className="flex items-center gap-3 p-4">
          {phase === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={adjustAgain}
                disabled={busy}
              >
                <Crop className="mr-2 h-4 w-4" />
                Adjust
              </Button>
              <Button
                type="button"
                className="flex-1 bg-brand-bronze text-white hover:bg-brand-bronze-dark"
                onClick={() => shot && onCapture(shot.dataUrl)}
                disabled={busy || !shot}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking with NIA…
                  </>
                ) : (
                  "Use this photo"
                )}
              </Button>
            </>
          ) : phase === "adjust" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={retake}
                disabled={processing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                type="button"
                className="flex-1 bg-brand-bronze text-white hover:bg-brand-bronze-dark"
                onClick={confirmCrop}
                disabled={processing || !crop}
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className={cn(
                "h-14 w-full bg-brand-bronze text-white hover:bg-brand-bronze-dark",
                phase === "blocked" && "opacity-50",
              )}
              onClick={capture}
              disabled={phase !== "live" || processing}
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Take the photo
                </>
              )}
            </Button>
          )}
        </div>

        <input
          ref={phoneInputRef}
          type="file"
          accept="image/png,image/jpeg"
          capture="user"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
