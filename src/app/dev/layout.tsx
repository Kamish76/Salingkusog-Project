import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";

export const instant = false;

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Dev Navigation Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dev"
              className="font-bold text-lg tracking-tight text-white flex items-center gap-2"
            >
              <span>Salingkusog</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                MANAGEMENT / DEV
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-zinc-400">Signed as:</span>
                <span className="font-mono text-zinc-200">{user.name}</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold border ${
                    user.role === "superadmin"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : user.role === "admin"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {user.role === "admin" ? "admin (moderator)" : user.role}
                </span>
              </div>
            ) : (
              <span className="text-zinc-500 font-mono">Status: Unauthenticated</span>
            )}

            <AuthButton user={user} />

            <Link
              href="/"
              className="px-3 py-1.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
            >
              ← Back to User Side
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dev Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
