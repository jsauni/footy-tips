"use client";

import { useState, useTransition } from "react";
import { CopyField } from "@/components/copy-field";
import { LocalTime } from "@/components/local-time";
import { btn, Card, Notice } from "@/components/ui";
import { claimPayment, setPaymentStatus, setPrizePaidOut, type ActionResult } from "@/lib/actions";
import { formatMoney } from "@/lib/format";
import type { Member, PaymentStatus } from "@/lib/types";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
    });
  return { pending, error, run };
}

// ---------------------------------------------------------------------------
// Member: how to pay + "I've paid"
// ---------------------------------------------------------------------------

export function MyPayment({
  competitionId,
  amountCents,
  payid,
  payeeName,
  instructions,
  organiserName,
  reference,
  status,
}: {
  competitionId: string;
  amountCents: number;
  payid: string | null;
  payeeName: string | null;
  instructions: string | null;
  organiserName: string;
  reference: string;
  status: PaymentStatus;
}) {
  const { pending, error, run } = useAction();

  if (status === "paid") {
    return (
      <Notice tone="success">
        ✓ Your {formatMoney(amountCents)} buy-in is confirmed. You’re in the running for the prize.
      </Notice>
    );
  }

  if (status === "claimed") {
    return (
      <Card className="space-y-2">
        <p className="font-semibold">Payment sent, waiting for {organiserName} to confirm</p>
        <p className="text-sm text-muted">
          They’ll tick you off once it shows up in their account. Reference{" "}
          <span className="font-mono font-semibold">{reference}</span>.
        </p>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <button
          type="button"
          className="text-sm text-muted underline"
          disabled={pending}
          onClick={() => run(() => claimPayment(competitionId, false))}
        >
          I haven’t actually paid yet (undo)
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-warn-fg uppercase">Buy-in due</p>
        <h2 className="text-lg font-semibold">Pay {organiserName}</h2>
        <p className="text-sm text-muted">
          Transfer from your banking app, then tap “I’ve paid”. Include the reference so they can
          match it to you.
        </p>
      </div>
      <div className="divide-y divide-border rounded-xl bg-surface-2 px-3">
        <CopyField label="Amount" value={formatMoney(amountCents)} copyValue={(amountCents / 100).toFixed(2)} />
        {payid ? <CopyField label="PayID" value={payid} /> : null}
        {payeeName ? <CopyField label="Account name" value={payeeName} /> : null}
        <CopyField label="Reference" value={reference} mono />
      </div>
      {instructions ? (
        <p className="text-sm">
          <span className="text-muted">Note from {organiserName}:</span> {instructions}
        </p>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button
        type="button"
        className={`${btn.primary} w-full`}
        disabled={pending}
        onClick={() => run(() => claimPayment(competitionId, true))}
      >
        {pending ? "Saving…" : "I’ve paid"}
      </button>
      <p className="text-xs text-muted">
        You’re paying {organiserName} directly. This app never handles money.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Organiser: confirm / chase payments
// ---------------------------------------------------------------------------

export function OrganiserPayments({
  competitionId,
  amountCents,
  members,
}: {
  competitionId: string;
  amountCents: number;
  members: Member[];
}) {
  const { pending, error, run } = useAction();
  const by = (s: PaymentStatus) =>
    members
      .filter((m) => m.payment_status === s)
      .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
  const claimed = by("claimed");
  const unpaid = by("unpaid");
  const paid = by("paid");
  const set = (userId: string, status: PaymentStatus) =>
    run(() => setPaymentStatus(competitionId, userId, status));

  const row = "flex items-center justify-between gap-3 px-4 py-3";
  const name = (m: Member) => m.display_name ?? "New player";

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Payments</h2>
      {error ? <Notice tone="error">{error}</Notice> : null}

      {claimed.length ? (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-warn-fg">
            Check your bank: {claimed.length} to confirm
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-warn-fg/30 bg-surface">
            {claimed.map((m) => (
              <li key={m.user_id} className="space-y-2 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{name(m)}</span>
                  <span className="shrink-0 font-mono text-sm">{m.payment_reference}</span>
                </div>
                <p className="text-xs text-muted">
                  Says they paid {formatMoney(amountCents)}
                  {m.payment_claimed_at ? (
                    <>
                      {" "}
                      on <LocalTime iso={m.payment_claimed_at} />
                    </>
                  ) : null}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={btn.small}
                    disabled={pending}
                    onClick={() => set(m.user_id, "unpaid")}
                  >
                    Not received
                  </button>
                  <button
                    type="button"
                    className={btn.smallPrimary}
                    disabled={pending}
                    onClick={() => set(m.user_id, "paid")}
                  >
                    Received ✓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {unpaid.length ? (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-muted">Not paid yet ({unpaid.length})</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {unpaid.map((m) => (
              <li key={m.user_id} className={row}>
                <span className="min-w-0">
                  <span className="block truncate">{name(m)}</span>
                  <span className="font-mono text-xs text-muted">{m.payment_reference}</span>
                </span>
                <button
                  type="button"
                  className={btn.small}
                  disabled={pending}
                  onClick={() => set(m.user_id, "paid")}
                >
                  Mark paid
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">Use “Mark paid” for cash, or for your own buy-in.</p>
        </div>
      ) : null}

      {paid.length ? (
        <details className="rounded-2xl border border-border bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
            Paid ({paid.length})
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {paid.map((m) => (
              <li key={m.user_id} className={row}>
                <span className="truncate">✓ {name(m)}</span>
                <button
                  type="button"
                  className="text-sm text-muted underline"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Mark ${name(m)} as not paid?`)) set(m.user_id, "unpaid");
                  }}
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// End of season: who to pay
// ---------------------------------------------------------------------------

export function Payout({
  competitionId,
  isOwner,
  poolCents,
  winners,
  paidOutAt,
  organiserName,
}: {
  competitionId: string;
  isOwner: boolean;
  poolCents: number;
  winners: { user_id: string; display_name: string }[];
  paidOutAt: string | null;
  organiserName: string;
}) {
  const { pending, error, run } = useAction();
  const each = Math.floor(poolCents / Math.max(1, winners.length));
  const remainder = poolCents - each * winners.length;

  return (
    <Card className="space-y-3 border-accent/50">
      <p className="text-xs font-semibold tracking-wide text-accent uppercase">Season complete</p>
      <h2 className="text-lg font-semibold">
        {winners.length === 1 ? "Winner" : `${winners.length}-way tie`}:{" "}
        {winners.map((w) => w.display_name).join(", ")}
      </h2>
      <p className="text-sm">
        {winners.length === 1
          ? `${formatMoney(poolCents)} prize pool.`
          : `${formatMoney(poolCents)} split evenly: ${formatMoney(each)} each${
              remainder ? ` (${formatMoney(remainder)} left over, so agree as a group)` : ""
            }.`}
      </p>
      {paidOutAt ? (
        <Notice tone="success">
          {isOwner ? "You" : organiserName} marked the prize as paid out on{" "}
          <LocalTime iso={paidOutAt} format="day" />.
        </Notice>
      ) : isOwner ? (
        <p className="text-sm text-muted">
          Pay the winner{winners.length > 1 ? "s" : ""} from your own account, then record it here so
          everyone can see it’s done.
        </p>
      ) : (
        <p className="text-sm text-muted">Waiting for {organiserName} to pay out.</p>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {isOwner ? (
        paidOutAt ? (
          <button
            type="button"
            className="text-sm text-muted underline"
            disabled={pending}
            onClick={() => run(() => setPrizePaidOut(competitionId, false))}
          >
            Undo “paid out”
          </button>
        ) : (
          <button
            type="button"
            className={`${btn.primary} w-full`}
            disabled={pending}
            onClick={() => {
              if (confirm("Confirm you’ve paid the prize to the winner(s)?")) {
                run(() => setPrizePaidOut(competitionId, true));
              }
            }}
          >
            I’ve paid the prize
          </button>
        )
      ) : null}
    </Card>
  );
}
