"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NIA_FRAME_HEIGHT,
  NIA_FRAME_WIDTH,
  canvasToNiaDataUrl,
  prepareNiaSelfie,
} from "@/lib/kyc-image-processing";

type Phase = "starting" | "live" | "review" | "blocked";

interface NiaCameraCaptureProps {
  /** Called with the 640x480 PNG/JPEG data URL that should be submitted. */
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
 * Live camera canvas for the NIA face check.
 *
 * The previous flow opened the OS file picker with `capture="user"` — on
 * desktop that silently does nothing, so the face check never produced an NIA
 * response. This draws the front camera into a 640x480 canvas (the exact frame
 * that is sent) with an oval guide, and falls back to the phone camera or a
 * photo when getUserMedia is unavailable, refused or blocked on an insecure
 * origin.
 */
export function NiaCameraCapture({
  onCapture,
  onClose,
  busy = false,
  error,
}: NiaCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [shot, setShot] = useState<{ dataUrl: string; bytes: number } | null>(
    null,
  );
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

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera has not produced a frame yet. Try again.");
      return;
    }
    setProcessing(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = NIA_FRAME_WIDTH;
      canvas.height = NIA_FRAME_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This browser cannot process the photo.");
      // Cover-crop: the face fills the 4:3 frame without letterboxing, exactly
      // like the mobile canvas.
      const scale = Math.max(
        NIA_FRAME_WIDTH / video.videoWidth,
        NIA_FRAME_HEIGHT / video.videoHeight,
      );
      const drawWidth = video.videoWidth * scale;
      const drawHeight = video.videoHeight * scale;
      ctx.drawImage(
        video,
        (NIA_FRAME_WIDTH - drawWidth) / 2,
        (NIA_FRAME_HEIGHT - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      setShot(canvasToNiaDataUrl(canvas));
      setPhase("review");
      stopStream();
    } catch (err) {
      setCameraError(describeCameraError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = async (file: File) => {
    setProcessing(true);
    setCameraError(null);
    try {
      const result = await prepareNiaSelfie(file);
      setShot(result);
      setPhase("review");
      stopStream();
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "That photo could not be used.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    setShot(null);
    void startCamera(facing);
  };

  const close = () => {
    stopStream();
    onClose();
  };

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
                  const next = facing === "user" ? "environment" : "user";
                  setFacing(next);
                  void startCamera(next);
                }}
                className="rounded-md p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                title="Switch camera"
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

        <div className="relative mx-4 aspect-[3/4] overflow-hidden rounded-xl bg-black">
          {phase === "live" && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
              {/* The oval mirrors the 4:3 centre crop the API sends to NIA. */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="aspect-[4/5] w-[68%] rounded-[50%] border-[3px] border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              </div>
              <p className="absolute inset-x-4 top-3 text-center text-xs font-semibold text-white/90">
                Centre your face inside the oval
              </p>
              <p className="absolute inset-x-4 bottom-3 text-center text-[11px] leading-relaxed text-white/70">
                Good light on your face · no hat, mask or sunglasses · look
                straight at the camera
              </p>
            </>
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

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>

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
                onClick={retake}
                disabled={busy}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
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
