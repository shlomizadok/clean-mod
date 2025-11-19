// app/dashboard/layout.tsx

import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  // later: { href: '/dashboard/logs', label: 'Logs' }, etc.
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
              CM
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                CleanMod
              </div>
              <div className="text-xs text-slate-500">
                Comment Moderation Dashboard
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {/* Placeholder for user profile / org switcher later */}
            admin@cleanmod.test
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 aria-[current=page]:bg-slate-900 aria-[current=page]:text-slate-50"
                aria-current={
                  typeof window !== "undefined" &&
                  window.location.pathname === item.href
                    ? "page"
                    : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
