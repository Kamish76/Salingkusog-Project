import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { AuthButton } from "@/components/auth-button";
import { DevNav } from "@/components/dev-nav";


export const instant = false;

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!isDevAuthorized(user)) {
    redirect("/?auth=required");
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      {/* Dev Navigation Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 min-h-[4rem] py-2 sm:py-0 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/dev"
              className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2"
            >
              <span>Salingkusog</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                MANAGEMENT
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs ml-auto">
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-zinc-400">Signed:</span>
                <span className="font-mono text-zinc-200 truncate max-w-[120px]">{user.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase font-bold border ${
                    user.role === "superadmin"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : user.role === "admin"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            )}

            <AuthButton user={user} />

            <Link
              href="/"
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 min-h-[38px] sm:min-h-[36px] flex items-center justify-center rounded-full sm:rounded border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition text-xs shrink-0 active:scale-95"
            >
              <span className="hidden sm:inline">← Back to User Side</span>
              <span className="sm:hidden">← Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Dev Section Tabs Navigation */}
      <DevNav />

      {/* Main Dev Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8">{children}</div>
    </div>
  );
}
