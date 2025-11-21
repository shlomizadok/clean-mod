"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "../actions";

type PreviewToggleProps = {
  initialValue: boolean;
  label: string;
};

export function PreviewToggle({ initialValue, label }: PreviewToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(initialValue);

  const handleToggle = (newValue: boolean) => {
    setError(null);
    setValue(newValue);
    startTransition(async () => {
      const result = await updateProfile({ allowInputPreview: newValue });
      if (!result.success) {
        setError(result.error);
        // Revert on error
        setValue(!newValue);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => handleToggle(!value)}
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            value ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {isPending && <span className="text-xs text-slate-500">Saving...</span>}
      </div>
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
