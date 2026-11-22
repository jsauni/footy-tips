"use client";

import { useState } from "react";

/** A label/value row with a one-tap copy button (for PayID, amount, reference). */
export function CopyField({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string;
  value: string;
  copyValue?: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the value is still visible to copy by hand.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className={`truncate font-semibold ${mono ? "font-mono tracking-wide" : ""}`}>{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="h-9 shrink-0 rounded-lg border border-border bg-surface px-3 text-sm font-semibold active:bg-surface-2"
        aria-label={`Copy ${label}`}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
