import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LadderTable } from "@/components/ladder-table";
import { Card, Skeleton } from "@/components/ui";
import {
  getCompetition,
  getCurrentUser,
  getLadder,
  getMembers,
  isSeasonComplete,
} from "@/lib/data";
import { formatMoney } from "@/lib/format";
import type { LadderRow } from "@/lib/types";
import { CompSettings, InviteShare, MemberAdmin } from "./comp-client";
import { MyPayment, OrganiserPayments, Payout } from "./payments";

export const metadata: Metadata = { title: "Competition" };

export default function CompPage(props: PageProps<"/comps/[id]">) {
  return (
    <>
      <Link href="/comps" className="mb-3 inline-block text-sm text-muted">
        ‹ Competitions
      </Link>
      <Suspense fallback={<Skeleton rows={6} />}>
        <Comp params={props.params} />
      </Suspense>
    </>
  );
}

/** Best-ranked members whose buy-in is confirmed (ties share the pot). */
function prizeWinners(ladder: LadderRow[], paidIds: Set<string>) {
  const eligible = ladder.filter((r) => paidIds.has(r.user_id));
  const top = eligible[0];
  if (!top) return [];
  return eligible.filter((r) => r.points === top.points && r.margin_error === top.margin_error);
}

async function Comp({ params }: { params: PageProps<"/comps/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  const comp = await getCompetition(id);
  if (!comp) notFound(); // also covers "not a member" (RLS hides it)

  const [members, ladder, seasonDone] = await Promise.all([
    getMembers(id),
    getLadder(comp.season, id),
    isSeasonComplete(comp.season),
  ]);
  const isOwner = comp.owner_id === user.id;
  const me = members.find((m) => m.user_id === user.id);
  const organiser = members.find((m) => m.user_id === comp.owner_id);
  const organiserName = isOwner ? "you" : (organiser?.display_name ?? "the organiser");
  const paidIds = new Set(members.filter((m) => m.has_paid).map((m) => m.user_id));
  const statusById = new Map(members.map((m) => [m.user_id, m.payment_status]));
  const buyIn = comp.buy_in_cents;
  const pool = buyIn ? buyIn * paidIds.size : 0;
  const winners = buyIn && seasonDone ? prizeWinners(ladder, paidIds) : [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{comp.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {comp.season} season · {members.length} {members.length === 1 ? "player" : "players"}
          {isOwner ? " · You’re the organiser" : ""}
        </p>
      </header>

      {buyIn ? (
        <Card className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Prize pool</p>
              <p className="font-mono text-3xl font-bold">{formatMoney(pool)}</p>
            </div>
            <p className="text-right text-sm text-muted">
              {formatMoney(buyIn)} buy-in
              <br />
              {paidIds.size} of {members.length} paid
            </p>
          </div>
          <p className="text-sm">
            Winner takes all at the end of the season. Ties split evenly. Only paid-up players can
            win.
          </p>
          <p className="text-xs text-muted">
            Money is held and paid out by the organiser, not by this app.{" "}
            <Link href="/rules#buy-ins" className="underline">
              Buy-in rules
            </Link>
          </p>
        </Card>
      ) : null}

      {buyIn && winners.length ? (
        <Payout
          competitionId={comp.id}
          isOwner={isOwner}
          poolCents={pool}
          winners={winners.map((w) => ({ user_id: w.user_id, display_name: w.display_name }))}
          paidOutAt={comp.prize_paid_out_at}
          organiserName={organiser?.display_name ?? "the organiser"}
        />
      ) : null}

      {buyIn && me && !isOwner ? (
        <MyPayment
          competitionId={comp.id}
          amountCents={buyIn}
          payid={comp.payid}
          payeeName={comp.payee_name}
          instructions={comp.payment_instructions}
          organiserName={organiserName}
          reference={me.payment_reference}
          status={me.payment_status}
        />
      ) : null}

      {buyIn && isOwner ? (
        <OrganiserPayments competitionId={comp.id} amountCents={buyIn} members={members} />
      ) : null}

      <InviteShare code={comp.invite_code} name={comp.name} />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Ladder</h2>
        <LadderTable
          rows={ladder}
          meId={user.id}
          badge={
            buyIn
              ? (uid) => {
                  const s = statusById.get(uid);
                  if (s === "paid") return null;
                  return (
                    <span className="rounded bg-warn-soft px-1.5 text-[10px] font-semibold text-warn-fg">
                      {s === "claimed" ? "PENDING" : "UNPAID"}
                    </span>
                  );
                }
              : undefined
          }
        />
      </section>

      {isOwner ? (
        <>
          <MemberAdmin
            competitionId={comp.id}
            ownerId={comp.owner_id}
            members={members
              .slice()
              .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""))}
          />
          <CompSettings comp={comp} />
        </>
      ) : (
        <CompSettings comp={comp} memberOnly hasPaid={me?.payment_status === "paid"} />
      )}
    </div>
  );
}
