import { sql } from "./db.ts";
import { getStorageClient, isStorageConfigured, STORAGE_BUCKET } from "./storage.ts";
import { ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3";
import {
  pushDiagnosticLog,
  getRecentDiagnosticLogs,
  type DiagnosticLogEntry,
} from "./server-log-buffer.ts";

export type SubsystemStatus = "healthy" | "degraded" | "down" | "unconfigured";

export interface SubsystemHealth {
  status: SubsystemStatus;
  latencyMs: number;
  message: string;
  checkedAt: string;
}

export interface SystemHealthSummary {
  timestamp: string;
  status: "healthy" | "degraded" | "down";
  summary: {
    healthy: number;
    degraded: number;
    down: number;
    unconfigured: number;
  };
  subsystems: {
    database: SubsystemHealth;
    storage: SubsystemHealth;
    auth: SubsystemHealth;
    moderation: SubsystemHealth;
  };
  recentLogs: DiagnosticLogEntry[];
}

export async function probeDatabase(
  sqlFn: typeof sql = sql,
  timeoutMs = 3000
): Promise<SubsystemHealth> {
  const start = performance.now();
  const checkedAt = new Date().toISOString();

  if (!process.env.DATABASE_URL && sqlFn === sql) {
    return {
      status: "unconfigured",
      latencyMs: 0,
      message: "DATABASE_URL is not configured",
      checkedAt,
    };
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([sqlFn`SELECT 1 as health`, timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    return {
      status: latencyMs > 800 ? "degraded" : "healthy",
      latencyMs,
      message: latencyMs > 800 ? "High database latency" : "Database connected",
      checkedAt,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    pushDiagnosticLog({
      subsystem: "database",
      level: "error",
      message: `Database probe failed: ${message}`,
      details: { latencyMs },
    });

    return {
      status: "down",
      latencyMs,
      message,
      checkedAt,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function probeStorage(
  s3ClientOverride?: S3Client,
  bucketName = STORAGE_BUCKET,
  timeoutMs = 3000
): Promise<SubsystemHealth> {
  const start = performance.now();
  const checkedAt = new Date().toISOString();

  if (!s3ClientOverride && !isStorageConfigured()) {
    return {
      status: "unconfigured",
      latencyMs: 0,
      message: "S3 credentials are not configured",
      checkedAt,
    };
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    const client = s3ClientOverride || getStorageClient();
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`S3 probe timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([client.send(command), timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    return {
      status: latencyMs > 1200 ? "degraded" : "healthy",
      latencyMs,
      message: latencyMs > 1200 ? "High S3 latency" : "Bucket accessible",
      checkedAt,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    pushDiagnosticLog({
      subsystem: "storage",
      level: "error",
      message: `S3 probe failed: ${message}`,
      details: { bucket: bucketName, latencyMs },
    });

    return {
      status: "down",
      latencyMs,
      message,
      checkedAt,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function probeAuth(
  baseUrlOverride?: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 3000
): Promise<SubsystemHealth> {
  const start = performance.now();
  const checkedAt = new Date().toISOString();
  const url = baseUrlOverride || process.env.NEON_AUTH_BASE_URL;

  if (!url) {
    return {
      status: "unconfigured",
      latencyMs: 0,
      message: "NEON_AUTH_BASE_URL is not configured",
      checkedAt,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetchFn(url, {
      method: "HEAD",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const latencyMs = Math.round(performance.now() - start);

    // Any HTTP response means the host/service is alive
    return {
      status: latencyMs > 1000 ? "degraded" : "healthy",
      latencyMs,
      message: `Auth endpoint responsive (HTTP ${res.status})`,
      checkedAt,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    pushDiagnosticLog({
      subsystem: "auth",
      level: "error",
      message: `Auth probe failed: ${message}`,
      details: { url, latencyMs },
    });

    return {
      status: "down",
      latencyMs,
      message,
      checkedAt,
    };
  }
}

export async function probeModeration(
  apiKeyOverride?: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 3000
): Promise<SubsystemHealth> {
  const start = performance.now();
  const checkedAt = new Date().toISOString();
  const apiKey = apiKeyOverride !== undefined ? apiKeyOverride : process.env.OPENAI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return {
      status: "unconfigured",
      latencyMs: 0,
      message: "OPENAI_API_KEY is not configured",
      checkedAt,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetchFn("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const latencyMs = Math.round(performance.now() - start);

    if (res.status === 401) {
      return {
        status: "down",
        latencyMs,
        message: "Invalid OpenAI API Key (HTTP 401)",
        checkedAt,
      };
    }

    return {
      status: latencyMs > 1500 ? "degraded" : "healthy",
      latencyMs,
      message: "OpenAI endpoint responsive",
      checkedAt,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    pushDiagnosticLog({
      subsystem: "moderation",
      level: "warn",
      message: `OpenAI probe failed: ${message}`,
      details: { latencyMs },
    });

    return {
      status: "down",
      latencyMs,
      message,
      checkedAt,
    };
  }
}

let cachedSummary: { data: SystemHealthSummary; expiresAt: number } | null = null;
const PROBE_CACHE_TTL_MS = 10_000;

export async function runAllHealthProbes(forceFresh = false): Promise<SystemHealthSummary> {
  const now = Date.now();
  if (!forceFresh && cachedSummary && now < cachedSummary.expiresAt) {
    return cachedSummary.data;
  }

  const timestamp = new Date().toISOString();

  const [dbResult, storageResult, authResult, modResult] = await Promise.allSettled([
    probeDatabase(),
    probeStorage(),
    probeAuth(),
    probeModeration(),
  ]);

  const database: SubsystemHealth =
    dbResult.status === "fulfilled"
      ? dbResult.value
      : {
          status: "down",
          latencyMs: 0,
          message: String(dbResult.reason),
          checkedAt: timestamp,
        };

  const storage: SubsystemHealth =
    storageResult.status === "fulfilled"
      ? storageResult.value
      : {
          status: "down",
          latencyMs: 0,
          message: String(storageResult.reason),
          checkedAt: timestamp,
        };

  const auth: SubsystemHealth =
    authResult.status === "fulfilled"
      ? authResult.value
      : {
          status: "down",
          latencyMs: 0,
          message: String(authResult.reason),
          checkedAt: timestamp,
        };

  const moderation: SubsystemHealth =
    modResult.status === "fulfilled"
      ? modResult.value
      : {
          status: "down",
          latencyMs: 0,
          message: String(modResult.reason),
          checkedAt: timestamp,
        };

  const counts = { healthy: 0, degraded: 0, down: 0, unconfigured: 0 };
  const allProbes = [database, storage, auth, moderation];
  for (const p of allProbes) {
    counts[p.status]++;
  }

  let overallStatus: "healthy" | "degraded" | "down" = "healthy";
  if (database.status === "down" || storage.status === "down") {
    overallStatus = "down";
  } else if (counts.down > 0 || counts.degraded > 0) {
    overallStatus = "degraded";
  }

  const result: SystemHealthSummary = {
    timestamp,
    status: overallStatus,
    summary: counts,
    subsystems: {
      database,
      storage,
      auth,
      moderation,
    },
    recentLogs: getRecentDiagnosticLogs(50),
  };

  cachedSummary = { data: result, expiresAt: now + PROBE_CACHE_TTL_MS };
  return result;
}
