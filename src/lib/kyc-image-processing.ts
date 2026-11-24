export interface ProcessImageOptions {
  maxLongEdge: number;
  targetLandscape: boolean;
  grayscale?: boolean;
  quality?: number;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Client-side image normalization for KYC uploads:
 * - corrects orientation to landscape/portrait as needed
 * - resizes so the longest edge is at most `maxLongEdge`
 * - applies light contrast/brightness enhancement
 * - outputs a JPEG for consistent handling on the backend
 *
 * PDFs are returned unchanged. On any failure the original file is returned so
 * the upload is not blocked by image-processing edge cases.
 */
export async function processImageFile(
  file: File,
  options: ProcessImageOptions,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/heic" || file.type === "image/heif") return file;

  try {
    const image = await loadImage(file);
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const isLandscape = width >= height;
    const needsRotate = options.targetLandscape ? !isLandscape : isLandscape;

    const rotateCanvas = document.createElement("canvas");
    const rctx = rotateCanvas.getContext("2d");
    if (!rctx) return file;

    if (needsRotate) {
      rotateCanvas.width = height;
      rotateCanvas.height = width;
      rctx.translate(height / 2, width / 2);
      rctx.rotate(options.targetLandscape ? Math.PI / 2 : -Math.PI / 2);
      rctx.drawImage(image, -width / 2, -height / 2);
    } else {
      rotateCanvas.width = width;
      rotateCanvas.height = height;
      rctx.drawImage(image, 0, 0);
    }

    const rotatedWidth = needsRotate ? height : width;
    const rotatedHeight = needsRotate ? width : height;

    const scale = Math.min(
      1,
      options.maxLongEdge / Math.max(rotatedWidth, rotatedHeight),
    );
    const finalWidth = Math.round(rotatedWidth * scale);
    const finalHeight = Math.round(rotatedHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    if (options.grayscale) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalWidth, finalHeight);
    }

    const filters: string[] = [];
    if (options.grayscale) filters.push("grayscale(100%)");
    filters.push("contrast(1.15)", "brightness(1.05)");
    ctx.filter = filters.join(" ");

    ctx.drawImage(rotateCanvas, 0, 0, finalWidth, finalHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          const name = file.name.replace(/\.[^/.]+$/, "") || "image";
          resolve(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        options.quality ?? 0.85,
      );
    });
  } catch {
    return file;
  }
}

export function normalizeIdDocument(file: File): Promise<File> {
  return processImageFile(file, { maxLongEdge: 1600, targetLandscape: true });
}

export function normalizePassportPhoto(file: File): Promise<File> {
  return processImageFile(file, { maxLongEdge: 1200, targetLandscape: false });
}

export function normalizeSignatureImage(file: File): Promise<File> {
  return processImageFile(file, {
    maxLongEdge: 1200,
    targetLandscape: true,
    grayscale: true,
    quality: 0.9,
  });
}

/** NIA refuses selfies above 1 MB and asks for a 640x480 crop. */
export const NIA_MAX_SELFIE_BYTES = 1024 * 1024;
export const NIA_FRAME_WIDTH = 640;
export const NIA_FRAME_HEIGHT = 480;

/** Byte size of a base64 data URL, without allocating a decoded copy. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Encodes an already 640x480 canvas for NIA: PNG first, JPEG if that exceeds
 * the 1 MB ceiling. Used by the live camera, where the frame never exists as a
 * File.
 */
export function canvasToNiaDataUrl(canvas: HTMLCanvasElement): {
  dataUrl: string;
  bytes: number;
} {
  let dataUrl = canvas.toDataURL("image/png");
  let bytes = dataUrlBytes(dataUrl);
  if (bytes > NIA_MAX_SELFIE_BYTES) {
    dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    bytes = dataUrlBytes(dataUrl);
  }
  if (bytes > NIA_MAX_SELFIE_BYTES) {
    throw new Error(
      "The selfie is still above 1 MB after resizing. Move to better lighting and retake it.",
    );
  }
  return { dataUrl, bytes };
}

/**
 * Prepares a live selfie for the NIA face check without asking the investor:
 * the widest 4:3 crop, scaled to 640x480. The camera screen calls the crop
 * helpers below directly instead, so the investor frames the shot.
 */
export async function prepareNiaSelfie(
  file: File,
): Promise<{ dataUrl: string; bytes: number }> {
  const source = await niaSourceFromFile(file);
  return niaCropToDataUrl(source, initialNiaCrop(source.width, source.height));
}

/** NIA compares 4:3 frames, so every crop is 4:3. */
export const NIA_FRAME_ASPECT = NIA_FRAME_WIDTH / NIA_FRAME_HEIGHT;

/** How far above the middle a portrait frame starts, as on mobile. */
const NIA_PORTRAIT_CROP_BIAS = 0.35;

/** The photo being framed: pixels plus their size, in source px. */
export interface NiaSource {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface NiaCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The widest 4:3 crop the source allows, nudged up for a portrait photo: a
 * selfie puts the face above the middle, and a centred crop took the forehead
 * off before this existed.
 */
export function initialNiaCrop(width: number, height: number): NiaCrop {
  let cropWidth = width;
  let cropHeight = cropWidth / NIA_FRAME_ASPECT;
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = cropHeight * NIA_FRAME_ASPECT;
  }
  return {
    x: (width - cropWidth) / 2,
    y: (height - cropHeight) * NIA_PORTRAIT_CROP_BIAS,
    width: cropWidth,
    height: cropHeight,
  };
}

/** Forces a dragged or zoomed crop back to 4:3 and inside the source. */
export function clampNiaCrop(
  crop: NiaCrop,
  width: number,
  height: number,
): NiaCrop {
  let w = Math.min(Math.max(crop.width, 32), width);
  let h = w / NIA_FRAME_ASPECT;
  if (h > height) {
    h = height;
    w = h * NIA_FRAME_ASPECT;
  }
  return {
    x: Math.min(Math.max(crop.x, 0), width - w),
    y: Math.min(Math.max(crop.y, 0), height - h),
    width: w,
    height: h,
  };
}

/**
 * Copies any drawable frame (video, image) into an offscreen canvas, capped at
 * 1600 px on the long edge: enough detail to crop a sharp 640x480 from, small
 * enough to keep in memory while dragging.
 */
export function niaSourceFromDrawable(
  drawable: CanvasImageSource,
  width: number,
  height: number,
): NiaSource {
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image processing is not supported in this browser.");
  }
  ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);
  return { canvas, width: canvas.width, height: canvas.height };
}

export function niaSourceFromVideo(video: HTMLVideoElement): NiaSource {
  return niaSourceFromDrawable(video, video.videoWidth, video.videoHeight);
}

export async function niaSourceFromFile(file: File): Promise<NiaSource> {
  const image = await loadImage(file);
  return niaSourceFromDrawable(
    image,
    image.naturalWidth,
    image.naturalHeight,
  );
}

/**
 * Encodes exactly the region the investor framed: no second crop, so what the
 * editor shows is what NIA compares.
 */
export function niaCropToDataUrl(
  source: NiaSource,
  crop: NiaCrop,
): { dataUrl: string; bytes: number } {
  const safe = clampNiaCrop(crop, source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = NIA_FRAME_WIDTH;
  canvas.height = NIA_FRAME_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image processing is not supported in this browser.");
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source.canvas,
    safe.x,
    safe.y,
    safe.width,
    safe.height,
    0,
    0,
    NIA_FRAME_WIDTH,
    NIA_FRAME_HEIGHT,
  );
  return canvasToNiaDataUrl(canvas);
}
