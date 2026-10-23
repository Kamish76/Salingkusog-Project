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
}

/**
 * Downscales an image client-side to a max dimension (default 1080p)
 * and encodes to WebP format to minimize storage consumption.
 */
export async function processAndDownscaleImage(
  file: File,
  maxDimension: number = 1080,
  quality: number = 0.82
): Promise<ImageProcessResult> {
  const originalSize = file.size;

  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

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
    throw new Error("Unable to create canvas 2D rendering context");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Image compression to WebP failed"));
      },
      "image/webp",
      quality
    );
  });

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
  };
}
