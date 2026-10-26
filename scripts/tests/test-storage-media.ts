/**
 * Salingkusog Production Integration Test: Storage & Media File Safety
 *
 * Verifies:
 * 1. Image magic byte sniffing across authentic formats (JPEG, PNG, WebP, GIF, AVIF)
 * 2. Rejection of non-image payloads (plain text, XML markup, JSON documents, generic binary)
 * 3. Boundary handling for zero-byte, truncated, and corrupt payloads
 * 4. Deterministic S3 key extraction and public URL derivation
 */

import assert from "node:assert";
import {
  validateImageMagicBytes,
  extractStorageKey,
  getPublicObjectUrl,
} from "../../src/lib/storage.ts";

export async function runStorageMediaTest() {
  console.log("▶ [Test Suite] Storage & Media File Safety");

  // 1. Valid Authentic Image Magic Bytes
  const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegResult = validateImageMagicBytes(validJpeg);
  assert.strictEqual(jpegResult.valid, true, "JPEG header must be valid");
  assert.strictEqual(jpegResult.detectedType, "image/jpeg");
  assert.strictEqual(jpegResult.extension, "jpg");

  const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngResult = validateImageMagicBytes(validPng);
  assert.strictEqual(pngResult.valid, true, "PNG header must be valid");
  assert.strictEqual(pngResult.detectedType, "image/png");
  assert.strictEqual(pngResult.extension, "png");

  // WebP: RIFF (4 bytes) + filesize (4 bytes) + WEBP (4 bytes)
  const validWebp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // 'RIFF'
    0x24, 0x00, 0x00, 0x00, // file size
    0x57, 0x45, 0x42, 0x50, // 'WEBP'
  ]);
  const webpResult = validateImageMagicBytes(validWebp);
  assert.strictEqual(webpResult.valid, true, "WebP header must be valid");
  assert.strictEqual(webpResult.detectedType, "image/webp");
  assert.strictEqual(webpResult.extension, "webp");

  // GIF89a: 'GIF8' (4 bytes)
  const validGif = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x00, 0x20, 0x00, 0x80, 0x00,
  ]);
  const gifResult = validateImageMagicBytes(validGif);
  assert.strictEqual(gifResult.valid, true, "GIF header must be valid");
  assert.strictEqual(gifResult.detectedType, "image/gif");
  assert.strictEqual(gifResult.extension, "gif");

  // AVIF: length (4 bytes) + 'ftyp' (4 bytes) + 'avif' (4 bytes)
  const validAvif = new Uint8Array([
    0x00, 0x00, 0x00, 0x1c,
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x61, 0x76, 0x69, 0x66, // 'avif'
  ]);
  const avifResult = validateImageMagicBytes(validAvif);
  assert.strictEqual(avifResult.valid, true, "AVIF header must be valid");
  assert.strictEqual(avifResult.detectedType, "image/avif");
  assert.strictEqual(avifResult.extension, "avif");

  // HEIC: length (4 bytes) + 'ftyp' (4 bytes) + 'heic' (4 bytes)
  const validHeic = new Uint8Array([
    0x00, 0x00, 0x00, 0x18,
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x68, 0x65, 0x69, 0x63, // 'heic'
  ]);
  const heicResult = validateImageMagicBytes(validHeic);
  assert.strictEqual(heicResult.valid, true, "HEIC header must be recognized as valid image container");
  assert.strictEqual(heicResult.detectedType, "image/heic");
  assert.strictEqual(heicResult.isHeic, true, "isHeic flag must be true");

  console.log("  ✔ Authentic image headers (JPEG, PNG, WebP, GIF, AVIF, HEIC) identified correctly");

  // 2. Non-Image Payload Rejection
  const plainText = new TextEncoder().encode("This is a simple text document that must not be accepted as an image.");
  assert.strictEqual(validateImageMagicBytes(plainText).valid, false, "Plain text payload must be rejected");

  const xmlMarkup = new TextEncoder().encode("<?xml version='1.0'?><data><item id='1'>content</item></data>");
  assert.strictEqual(validateImageMagicBytes(xmlMarkup).valid, false, "XML document must be rejected");

  const jsonDocument = new TextEncoder().encode(JSON.stringify({ kind: "metadata", values: [1, 2, 3, 4] }));
  assert.strictEqual(validateImageMagicBytes(jsonDocument).valid, false, "JSON document must be rejected");

  const genericBinary = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c]);
  assert.strictEqual(validateImageMagicBytes(genericBinary).valid, false, "Generic non-image binary must be rejected");
  console.log("  ✔ Non-image payloads (Text, XML, JSON, Generic Binary) blocked cleanly");

  // 3. Boundary & Corrupted Buffer Guardrails
  assert.strictEqual(validateImageMagicBytes(new Uint8Array(0)).valid, false, "Zero-byte buffer must be rejected");
  assert.strictEqual(validateImageMagicBytes(new Uint8Array([0xff, 0xd8])).valid, false, "Truncated buffer (<12 bytes) must be rejected");
  assert.strictEqual(validateImageMagicBytes(new Uint8Array(12).fill(0x00)).valid, false, "Zeroed 12-byte buffer must be rejected");
  console.log("  ✔ Truncated, empty, and zeroed buffers safely rejected");

  // 4. S3 Key Extraction and URL Derivation
  const bucketName = process.env.NEON_STORAGE_BUCKET || "photoss";
  const testUrl = `https://ep-example.storage.neon.tech/${bucketName}/uploads/user-123/polaroid.jpg`;
  const extractedKey = extractStorageKey(testUrl);
  assert.strictEqual(extractedKey, "uploads/user-123/polaroid.jpg", "Key must be cleanly extracted from storage URL");

  const urlWithQuery = `https://ep-example.storage.neon.tech/${bucketName}/thumbnails/snap.webp?v=42`;
  assert.strictEqual(extractStorageKey(urlWithQuery), "thumbnails/snap.webp?v=42");

  assert.strictEqual(extractStorageKey(""), null, "Empty URL must yield null key");
  assert.strictEqual(extractStorageKey("https://other-domain.com/unrelated/path.jpg"), null, "URL without matching bucket segment must return null");

  const builtUrl = getPublicObjectUrl("avatars/student-1.png");
  assert.ok(builtUrl.includes("/avatars/student-1.png"), "Built public URL must incorporate object key");
  console.log("  ✔ Storage key parsing and public URL builder verified");

  console.log("✔ Storage & media file safety suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-storage-media.ts")) {
  runStorageMediaTest().catch((err) => {
    console.error("❌ Storage media test failed:", err);
    process.exit(1);
  });
}
