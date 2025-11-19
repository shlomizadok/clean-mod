// app/dashboard/api-keys/page.tsx

import { prisma } from "@/lib/db";

function maskHash(hash: string): string {
  if (!hash) return "";
  if (hash.length <= 8) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export default async function ApiKeysPage() {
  // Prefer an org that actually has apiKeys
  const org = await prisma.organization.findFirst({
    where: {
      apiKeys: {
        some: {},
      },
    },
    include: {
      apiKeys: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600">
          No organization with API keys found. Did you run the Prisma seed and
          call the API at least once?
        </p>
      </div>
    );
  }

  const keys = org.apiKeys;

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-1 text-xs text-slate-600">
          Manage API keys for{" "}
          <span className="font-medium text-slate-800">{org.name}</span>. For
          now keys are seeded directly in the database; later this will support
          creating and revoking keys from the UI.
        </p>
      </header>

      <section className="mb-6">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold tracking-tight">
            How to use your API key
          </h2>
          <p className="mt-2 text-xs text-slate-600">
            Use your API key in the{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
              Authorization
            </code>{" "}
            header (recommended) or{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
              x-api-key
            </code>{" "}
            header.
          </p>

          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
            {`curl -X POST https://your-domain.com/api/v1/moderate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"text":"some comment text","model":"english-basic"}'`}
          </pre>

          <p className="mt-2 text-[11px] text-slate-500">
            CleanMod never stores the raw API key, only a hash. Make sure you
            keep the original key in a safe place when it is created.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Existing API Keys
          </h2>
          <p className="text-xs text-slate-500">
            {keys.length} key{keys.length === 1 ? "" : "s"} for this
            organization
          </p>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No API keys found. For now, create one via Prisma or a seed script.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Key Hash</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-2 align-top text-xs text-slate-800">
                      {key.name}
                    </td>
                    <td className="px-4 py-2 align-top text-xs font-mono text-slate-700">
                      {maskHash(key.keyHash)}
                    </td>
                    <td className="px-4 py-2 align-top text-xs">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                          (key.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600")
                        }
                      >
                        {key.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-slate-600">
                      {key.createdAt.toISOString()}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-slate-600">
                      {key.lastUsedAt ? key.lastUsedAt.toISOString() : "—"}
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
