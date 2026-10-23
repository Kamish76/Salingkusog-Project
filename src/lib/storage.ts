import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageObjectItem {
  key: string;
  size: number;
  lastModified?: string;
  url: string;
}

export const STORAGE_BUCKET = process.env.NEON_STORAGE_BUCKET || "photoss";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

export function getStorageClient(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION || "us-east-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage credentials are not fully configured in environment variables."
    );
  }

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export function getPublicObjectUrl(key: string): string {
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || "").replace(/\/+$/, "");
  return `${endpoint}/${STORAGE_BUCKET}/${key}`;
}

/**
 * Validates file magic bytes to guarantee file is an authentic image
 * and prevent disguised non-image files from uploading to the bucket.
 */
export function validateImageMagicBytes(buffer: Uint8Array): {
  valid: boolean;
  detectedType?: string;
  extension?: string;
} {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedType: "image/png", extension: "png" };
  }

  // WebP: 'RIFF' .... 'WEBP'
  const riff = String.fromCharCode(...buffer.slice(0, 4));
  const webp = String.fromCharCode(...buffer.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") {
    return { valid: true, detectedType: "image/webp", extension: "webp" };
  }

  // GIF: 'GIF8'
  const gif = String.fromCharCode(...buffer.slice(0, 4));
  if (gif === "GIF8") {
    return { valid: true, detectedType: "image/gif", extension: "gif" };
  }

  // AVIF: ....ftypavif or ftypavis
  const ftyp = String.fromCharCode(...buffer.slice(4, 8));
  const brand = String.fromCharCode(...buffer.slice(8, 12));
  if (ftyp === "ftyp" && (brand === "avif" || brand === "avis")) {
    return { valid: true, detectedType: "image/avif", extension: "avif" };
  }

  return { valid: false };
}

/**
 * Lists objects currently stored in the configured bucket
 */
export async function listBucketObjects(): Promise<StorageObjectItem[]> {
  if (!isStorageConfigured()) {
    return [];
  }

  const s3 = getStorageClient();
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: STORAGE_BUCKET,
      MaxKeys: 100,
    })
  );

  return (
    response.Contents?.map((item) => ({
      key: item.Key || "",
      size: item.Size || 0,
      lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
      url: getPublicObjectUrl(item.Key || ""),
    })).filter((item) => Boolean(item.key)) || []
  );
}

/**
 * Upload an image buffer to Neon Object Storage
 */
export async function uploadImageToBucket(
  buffer: Uint8Array,
  fileName: string,
  contentType: string
): Promise<{ key: string; url: string; size: number }> {
  const s3 = getStorageClient();
  
  // Clean file name
  const cleanBase = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/\.[^/.]+$/, "");
  
  const ext = contentType === "image/webp" ? "webp" : "jpg";
  const key = `uploads/${Date.now()}-${cleanBase}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: getPublicObjectUrl(key),
    size: buffer.length,
  };
}

/**
 * Delete an object from the bucket
 */
export async function deleteBucketObject(key: string): Promise<void> {
  const s3 = getStorageClient();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    })
  );
}
