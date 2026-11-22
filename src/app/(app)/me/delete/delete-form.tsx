"use client";

import { startTransition, useActionState, useState } from "react";
import { btn, input, Notice } from "@/components/ui";
import { deleteMyAccount } from "@/lib/actions";

export function DeleteAccountForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(deleteMyAccount, undefined);
  const [confirm, setConfirm] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </span>
        <input
          className={input}
          name="confirm"
          autoComplete="off"
          autoCapitalize="characters"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={disabled}
        />
      </label>
      {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
      <button
        className={`${btn.danger} w-full`}
        disabled={disabled || pending || confirm.trim().toUpperCase() !== "DELETE"}
      >
        {pending ? "Deleting…" : "Permanently delete my account"}
      </button>
    </form>
  );
}
