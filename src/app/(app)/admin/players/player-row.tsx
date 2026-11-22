"use client";

import { useState, useTransition, type ReactNode } from "react";
import { btn, input, Notice } from "@/components/ui";
import { adminRemovePlayer, adminRenamePlayer, adminUnblockEmail } from "@/lib/actions";
import type { AdminPlayer } from "@/lib/data";

export function PlayerRow({
  player: p,
  isMe,
  joined,
}: {
  player: AdminPlayer;
  isMe: boolean;
  joined: ReactNode;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "remove">("view");
  const [name, setName] = useState(p.display_name ?? "");
  const [block, setBlock] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else setMode("view");
    });

  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {p.display_name ?? <span className="text-muted">No name yet</span>}
            {p.is_admin ? <span className="ml-2 text-xs font-semibold text-accent">ADMIN</span> : null}
            {isMe ? <span className="ml-1 text-xs text-muted">(you)</span> : null}
          </p>
          <p className="truncate text-sm text-muted">{p.email}</p>
          <p className="text-xs text-muted">Joined {joined}</p>
        </div>
        {mode === "view" ? (
          <div className="flex shrink-0 gap-2">
            <button type="button" className={btn.small} onClick={() => setMode("rename")}>
              Rename
            </button>
            {!isMe && !p.is_admin ? (
              <button
                type="button"
                className={`${btn.small} text-danger`}
                onClick={() => setMode("remove")}
              >
                Remove
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {mode === "rename" ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => adminRenamePlayer(p.id, name));
          }}
        >
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={30}
            required
            aria-label={`New name for ${p.display_name ?? p.email}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btn.small} onClick={() => setMode("view")}>
              Cancel
            </button>
            <button className={btn.smallPrimary} disabled={pending}>
              {pending ? "Saving…" : "Save name"}
            </button>
          </div>
        </form>
      ) : null}

      {mode === "remove" ? (
        <div className="space-y-2 rounded-xl bg-danger-soft p-3 text-sm">
          <p>
            <strong>Remove {p.display_name ?? p.email}?</strong> Their account, tips and comp
            memberships are deleted. This can’t be undone.
          </p>
          {p.owned_comps_with_others > 0 ? (
            <p className="font-semibold text-danger">
              They run {p.owned_comps_with_others} competition
              {p.owned_comps_with_others === 1 ? "" : "s"} with other players. Removing them deletes
              those competitions for everyone.
            </p>
          ) : null}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={block}
              onChange={(e) => setBlock(e.target.checked)}
            />
            Block this email from signing up again
          </label>
          {block ? (
            <input
              className={input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Reason (only admins see this)"
              aria-label="Reason for blocking"
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btn.small} onClick={() => setMode("view")}>
              Cancel
            </button>
            <button
              type="button"
              className={`${btn.small} border-danger text-danger`}
              disabled={pending}
              onClick={() => run(() => adminRemovePlayer(p.id, { block, note }))}
            >
              {pending ? "Removing…" : "Remove player"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
    </li>
  );
}

export function BlockedEmail({ email, note }: { email: string; note: string | null }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="block truncate text-sm">{email}</span>
        {note ? <span className="block truncate text-xs text-muted">{note}</span> : null}
      </span>
      <button
        type="button"
        className="shrink-0 text-sm text-muted underline"
        disabled={pending}
        onClick={() => start(async () => void (await adminUnblockEmail(email)))}
      >
        Unblock
      </button>
    </li>
  );
}
