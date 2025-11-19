import Link from "next/link";

export const metadata = {
  title: "API Documentation | CleanMod",
  description: "CleanMod API documentation for text moderation",
};

const errorResponses = [
  {
    code: "400 Bad Request",
    description: "Invalid or missing request body fields.",
    body: `{\n  "error": "Missing or invalid \\"text\\" field in request body."\n}`,
    badgeClasses:
      "rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800",
  },
  {
    code: "401 Unauthorized",
    description: "Missing or invalid API key.",
    body: `{\n  "error": "Missing API key. Use Authorization: Bearer <KEY> or x-api-key."\n}`,
    badgeClasses:
      "rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800",
  },
  {
    code: "429 Too Many Requests",
    description: "Monthly quota exceeded.",
    body: `{\n  "error": "Monthly quota exceeded. Upgrade your CleanMod plan to continue.",\n  "quota": 5000,\n  "used": 5000\n}`,
    badgeClasses:
      "rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800",
  },
  {
    code: "500 Internal Server Error",
    description: "An unexpected error occurred on the server.",
    body: `{\n  "error": "Internal server error."\n}`,
    badgeClasses:
      "rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800",
  },
];

export default function DocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const codeExamples = [
    {
      title: "cURL",
      code: `curl -X POST ${baseUrl}/api/v1/moderate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "You are an idiot",
    "model": "english-basic"
  }'`,
    },
    {
      title: "Node.js (fetch)",
      code: `const response = await fetch('${baseUrl}/api/v1/moderate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'You are an idiot',
    model: 'english-basic',
  }),
});

const result = await response.json();
console.log(result);`,
    },
    {
      title: "Python (requests)",
      code: `import requests

response = requests.post(
    '${baseUrl}/api/v1/moderate',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'text': 'You are an idiot',
        'model': 'english-basic',
    },
)

result = response.json()
print(result)`,
    },
    {
      title: "PHP",
      code: `<?php

$url = '${baseUrl}/api/v1/moderate';
$data = [
    'text' => 'You are an idiot',
    'model' => 'english-basic',
];

$options = [
    'http' => [
        'method' => 'POST',
        'header' => [
            'Authorization: Bearer YOUR_API_KEY',
            'Content-Type: application/json',
        ],
        'content' => json_encode($data),
    ],
];

$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
$result = json_decode($response, true);

var_dump($result);`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            CleanMod API Documentation
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Integrate text moderation into your application with CleanMod's
            simple REST API.
          </p>
        </header>

        {/* Authentication Section */}
        <section className="mb-12 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">
            Authentication
          </h2>
          <p className="mb-4 text-slate-700">
            All API requests require authentication using an API key. You can
            obtain an API key from your{" "}
            <Link
              href="/dashboard/api-keys"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              dashboard
            </Link>
            .
          </p>
          <p className="mb-4 text-slate-700">
            Include your API key in requests using one of the following methods:
          </p>
          <div className="mb-4 space-y-2">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Recommended: Authorization Header
              </p>
              <code className="block text-sm text-slate-900">
                Authorization: Bearer &lt;API_KEY&gt;
              </code>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Alternative: Custom Header
              </p>
              <code className="block text-sm text-slate-900">
                x-api-key: &lt;API_KEY&gt;
              </code>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-900">
              ⚠️ Security Warning
            </p>
            <p className="mt-1 text-sm text-amber-800">
              API keys are secret credentials. Never expose them in client-side
              JavaScript, public repositories, or client-side code. Always use
              server-side code or environment variables to store and use API
              keys.
            </p>
          </div>
        </section>

        {/* Endpoint Section */}
        <section className="mb-12 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">
            Moderate Text
          </h2>
          <p className="mb-4 text-slate-700">
            Analyze text content for toxicity, insults, threats, and other
            harmful content.
          </p>

          <div className="mb-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Endpoint
              </p>
              <code className="block rounded-lg bg-slate-50 p-3 text-sm text-slate-900 border border-slate-200">
                POST {baseUrl}/api/v1/moderate
              </code>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Content-Type
              </p>
              <code className="block rounded-lg bg-slate-50 p-3 text-sm text-slate-900 border border-slate-200">
                application/json
              </code>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">
              Request Body
            </h3>
            <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
              <pre className="text-sm text-slate-100">
                <code>{`{
  "text": "You are an idiot",
  "model": "english-basic"
}`}</code>
              </pre>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium">text</span> (required): The text
                content to moderate. Must be a non-empty string.
              </p>
              <p>
                <span className="font-medium">model</span> (optional): The
                moderation model to use. Defaults to{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  english-basic
                </code>
                .
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">
              Response Body
            </h3>
            <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
              <pre className="text-sm text-slate-100">
                <code>{`{
  "id": "log_abc123...",
  "model": "english-basic",
  "provider": "unitary",
  "providerModel": "unitary/multilingual-toxic-xlm-roberta",
  "decision": "flag",
  "overall_score": 0.91,
  "threshold": 0.8,
  "categories": {
    "toxicity": 0.91,
    "insult": 0.88
  },
  "created_at": "2025-11-16T15:00:00.000Z"
}`}</code>
              </pre>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium">id</span>: Unique identifier for
                this moderation log entry.
              </p>
              <p>
                <span className="font-medium">decision</span>: One of{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  allow
                </code>
                ,{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  flag
                </code>
                , or{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  block
                </code>
                .
              </p>
              <p>
                <span className="font-medium">overall_score</span>: Overall
                toxicity score (0-1), where higher values indicate more toxic
                content.
              </p>
              <p>
                <span className="font-medium">categories</span>: Per-category
                scores for different types of harmful content.
              </p>
            </div>
          </div>
        </section>

        {/* Errors Section */}
        <section className="mb-12 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">
            Error Responses
          </h2>
          <p className="mb-6 text-slate-700">
            The API returns standard HTTP status codes and JSON error responses.
          </p>

          <div className="space-y-6">
            {errorResponses.map((error) => (
              <div key={error.code}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={error.badgeClasses}>{error.code}</span>
                </div>
                <p className="mb-2 text-sm text-slate-700">
                  {error.description}
                </p>
                <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-100">
                    <code>{error.body}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Examples Section */}
        <section className="mb-12 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">
            Code Examples
          </h2>

          <div className="space-y-6">
            {codeExamples.map((example) => (
              <div key={example.title}>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  {example.title}
                </h3>
                <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-100">
                    <code>{example.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 pt-8 text-center text-sm text-slate-600">
          <p>
            Need help?{" "}
            <Link
              href="/dashboard"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Visit your dashboard
            </Link>{" "}
            to manage API keys and view usage.
          </p>
        </footer>
      </div>
    </div>
  );
}
