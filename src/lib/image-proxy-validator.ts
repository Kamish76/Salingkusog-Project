const PRIVATE_IP_REGEX =
  /^(localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|169\.254\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|\[?::1\]?|\[?fe80:.*\]?|\[?fc00:.*\]?|\[?fd00:.*\]?)$/i;

export interface ProxyValidationResult {
  valid: boolean;
  error?: string;
  status: number;
}

export function validateProxyTarget(
  targetUrl: string,
  allowedEndpoint?: string,
  bucket: string = "photoss"
): ProxyValidationResult {
  if (!targetUrl || typeof targetUrl !== "string") {
    return { valid: false, error: "Missing or invalid url parameter", status: 400 };
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { valid: false, error: "Malformed URL parameter", status: 400 };
  }

  // 1. Protocol check
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTPS protocol is permitted in production", status: 403 };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Invalid protocol", status: 400 };
  }

  // 2. Reject loopback, internal subnets, and cloud metadata probes
  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_IP_REGEX.test(hostname)) {
    return {
      valid: false,
      error: "Access to private or local addresses is prohibited",
      status: 403,
    };
  }

  // 3. Host whitelist: Must match configured S3 endpoint
  const endpoint = allowedEndpoint || process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint) {
    return { valid: false, error: "Storage endpoint is not configured", status: 503 };
  }

  try {
    const endpointHost = new URL(endpoint).hostname.toLowerCase();
    if (hostname !== endpointHost) {
      return { valid: false, error: "Origin host is not permitted", status: 403 };
    }
  } catch {
    return { valid: false, error: "Storage endpoint configuration error", status: 500 };
  }

  // 4. Scoped bucket path check: Must target the designated public storage bucket
  const requiredPrefix = `/${bucket}/`;
  if (!parsed.pathname.startsWith(requiredPrefix)) {
    return { valid: false, error: "Target path outside permitted storage bucket", status: 403 };
  }

  return { valid: true, status: 200 };
}
