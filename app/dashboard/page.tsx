// app/dashboard/page.tsx

import { prisma } from "@/lib/db";

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function getTodayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

export default async function DashboardPage() {
  const org = await prisma.organization.findFirst({
    include: {
      subscriptions: {
        where: { status: "active" },
        include: { plan: true },
        take: 1,
      },
      usageCounters: true,
    },
  });

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600">
          No organization found. Did you run the Prisma seed?
        </p>
      </div>
    );
  }

  const now = new Date();
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange(now);
  const { start: todayStart, end: todayEnd } = getTodayRange(now);

  const activeSub = org.subscriptions[0] ?? null;
  const plan = activeSub?.plan ?? null;
  const monthlyQuota = plan?.monthlyQuota ?? 5000;

  const monthlyUsage = org.usageCounters
    .filter((uc) => uc.date >= monthStart && uc.date < monthEnd)
    .reduce((sum, uc) => sum + uc.count, 0);

  const todaysUsage = org.usageCounters
    .filter((uc) => uc.date >= todayStart && uc.date < todayEnd)
    .reduce((sum, uc) => sum + uc.count, 0);

  const usagePercent = Math.min(
    100,
    Math.round((monthlyUsage / monthlyQuota) * 100)
  );

  const logs = await prisma.moderationLog.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="w-full">
      {/* Header lives inside main now */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-xs text-slate-600">
            Organization:{" "}
            <span className="font-medium text-slate-800">{org.name}</span>
          </p>
        </div>

        <div className="rounded-lg bg-white px-4 py-2 shadow-sm border border-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Current Plan
          </p>
          <p className="text-sm font-semibold">
            {plan?.name ?? "free (implicit)"}
          </p>
          <p className="text-xs text-slate-500">
            {monthlyQuota.toLocaleString()} requests / month
          </p>
        </div>
      </header>

      {/* Stats cards */}
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            This Month
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {monthlyUsage.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            of {monthlyQuota.toLocaleString()} requests used
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {usagePercent}% of monthly quota
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Today
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {todaysUsage.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            requests processed today
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </p>
          <p className="mt-2 text-sm text-slate-700">
            CleanMod is connected and logging moderation events. Use this view
            to monitor usage and tune your plan later.
          </p>
        </div>
      </section>

      {/* Recent logs */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Recent Moderation Events
          </h2>
          <p className="text-xs text-slate-500">
            Showing last {logs.length} events
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No moderation events yet. Call{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
              /api/v1/moderate
            </code>{" "}
            to start seeing data here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-2 align-top text-xs text-slate-600">
                      {log.createdAt.toISOString()}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                      {log.provider}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                      {log.model}
                    </td>
                    <td className="px-4 py-2 align-top text-xs">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                          (log.decision === "block"
                            ? "bg-rose-100 text-rose-700"
                            : log.decision === "flag"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700")
                        }
                      >
                        {log.decision}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                      {(() => {
                        const norm: any = log.normalized;
                        const score =
                          typeof norm?.overall_score === "number"
                            ? norm.overall_score
                            : undefined;
                        return score !== undefined ? score.toFixed(3) : "—";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
