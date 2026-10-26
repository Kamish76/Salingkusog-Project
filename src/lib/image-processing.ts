export interface ImageProcessResult {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  originalSize: number;
  resizedSize: number;
  savedPercentage: number;
  previewUrl: string;
  outputType: "image/webp" | "image/jpeg";
}

/**
 * Detects whether a file or blob is an Apple HEIC/HEIF photo
 * based on MIME type or file extension.
 */
export function isHeicFormat(file: File | Blob): boolean {
  const type = (file.type || "").toLowerCase();
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence"
  ) {
    return true;
  }

  if (file instanceof File && file.name) {
    const name = file.name.toLowerCase();
    return name.endsWith(".heic") || name.endsWith(".heif");
  }

  return false;
}

const HEIC_BRANDS = new Set(["heic", "heix", "mif1", "msf1", "hevc", "hevx"]);

/**
 * Sniffs the first 12 bytes of a Blob/File for an ISO Base Media File Format
 * HEIC/HEIF `ftyp` header, catching HEIC files renamed or disguised as `.jpg`.
 */
export async function hasHeicMagicBytes(file: Blob): Promise<boolean> {
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (buf.length < 12) return false;
    const ftyp = String.fromCharCode(buf[4], buf[5], buf[6], buf[7]);
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]).toLowerCase();
    return ftyp === "ftyp" && HEIC_BRANDS.has(brand);
  } catch {
    return false;
  }
}

interface DecodedImageSource {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup: () => void;
}

/**
 * Loads an image via an HTMLImageElement with standard onload / decode().
 * Works natively in Safari for HEIC and universally for JPEG/PNG/WebP.
 */
function loadImageElement(blob: Blob): Promise<DecodedImageSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        cleanup();
        reject(new Error("Loaded image has zero dimensions"));
        return;
      }
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup,
      });
    };

    img.onerror = () => {
      cleanup();
      reject(new Error("HTMLImageElement failed to decode image"));
    };

    img.src = url;
  });
}

/**
 * Decodes an image into a drawable canvas source.
 * Employs a hybrid strategy:
 * 1. For HEIC on Safari/Apple: Uses native HTMLImageElement decode.
 * 2. For HEIC on non-Apple browsers: Dynamically imports `heic2any` to convert to JPEG blob first.
 * 3. For standard formats: Uses createImageBitmap (with imageOrientation: 'from-image'), falling back to HTMLImageElement.
 */
async function decodeImageSource(file: File | Blob): Promise<DecodedImageSource> {
  const isHeic = isHeicFormat(file) || (await hasHeicMagicBytes(file));

  if (isHeic) {
    // Strategy 1: Try native Safari decoding first (near instantaneous, zero extra download)
    try {
      const nativeSource = await loadImageElement(file);
      return nativeSource;
    } catch {
      // Strategy 2: If native decode fails (e.g., Chrome/Firefox/Edge on Windows/Android),
      // dynamically import heic2any on-demand so it doesn't inflate initial page bundle.
      try {
        const heic2anyModule = await import("heic2any");
        const heic2any = heic2anyModule.default || heic2anyModule;
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        });

        const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
        return await loadImageElement(jpegBlob);
      } catch (transcodeErr) {
        console.error("heic2any transcode failed:", transcodeErr);
        throw new Error(
          "Could not convert HEIC photo. Please take a new snapshot or choose a standard JPEG/PNG photo."
        );
      }
    }
  }

  // Non-HEIC standard images: Prefer createImageBitmap with EXIF orientation correction
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement if createImageBitmap fails
      return await loadImageElement(file);
    }
  }

  return await loadImageElement(file);
}

/**
 * Encodes canvas content to a Blob, trying WebP first and falling back to JPEG
 * for older browsers or WebKit versions with limited WebP export support.
 */
function canvasToBlobResilient(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<{ blob: Blob; outputType: "image/webp" | "image/jpeg" }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob && webpBlob.size > 0) {
          resolve({ blob: webpBlob, outputType: "image/webp" });
        } else {
          // Fallback to JPEG if WebP export is unsupported or produced empty blob
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob && jpegBlob.size > 0) {
                resolve({ blob: jpegBlob, outputType: "image/jpeg" });
              } else {
                reject(new Error("Canvas toBlob compression failed for both WebP and JPEG"));
              }
            },
            "image/jpeg",
            quality
          );
        }
      },
      "image/webp",
      quality
    );
  });
}

export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;

/**
 * Downscales an image client-side to a max dimension (default 1080p)
 * and encodes to WebP (or JPEG fallback) format to minimize storage consumption,
 * prevent Vercel 4.5 MB payload limits, and support iOS HEIC photos smoothly.
 */
export async function processAndDownscaleImage(
  file: File | Blob,
  maxDimension: number = 1080,
  quality: number = 0.82
): Promise<ImageProcessResult> {
  if (!file || file.size === 0) {
    throw new Error("Selected photo is empty. Please choose a valid photo.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error(
      "This photo is too large (over 25 MB). Please choose a smaller photo or take a standard snapshot."
    );
  }
  const originalSize = file.size;
  const source = await decodeImageSource(file);

  const originalWidth = source.width;
  const originalHeight = source.height;

  let width = originalWidth;
  let height = originalHeight;

  // Scale down while maintaining aspect ratio if either dimension exceeds maxDimension
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    source.cleanup();
    throw new Error("Unable to create canvas 2D rendering context");
  }

  // Draw decoded frame
  source.draw(ctx, width, height);
  source.cleanup();

  const { blob, outputType } = await canvasToBlobResilient(canvas, quality);

  const resizedSize = blob.size;
  const savedPercentage =
    originalSize > 0
      ? Math.max(0, Math.round(((originalSize - resizedSize) / originalSize) * 100))
      : 0;

  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    originalWidth,
    originalHeight,
    resizedWidth: width,
    resizedHeight: height,
    originalSize,
    resizedSize,
    savedPercentage,
    previewUrl,
    outputType,
  };
}
