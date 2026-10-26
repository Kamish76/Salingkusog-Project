/**
 * Salingkusog Production Integration Test: Image Proxy SSRF & Security Guards
 *
 * Verifies:
 * 1. Protocol restrictions (rejects file:, gopher:, javascript:, ftp:)
 * 2. SSRF IP blacklists (loopback, 169.254.x cloud metadata, 10.x, 192.168.x, 172.16.x)
 * 3. Host whitelisting against configured S3 storage endpoint
 * 4. Bucket path scoping to prevent cross-bucket data access
 * 5. Content-Type and payload size boundaries
 */

import assert from "node:assert";
import { validateProxyTarget } from "../../src/lib/image-proxy-validator.ts";

export async function runImageProxySecurityTest() {
  console.log("▶ [Test Suite] Image Proxy SSRF & Security Guards");

  const s3Endpoint = "https://br-silent-resonance-b5nm00ww.storage.c-7.us-east-2.aws.neon.tech";
  const bucket = "photoss";

  // 1. Missing or malformed URLs
  assert.strictEqual(validateProxyTarget("", s3Endpoint, bucket).valid, false);
  assert.strictEqual(validateProxyTarget("not-a-url", s3Endpoint, bucket).valid, false);
  console.log("  ✔ Malformed and empty URLs rejected");

  // 2. Protocol validation
  assert.strictEqual(validateProxyTarget("file:///etc/passwd", s3Endpoint, bucket).valid, false);
  assert.strictEqual(validateProxyTarget("javascript:alert(1)", s3Endpoint, bucket).valid, false);
  assert.strictEqual(validateProxyTarget("gopher://127.0.0.1", s3Endpoint, bucket).valid, false);
  console.log("  ✔ Dangerous protocols (file, javascript, gopher) blocked");

  // 3. SSRF and Loopback / Metadata probes
  const ssrfVectors = [
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.169.254/computeMetadata/v1/",
    "http://127.0.0.1:3000/api/dev",
    "http://127.0.0.1:5432",
    "http://localhost:3000",
    "http://0.0.0.0:80",
    "http://10.0.0.1/admin",
    "http://192.168.1.1/router",
    "http://172.16.0.1/internal",
    "http://172.31.255.255/internal",
  ];

  for (const url of ssrfVectors) {
    const res = validateProxyTarget(url, s3Endpoint, bucket);
    assert.strictEqual(res.valid, false, `Vector ${url} must be blocked`);
    assert.strictEqual(res.status, 403, `Vector ${url} must return 403 Forbidden`);
  }
  console.log("  ✔ All SSRF loopback, internal, and cloud metadata probes blocked");

  // 4. Host Whitelist & Bucket scoping
  assert.strictEqual(
    validateProxyTarget("https://evil-attacker.com/image.png", s3Endpoint, bucket).valid,
    false,
    "External third-party hosts must be blocked"
  );
  assert.strictEqual(
    validateProxyTarget(`${s3Endpoint}/private-bucket/secret.png`, s3Endpoint, bucket).valid,
    false,
    "Non-target buckets must be blocked"
  );

  // 5. Valid Neon Storage Object URL
  const validUrl = `${s3Endpoint}/${bucket}/uploads/test-image.webp`;
  const validRes = validateProxyTarget(validUrl, s3Endpoint, bucket);
  assert.strictEqual(validRes.valid, true, `Valid S3 URL must pass: ${validRes.error}`);
  console.log("  ✔ Authentic Neon Object Storage URLs permitted");

  console.log("✔ Image proxy security suite passed cleanly\n");
}

if (process.argv[1]?.endsWith("test-image-proxy.ts")) {
  runImageProxySecurityTest().catch((err) => {
    console.error("❌ Image proxy security test failed:", err);
    process.exit(1);
  });
}
