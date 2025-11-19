import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // Redirect authenticated users to dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-6xl px-6 py-20">
        {/* Hero Section */}
        <section className="mb-20 text-center">
          <h1 className="mb-6 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
            CleanMod
          </h1>
          <p className="mb-4 text-2xl font-medium text-slate-700 sm:text-3xl">
            AI Moderation for Comments & User-Generated Content
          </p>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-slate-600">
            A fast, developer-friendly API that detects toxicity, hate,
            harassment and more — powered by modern open-source models.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center rounded-lg bg-slate-900 px-8 text-base font-medium text-white transition-colors hover:bg-slate-800"
            >
              Get Started
            </Link>
            <Link
              href="/docs"
              className="flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-8 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              API Docs
            </Link>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="mb-20">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 text-3xl" role="img" aria-label="Secure lock icon">🔒</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Secure by design
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                API keys are hashed and private by default.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 text-3xl">⚡</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Fast moderation
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                &lt;300ms with cached model inference.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 text-3xl">🧠</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Smart scoring
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Normalized, consistent schema across providers.
              </p>
            </div>
          </div>
        </section>

        {/* Code Example */}
        <section className="mb-20">
          <h2 className="mb-4 text-2xl font-semibold text-slate-900">
            Quick Start
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            <pre className="overflow-x-auto p-6 text-sm">
              <code className="text-slate-800">
                {`curl -X POST https://cleanmod.dev/api/v1/moderate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"You are disgusting"}'`}
              </code>
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} CleanMod. All rights reserved.
            </p>
            <nav className="flex flex-wrap items-center gap-6 text-sm">
              <Link
                href="/docs"
                className="text-slate-600 transition-colors hover:text-slate-900"
              >
                Docs
              </Link>
              <a
                href="https://github.com/shlomizadok/clean-mod"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 transition-colors hover:text-slate-900"
              >
                GitHub
              </a>
              <Link
                href="/dashboard"
                className="text-slate-600 transition-colors hover:text-slate-900"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}
