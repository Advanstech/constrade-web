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
 * Prepares a live selfie for the NIA face check: centre-crops to 4:3, scales
 * to 640x480 and returns a base64 data URL within NIA's 1 MB ceiling.
 *
 * PNG is preferred because that is what NIA documents; if the crop exceeds
 * 1 MB the same pixels are re-encoded as JPEG.
 */
export async function prepareNiaSelfie(
  file: File,
): Promise<{ dataUrl: string; bytes: number }> {
  const image = await loadImage(file);
  const targetWidth = NIA_FRAME_WIDTH;
  const targetHeight = NIA_FRAME_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image processing is not supported in this browser.");
  }

  // Cover-crop so the face fills the 4:3 frame without letterboxing.
  const scale = Math.max(
    targetWidth / image.naturalWidth,
    targetHeight / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    (targetWidth - drawWidth) / 2,
    (targetHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

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
