import Link from "next/link";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";
import { isStorageConfigured, STORAGE_BUCKET } from "@/lib/storage";

export const instant = false;

export default async function DevToolsPage() {
  const user = await getCurrentUser();
  const authorized = isDevAuthorized(user);
  const storageConfigured = isStorageConfigured();

  // 1. Access Gate: Deny guests and non-moderator accounts
  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-12">
        <div className="p-4 sm:p-8 rounded-2xl border border-red-900/50 bg-red-950/20 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-red-200">
              Access Restricted to Moderator / Admin Accounts
            </h1>
            <p className="text-sm text-zinc-400">
              The <code>/dev/tools</code> portal is locked for administrative use. Your current session does not hold the required elevated role.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-left space-y-1 overflow-x-auto">
            <div className="text-zinc-500">{"// Authorization Check"}</div>
            <div>
              Detected Identity:{" "}
              <span className="text-zinc-200 font-bold break-all">
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
        </div>
      </div>
    );
  }

  const tools = [
    {
      title: "Raffle System & Ticket Rules Manager",
      href: "/dev/tools/raffle",
      badge: "TICKET ENGINE",
      badgeColor: "amber",
      description:
        "Manage what counts as a raffle ticket across bingo lines, challenge milestones, and memory drops. Configure per-rule rewards, student caps, and test in the sandbox.",
      status: "7 Rules Configured",
      features: [
        "Configurable line, milestone & photo rules",
        "Per-rule tickets counter & live enable/disable",
        "Max ticket limits per student enforcement",
        "Interactive 3x3 sandbox for real-time simulation",
      ],
    },
    {
      title: "3x3 Bingo Card & Challenge Manager",
      href: "/dev/tools/bingo",
      badge: "GAME ENGINE",
      badgeColor: "emerald",
      description:
        "Preview the live 3x3 student bingo card across event days, update challenge tasks, categories, and unlock schedules in real time.",
      status: "9 Tasks Configured",
      features: [
        "Live 3x3 card preview with Day 1–3 lock simulation",
        "Instant task editor (titles, descriptions, categories)",
        "Selfie requirement & active challenge controls",
        "Audit logged modifications with instant path revalidation",
      ],
    },
    {
      title: "Neon Object Storage & Image Lab",
      href: "/dev/tools/storage",
      badge: "ACTIVE",
      badgeColor: "emerald",
      description:
        "Test S3 bucket integration, verify image-only lock enforcement, benchmark client-side 1080p compression, and manage files in the bucket.",
      status: storageConfigured ? `Connected (${STORAGE_BUCKET})` : "Not Configured",
      features: [
        "Enforces image-only magic byte verification",
        "Client-side 1080p WebP downscaler (-95% size)",
        "Direct public CDN delivery & delete actions",
        "Free tier 5 GB volume quota tracking",
      ],
    },
    {
      title: "User & Role Management",
      href: "/dev/users",
      badge: "RBAC",
      badgeColor: "purple",
      description:
        "Admin user directory, role assignments (user, admin, superadmin), and session simulation controls.",
      status: "Neon Managed Auth",
      features: [
        "Elevate and demote user accounts",
        "Postgres neon_auth schema inspector",
        "SuperAdmin root account safety locks",
      ],
    },
    {
      title: "System Diagnostics & Branch Status",
      href: "/dev",
      badge: "INFRA",
      badgeColor: "amber",
      description:
        "Branch diagnostics, Postgres connection pool health, environment configuration, and Neon Functions inspection.",
      status: "Production Branch",
      features: [
        "Postgres connection verification",
        "Functions endpoint call status",
        "Branch metadata and credentials list",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-1">
          <Link href="/dev" className="hover:text-zinc-200">Dev</Link>
          <span>/</span>
          <span className="text-amber-400">Developer Tools</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
          <span>Developer Tools & Testing Suite</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-normal">
            ADMIN ONLY
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Suite of administrative testing utilities, infrastructure diagnostics, and optimization labs for the Salingkusog backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {tools.map((tool) => (
          <div
            key={tool.href}
            className="p-5 sm:p-6 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur flex flex-col justify-between hover:border-zinc-700 transition space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                    tool.badgeColor === "emerald"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : tool.badgeColor === "purple"
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {tool.badge}
                </span>
                <span className="text-xs font-mono text-zinc-500">{tool.status}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-100">{tool.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">{tool.description}</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Key Capabilities:
                </div>
                <ul className="text-xs text-zinc-400 space-y-1">
                  {tool.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-xs">›</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={tool.href}
                className="w-full py-2.5 px-3 min-h-[44px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition flex items-center justify-center gap-2 border border-zinc-700 active:scale-95"
              >
                <span>Launch Tool</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
