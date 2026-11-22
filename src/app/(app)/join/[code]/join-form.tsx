"use client";

import Link from "next/link";
import { useActionState } from "react";
import { btn, Notice } from "@/components/ui";
import { joinCompetition } from "@/lib/actions";

export function JoinForm({ code, hasBuyIn }: { code: string; hasBuyIn: boolean }) {
  const [state, action, pending] = useActionState(joinCompetition, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      {hasBuyIn ? (
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="confirm_adult" required className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            I’m 18 or over, I know the organiser personally, and I understand the buy-in is
            arranged privately with them. See the{" "}
            <Link href="/rules#buy-ins" className="underline" target="_blank">
              buy-in rules
            </Link>
            .
          </span>
        </label>
      ) : null}
      {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
      <button className={`${btn.primary} w-full`} disabled={pending}>
        {pending ? "Joining…" : "Join competition"}
      </button>
    </form>
  );
}
