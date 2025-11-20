// app/dashboard/logs/page.tsx

import { prisma } from "@/lib/db";
import { getCurrentOrganization } from "@/lib/auth";
import Link from "next/link";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

type FilterValues = {
  decision?: string;
  provider?: string;
  range?: string;
  page: number;
};

function parseSearchParams(searchParams?: SearchParams): FilterValues {
  const page = searchParams?.page ? parseInt(String(searchParams.page), 10) : 1;
  return {
    decision: searchParams?.decision
      ? String(searchParams.decision)
      : undefined,
    provider: searchParams?.provider
      ? String(searchParams.provider)
      : undefined,
    range: searchParams?.range ? String(searchParams.range) : undefined,
    page: isNaN(page) || page < 1 ? 1 : page,
  };
}

function getDateRangeFromFilter(range?: string): Date | null {
  if (!range) return null;

  const now = new Date();
  switch (range) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function buildWhereClause(orgId: string, filters: FilterValues) {
  const where: any = {
    orgId,
  };

  if (
    filters.decision &&
    ["allow", "flag", "block"].includes(filters.decision)
  ) {
    where.decision = filters.decision;
  }

  if (filters.provider && ["unitary", "openai"].includes(filters.provider)) {
    where.provider = filters.provider;
  }

  const fromDate = getDateRangeFromFilter(filters.range);
  if (fromDate) {
    where.createdAt = {
      gte: fromDate,
    };
  }

  return where;
}

function buildQueryString(
  filters: FilterValues,
  updates?: Partial<FilterValues>
): string {
  const params = new URLSearchParams();

  // Determine final values for each filter
  // Check if key exists in updates (even if value is undefined) to distinguish
  // between "not provided" and "explicitly set to undefined"
  const finalDecision =
    updates && "decision" in updates ? updates.decision : filters.decision;
  const finalProvider =
    updates && "provider" in updates ? updates.provider : filters.provider;
  const finalRange =
    updates && "range" in updates ? updates.range : filters.range;
  const finalPage = updates && "page" in updates ? updates.page : filters.page;

  // Only add non-empty values to params
  if (finalDecision) params.set("decision", finalDecision);
  if (finalProvider) params.set("provider", finalProvider);
  if (finalRange) params.set("range", finalRange);
  if (finalPage && finalPage > 1) params.set("page", String(finalPage));

  const query = params.toString();
  // Always return full path - empty query string means no filters
  return query ? `/dashboard/logs?${query}` : "/dashboard/logs";
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

type LogsPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const org = await getCurrentOrganization();

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600">
          Unable to load organization. Please try refreshing.
        </p>
      </div>
    );
  }

  // Await searchParams if it's a Promise (Next.js 15+)
  const resolvedSearchParams =
    searchParams instanceof Promise ? await searchParams : searchParams;

  const filters = parseSearchParams(resolvedSearchParams);
  const where = buildWhereClause(org.id, filters);
  const pageSize = 20;
  const skip = (filters.page - 1) * pageSize;

  // Fetch logs and count in parallel
  const [logs, totalCount] = await Promise.all([
    prisma.moderationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.moderationLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = skip + 1;
  const endItem = Math.min(skip + pageSize, totalCount);

  return (
    <div className="w-full">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Moderation Logs
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Recent moderation events for your organization. Use filters to inspect
          decisions and debug integration issues.
        </p>
      </header>

      {/* Filters */}
      <section className="mb-6 flex flex-wrap items-center gap-3">
        {/* Decision Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700">
            Decision:
          </label>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {["All", "allow", "flag", "block"].map((value) => {
              const isActive =
                value === "All"
                  ? !filters.decision
                  : filters.decision === value;
              const href = buildQueryString(filters, {
                decision: value === "All" ? undefined : value,
                page: 1, // Reset to page 1 when filtering
              });

              return (
                <Link
                  key={value}
                  href={href}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700">
            Provider:
          </label>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {["All", "unitary", "openai"].map((value) => {
              const isActive =
                value === "All"
                  ? !filters.provider
                  : filters.provider === value;
              const href = buildQueryString(filters, {
                provider: value === "All" ? undefined : value,
                page: 1,
              });

              return (
                <Link
                  key={value}
                  href={href}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-700">Range:</label>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {[
              { value: undefined, label: "All time" },
              { value: "24h", label: "Last 24h" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
            ].map(({ value, label }) => {
              const isActive = filters.range === value;
              const href = buildQueryString(filters, {
                range: value,
                page: 1,
              });

              return (
                <Link
                  key={value || "all"}
                  href={href}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Logs Table */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Moderation Events
          </h2>
          <p className="text-xs text-slate-500">
            {totalCount === 0
              ? "No events found"
              : `Showing ${startItem}–${endItem} of ${totalCount.toLocaleString()} event${
                  totalCount === 1 ? "" : "s"
                }`}
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No moderation events found matching your filters. Try adjusting your
            filters or make some moderation requests to see data here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">API Key</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const norm: any = log.normalized;
                  const score =
                    typeof norm?.overall_score === "number"
                      ? norm.overall_score
                      : undefined;

                  return (
                    <tr
                      key={log.id}
                      className="border-t border-slate-100 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-2 align-top text-xs text-slate-600">
                        {formatTimestamp(log.createdAt)}
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
                        {score !== undefined ? score.toFixed(3) : "—"}
                      </td>
                      <td className="px-4 py-2 align-top text-xs text-slate-700">
                        {log.provider}
                      </td>
                      <td className="px-4 py-2 align-top text-xs text-slate-700">
                        {log.model}
                      </td>
                      <td className="px-4 py-2 align-top text-xs text-slate-600">
                        {log.apiKey?.name || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Page {filters.page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Link
                href={
                  filters.page > 1
                    ? buildQueryString(filters, { page: filters.page - 1 })
                    : "#"
                }
                className={`rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.page > 1
                    ? "bg-white text-slate-700 hover:bg-slate-50"
                    : "cursor-not-allowed bg-slate-50 text-slate-400"
                }`}
                aria-disabled={filters.page <= 1}
              >
                Previous
              </Link>
              <Link
                href={
                  filters.page < totalPages
                    ? buildQueryString(filters, { page: filters.page + 1 })
                    : "#"
                }
                className={`rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.page < totalPages
                    ? "bg-white text-slate-700 hover:bg-slate-50"
                    : "cursor-not-allowed bg-slate-50 text-slate-400"
                }`}
                aria-disabled={filters.page >= totalPages}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
