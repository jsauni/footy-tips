import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { btn, Card, PageTitle, Skeleton } from "@/components/ui";
import { getCurrentUser, getMyCompetitions } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { JoinByCode } from "./join-by-code";

export const metadata: Metadata = { title: "Competitions" };

export default function CompsPage() {
  return (
    <>
      <PageTitle
        title="Competitions"
        subtitle="Private comps with friends and family. Your tips count in every comp you’re in."
      />
      <div className="mb-6 grid grid-cols-1 gap-3">
        <Link href="/comps/new" className={btn.primary}>
          + Create a competition
        </Link>
        <JoinByCode />
      </div>
      <Suspense fallback={<Skeleton rows={3} />}>
        <MyComps />
      </Suspense>
    </>
  );
}

async function MyComps() {
  const user = await getCurrentUser();
  const comps = await getMyCompetitions(user.id);

  if (comps.length === 0) {
    return (
      <Card className="text-center">
        <p className="font-semibold">You’re not in any private comps yet</p>
        <p className="mt-1 text-sm text-muted">
          You’re still on the public ladder. Create a comp or join one with an invite code.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {comps.map((c) => (
        <li key={c.id}>
          <Link
            href={`/comps/${c.id}`}
            prefetch={true}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 active:bg-surface-2"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-sm text-muted">
                {c.season} · {c.role === "owner" ? "Organiser" : "Member"}
                {c.buy_in_cents ? ` · ${formatMoney(c.buy_in_cents)} buy-in` : ""}
              </p>
            </div>
            {c.to_confirm > 0 ? (
              <span className="shrink-0 rounded-full bg-warn-soft px-2 py-1 text-xs font-semibold text-warn-fg">
                {c.to_confirm} to confirm
              </span>
            ) : c.buy_in_cents && c.role !== "owner" && c.payment_status === "unpaid" ? (
              <span className="shrink-0 rounded-full bg-warn-soft px-2 py-1 text-xs font-semibold text-warn-fg">
                Pay {formatMoney(c.buy_in_cents)}
              </span>
            ) : c.buy_in_cents && c.role !== "owner" && c.payment_status === "claimed" ? (
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-muted">
                Pending
              </span>
            ) : (
              <span className="text-muted" aria-hidden>
                ›
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
