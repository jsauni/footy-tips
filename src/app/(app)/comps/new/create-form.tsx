"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { PaymentFields } from "@/components/payment-fields";
import { btn, input, Notice } from "@/components/ui";
import { createCompetition } from "@/lib/actions";

export function CreateCompForm() {
  const [state, action, pending] = useActionState(createCompetition, undefined);
  const [hasBuyIn, setHasBuyIn] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        // Submit via a transition so React doesn't clear the form on a validation error.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Competition name</span>
        <input
          className={input}
          name="name"
          required
          minLength={3}
          maxLength={40}
          placeholder="e.g. Smith Family Tipping"
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <span>
          <span className="block font-medium">Add a buy-in</span>
          <span className="block text-sm text-muted">Winner takes all at the end of the season</span>
        </span>
        <input
          type="checkbox"
          name="has_buy_in"
          className="h-6 w-6 accent-[var(--accent)]"
          checked={hasBuyIn}
          onChange={(e) => setHasBuyIn(e.target.checked)}
        />
      </label>

      {hasBuyIn ? (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Buy-in per person (AUD)</span>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-muted">$</span>
              <input
                className={`${input} pl-8`}
                name="buy_in"
                type="number"
                inputMode="decimal"
                min={1}
                max={500}
                step="0.01"
                required
                placeholder="20"
              />
            </div>
            <span className="mt-1 block text-xs text-muted">Max $500 per person.</span>
          </label>

          <PaymentFields />

          <Notice tone="warn">
            <strong>This app never handles money.</strong> Players transfer buy-ins straight to
            you, tap “I’ve paid”, and you confirm when it lands. You pay the winner at the end of the
            season.
          </Notice>

          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="confirm_adult" required className="mt-0.5 h-5 w-5 shrink-0" />
            <span>I am 18 or over.</span>
          </label>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="confirm_organiser" required className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              I’m the organiser and responsible for holding the money. I’ll pay{" "}
              <strong>100% of buy-ins</strong> to the winner (split evenly if tied), take no cut or
              fee, and only invite people I know personally. I’ve read the{" "}
              <Link href="/terms#buy-ins" className="underline" target="_blank">
                buy-in terms
              </Link>
              .
            </span>
          </label>
        </div>
      ) : null}

      {state?.error ? <Notice tone="error">{state.error}</Notice> : null}

      <button className={`${btn.primary} w-full`} disabled={pending}>
        {pending ? "Creating…" : "Create competition"}
      </button>
    </form>
  );
}
