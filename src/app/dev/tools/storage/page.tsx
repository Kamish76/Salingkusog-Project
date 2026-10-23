import Link from "next/link";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { setDevRoleAction } from "@/app/actions/auth-role";
import { AuthButton } from "@/components/auth-button";
import {
  isStorageConfigured,
  listBucketObjects,
  STORAGE_BUCKET,
  StorageObjectItem,
} from "@/lib/storage";
import { StorageTesterClient } from "./storage-tester-client";

export const instant = false;

export default async function DevStorageToolsPage() {
  const user = await getCurrentUser();
  const authorized = isDevAuthorized(user);

  // 1. Access Gate: Strictly protect developer tools with admin-only credentials
  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-8 rounded-2xl border border-red-900/50 bg-red-950/20 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-200">
              Access Restricted to Moderator / Admin Accounts
            </h1>
            <p className="text-sm text-zinc-400">
              The <code>/dev/tools/storage</code> testing lab is locked for administrative use. Your current session does not hold the required elevated role.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-left space-y-1">
            <div className="text-zinc-500">{"// Authorization Check"}</div>
            <div>
              Detected Identity:{" "}
              <span className="text-zinc-200 font-bold">
                {user ? user.email : "Unauthenticated"}
              </span>
            </div>
            <div>
              Detected Role:{" "}
              <span className="text-amber-400 font-bold">
                {user ? user.role : "none (guest)"}
              </span>
            </div>
            <div>
              Required Role:{" "}
              <span className="text-amber-300 font-bold">superadmin</span> or{" "}
              <span className="text-purple-300 font-bold">admin (moderator)</span>
            </div>
            <div>
              Status: <span className="text-red-400 font-bold">HTTP 403 Forbidden</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <p className="text-xs text-zinc-400">
              Sign in with your registered account:
            </p>
            <AuthButton user={user} />
          </div>

          {/* Dev simulator controls */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <p className="text-xs text-zinc-500 font-mono">
              [Dev Simulator] Test authorization states:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="superadmin" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  Simulate SuperAdmin
                </button>
              </form>
              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="admin" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  Simulate Admin (Moderator)
                </button>
              </form>
              <form action={setDevRoleAction}>
                <input type="hidden" name="role" value="user" />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
                >
                  Simulate Standard User
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch Storage Bucket State & Quota Metrics
  const configured = isStorageConfigured();
  let objects: StorageObjectItem[] = [];
  let totalBytes = 0;
  let fetchError: string | null = null;

  if (configured) {
    try {
      objects = await listBucketObjects();
      totalBytes = objects.reduce((acc, curr) => acc + curr.size, 0);
    } catch (err: unknown) {
      fetchError = err instanceof Error ? err.message : "Failed to list objects";
    }
  }

  const FREE_TIER_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
  const quotaUsedPercent = ((totalBytes / FREE_TIER_LIMIT_BYTES) * 100).toFixed(3);
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || "Not configured";
  const region = process.env.AWS_REGION || "us-east-2";

  return (
    <div className="space-y-6">
      {/* Navigation / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-1">
            <Link href="/dev" className="hover:text-zinc-200">Dev</Link>
            <span>/</span>
            <Link href="/dev/tools" className="hover:text-zinc-200">Tools</Link>
            <span>/</span>
            <span className="text-amber-400">Storage & Optimizer</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Neon Storage & Image Lab</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-normal">
              ADMIN ONLY
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Test branch-aware object storage, verify image-only enforcement, and inspect client-side 1080p compression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dev/tools"
            className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs transition"
          >
            ← All Tools
          </Link>
        </div>
      </div>

      {/* Storage Configuration Diagnostics Card */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/70 backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                configured ? "bg-emerald-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              Neon Object Storage Connection
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Region: <span className="text-zinc-200 font-bold">{region}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase">Active Bucket</div>
            <div className="text-amber-300 font-bold text-sm mt-0.5">{STORAGE_BUCKET}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">public_read mode</div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase">Stored Objects</div>
            <div className="text-zinc-100 font-bold text-sm mt-0.5">{objects.length} files</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">in current branch</div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase">Stored Volume</div>
            <div className="text-emerald-400 font-bold text-sm mt-0.5">{formatBytes(totalBytes)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{quotaUsedPercent}% of 5 GB limit</div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase">Free Plan Quota</div>
            <div className="text-zinc-100 font-bold text-sm mt-0.5">5.00 GB Cap</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">per project total</div>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400">
            <span>Free Tier Storage Used: {formatBytes(totalBytes)} / 5.00 GB</span>
            <span className="text-zinc-300 font-bold">{quotaUsedPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all"
              style={{ width: `${Math.max(1, Math.min(100, Number(quotaUsedPercent)))}%` }}
            />
          </div>
        </div>

        {fetchError && (
          <div className="p-3 rounded bg-red-950/40 border border-red-900/60 text-xs text-red-300 font-mono">
            Error accessing bucket: {fetchError}
          </div>
        )}
      </div>

      {/* Main Interactive Lab */}
      <StorageTesterClient
        initialObjects={objects}
        bucketName={STORAGE_BUCKET}
        endpointUrl={endpoint}
      />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
