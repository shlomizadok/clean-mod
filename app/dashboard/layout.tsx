// app/dashboard/layout.tsx

import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { SidebarNav } from "./_components/sidebar-nav";
import { UserMenu } from "./_components/user-menu";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/logs", label: "Logs" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  // Compute user display values
  const name =
    user && user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || "User";

  const avatarInitials =
    user && user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.email
      ? user.email[0].toUpperCase()
      : "U";

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

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden sm:block text-right text-xs text-slate-500">
                  <div className="font-medium text-slate-700">{name}</div>
                  {user.email && (
                    <div className="text-slate-500">{user.email}</div>
                  )}
                </div>
                <UserMenu
                  name={name}
                  email={user.email}
                  avatarInitials={avatarInitials}
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <SidebarNav items={navItems} />
        </aside>

        {/* Content area */}
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
