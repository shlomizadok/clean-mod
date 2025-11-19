"use client";

import { useState, useTransition } from "react";
import { deactivateApiKey } from "../actions";

type DeactivateButtonProps = {
  keyId: string;
  isActive: boolean;
};

export function DeactivateButton({ keyId, isActive }: DeactivateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = () => {
    if (!confirm("Are you sure you want to deactivate this API key?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deactivateApiKey(keyId);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  if (!isActive) {
    return (
      <span className="text-xs text-slate-400 italic">Already inactive</span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDeactivate}
        disabled={isPending}
        className="rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Deactivating..." : "Deactivate"}
      </button>
      {error && (
        <span className="text-xs text-rose-600" title={error}>
          Failed
        </span>
      )}
    </div>
  );
}
