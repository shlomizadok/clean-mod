"use client";

import { useState, useTransition } from "react";
import { createApiKey } from "../actions";

type ApiKey = {
  id: string;
  name: string;
  isActive: boolean;
};

type ApiKeyActionsProps = {
  keys: ApiKey[];
};

export function ApiKeyActions({}: ApiKeyActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<{ rawKey: string; name: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createApiKey();
      if (result.success) {
        setNewKey({ rawKey: result.rawKey, name: result.name });
        setShowModal(true);
      } else {
        setError(result.error);
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          {error && (
            <div className="mb-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Creating..." : "Create API Key"}
        </button>
      </div>

      {/* Modal for displaying new key */}
      {showModal && newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              API Key Created
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              Your new API key has been created. Make sure to copy it now - you
              won't be able to see it again!
            </p>

            <div className="mt-4 rounded-lg bg-slate-900 p-4">
              <div className="mb-2 text-xs font-medium text-slate-400">
                {newKey.name}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all text-xs font-mono text-slate-100">
                  {newKey.rawKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey.rawKey)}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                ⚠️ This is the only time you'll see this key. Store it securely.
              </p>
            </div>

            <button
              onClick={() => {
                setShowModal(false);
                setNewKey(null);
              }}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              I've copied the key
            </button>
          </div>
        </div>
      )}
    </>
  );
}
