import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { setDevRoleAction } from "@/app/actions/auth-role";
import { AuthButton } from "@/components/auth-button";

export const instant = false;

export default async function HomePage() {
  const user = await getCurrentUser();
  const currentRole = user?.role ?? "guest";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Salingkusog
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
              User Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Role:</span>
              <span
                className={`font-mono font-medium px-2 py-0.5 rounded ${
                  currentRole === "superadmin"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    : currentRole === "admin"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    : currentRole === "developer"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : currentRole === "user"
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {currentRole.toUpperCase()}
              </span>
            </div>

            <AuthButton user={user} />

            <Link
              href="/dev"
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Management (/dev) →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full flex flex-col gap-10">
        {/* Hero Section */}
        <section className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome to Salingkusog Portal
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            This is the public user side accessible to all members and guests. Explore platform resources, check system updates, or sign in to access management capabilities.
          </p>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                Public Access
              </div>
              <h2 className="text-lg font-semibold mb-2">User Workspace</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                General services, personal dashboard, and everyday workflows. Open to any authenticated or guest account without requiring elevated privileges.
              </p>
            </div>
            <div className="text-xs text-zinc-500 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              Status: <span className="text-emerald-600 font-medium">Accessible</span>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                Restricted Access
              </div>
              <h2 className="text-lg font-semibold mb-2">Management & Dev Console</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Internal diagnostics, database controls, role management, and system operations. Restricted to accounts assigned as Developer, Admin, or SuperAdmin.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Gate: <span className="font-mono text-zinc-700 dark:text-zinc-300">role in [developer, admin, superadmin]</span>
              </span>
              <Link
                href="/dev"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Enter Dev Portal →
              </Link>
            </div>
          </div>
        </section>

        {/* Development Role Simulator */}
        <section className="p-6 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                Role Testing Simulator
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Switch simulated roles to test access control between the user side and the restricted <code>/dev</code> management side.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
              Active: {user ? `${user.name} (${user.role})` : "Guest (No role)"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["superadmin", "admin", "developer", "user", "guest"] as const).map((role) => (
              <form key={role} action={setDevRoleAction}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className={`text-xs px-3 py-1.5 rounded border transition font-medium cursor-pointer ${
                    currentRole === role
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  Set as {role.charAt(0).toUpperCase() + role.slice(1)}
                  {role === "superadmin" && " (Owner & Role Management)"}
                  {role === "admin" && " (Full Dev Access)"}
                  {role === "developer" && " (Dev Access)"}
                  {role === "user" && " (Blocked from Dev)"}
                  {role === "guest" && " (Blocked from Dev)"}
                </button>
              </form>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        Salingkusog-Project · Next.js 16 App Router · Lakebase Postgres (Neon)
      </footer>
    </div>
  );
}
