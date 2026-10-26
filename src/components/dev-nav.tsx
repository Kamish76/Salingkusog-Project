"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DevNav({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname();

  const baseItems = [
    { label: "System Overview", href: "/dev" },
    { label: "API Health & Diagnostics", href: "/dev/health", badge: "LIVE" },
    { label: "Photo Moderation", href: "/dev/moderation", badge: "QUEUE" },
  ];

  const superAdminItems = [
    { label: "User & Role Management", href: "/dev/users" },
    { label: "Audit & Activity Logs", href: "/dev/logs", badge: "SUPERADMIN" },
    { label: "Developer Tools", href: "/dev/tools", badge: "SUITE" },
  ];

  const navItems = isSuperAdmin ? [...baseItems, ...superAdminItems] : baseItems;

  return (
    <div className="border-b border-zinc-800/80 bg-zinc-900/40">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 flex items-center gap-1 text-xs font-mono overflow-x-auto no-scrollbar whitespace-nowrap">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dev"
              ? pathname === "/dev"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 px-3.5 transition flex items-center gap-2 border-b-2 font-medium ${
                isActive
                  ? "border-amber-400 text-amber-300 bg-amber-500/5"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold border ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
