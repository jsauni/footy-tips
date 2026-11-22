"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { PaymentFields } from "@/components/payment-fields";
import { btn, Card, input, Notice } from "@/components/ui";
import {
  deleteCompetition,
  leaveCompetition,
  removeMember,
  renameCompetition,
} from "@/lib/actions";
import type { Competition, Member } from "@/lib/types";

export function InviteShare({ code, name }: { code: string; name: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only values
    setUrl(`${window.location.origin}/join/${code}`);
    setCanShare(typeof navigator.share === "function");
  }, [code]);

  async function share() {
    if (canShare) {
      try {
        await navigator.share({ title: name, text: `Join my tipping comp "${name}"`, url });
        return;
      } catch {
        // cancelled: fall through to copy
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Invite code</p>
        <p className="font-mono text-xl font-bold tracking-widest">{code}</p>
      </div>
      <button type="button" className={btn.primary} onClick={share} disabled={!url}>
        {copied ? "Link copied" : canShare ? "Share invite" : "Copy link"}
      </button>
    </Card>
  );
}

export function MemberAdmin({
  competitionId,
  ownerId,
  members,
}: {
  competitionId: string;
  ownerId: string;
  members: Member[];
}) {
  const [pending, start] = useTransition();
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Members</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 truncate">
              {m.display_name ?? "New player"}
              {m.user_id === ownerId ? <span className="ml-1 text-xs text-muted">(organiser)</span> : null}
            </span>
            {m.user_id !== ownerId ? (
              <button
                type="button"
                className="shrink-0 px-2 text-sm text-danger"
                disabled={pending}
                onClick={() => {
                  const who = m.display_name ?? "this player";
                  const msg =
                    m.payment_status === "paid"
                      ? `Remove ${who}? They've paid, so refund their buy-in.`
                      : `Remove ${who} from the comp?`;
                  if (confirm(msg)) start(() => removeMember(competitionId, m.user_id));
                }}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompSettings({
  comp,
  memberOnly = false,
  hasPaid = false,
}: {
  comp: Competition;
  memberOnly?: boolean;
  hasPaid?: boolean;
}) {
  const [state, action, saving] = useActionState(renameCompetition, undefined);
  const [pending, start] = useTransition();

  if (memberOnly) {
    return (
      <div className="pt-2">
        <button
          type="button"
          className={`${btn.danger} w-full`}
          disabled={pending}
          onClick={() => {
            const msg = hasPaid
              ? "Leave this competition? Ask the organiser for your buy-in back. Your tips still count on the public ladder."
              : "Leave this competition? Your tips still count on the public ladder.";
            if (confirm(msg)) start(() => leaveCompetition(comp.id));
          }}
        >
          Leave competition
        </button>
      </div>
    );
  }

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold">Settings</summary>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="id" value={comp.id} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Name</span>
          <input className={input} name="name" defaultValue={comp.name} minLength={3} maxLength={40} required />
        </label>
        {comp.buy_in_cents ? (
          <>
            <PaymentFields
              payid={comp.payid}
              payeeName={comp.payee_name}
              instructions={comp.payment_instructions}
            />
            <p className="text-xs text-muted">The buy-in amount can’t be changed after creation.</p>
          </>
        ) : null}
        {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
        {state && !state.error ? <Notice tone="success">Saved.</Notice> : null}
        <button className={`${btn.secondary} w-full`} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
      <button
        type="button"
        className={`${btn.danger} mt-6 w-full`}
        disabled={pending}
        onClick={() => {
          const warn = comp.buy_in_cents
            ? "Delete this competition for everyone? Refund any buy-ins you've collected first."
            : "Delete this competition for everyone?";
          if (confirm(warn)) start(() => deleteCompetition(comp.id));
        }}
      >
        Delete competition
      </button>
    </details>
  );
}
