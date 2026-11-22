import Link from "next/link";
import { Suspense } from "react";
import { Card, Notice, Skeleton } from "@/components/ui";
import {
  getCurrentSeason,
  getCurrentUser,
  getMyCompetitions,
  getMyTips,
  getSeasonFixtures,
  getTeams,
  pickCurrentRound,
  requestNow,
  summariseRounds,
} from "@/lib/data";
import { formatMoney, marginGameId } from "@/lib/format";
import { TipsBoard } from "./tips-board";

export default function TipsPage(props: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <PaymentReminders />
      </Suspense>
      <Suspense fallback={<Skeleton rows={6} />}>
        <Tips searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

/** Nudges for unpaid buy-ins (players) and payments awaiting confirmation (organisers). */
async function PaymentReminders() {
  const user = await getCurrentUser();
  const comps = await getMyCompetitions(user.id);
  const owe = comps.filter(
    (c) => c.buy_in_cents && c.role !== "owner" && c.payment_status === "unpaid",
  );
  const confirm = comps.filter((c) => c.to_confirm > 0);
  if (!owe.length && !confirm.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {owe.map((c) => (
        <Link key={c.id} href={`/comps/${c.id}`} className="block">
          <Notice tone="warn">
            Your {formatMoney(c.buy_in_cents!)} buy-in for <strong>{c.name}</strong> isn’t paid yet.{" "}
            <span className="font-semibold underline">Pay now ›</span>
          </Notice>
        </Link>
      ))}
      {confirm.map((c) => (
        <Link key={c.id} href={`/comps/${c.id}`} className="block">
          <Notice tone="info">
            {c.to_confirm} {c.to_confirm === 1 ? "payment" : "payments"} to confirm in{" "}
            <strong>{c.name}</strong>. <span className="font-semibold underline">Check ›</span>
          </Notice>
        </Link>
      ))}
    </div>
  );
}

async function Tips({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const user = await getCurrentUser();
  const season = await getCurrentSeason();
  const [fixtures, teams, sp] = await Promise.all([
    getSeasonFixtures(season),
    getTeams(),
    searchParams,
  ]);

  if (fixtures.length === 0) {
    return (
      <Card>
        <h1 className="text-xl font-bold">No fixtures yet</h1>
        <p className="mt-2 text-muted">
          The {season} draw hasn’t been loaded. Check back closer to round 1.
        </p>
      </Card>
    );
  }

  const rounds = summariseRounds(fixtures);
  const requested = Number(Array.isArray(sp.round) ? sp.round[0] : sp.round);
  const round = rounds.some((r) => r.round === requested) ? requested : pickCurrentRound(fixtures)!;
  const idx = rounds.findIndex((r) => r.round === round);
  const prev = rounds[idx - 1];
  const next = rounds[idx + 1];

  const roundFixtures = fixtures.filter((f) => f.round === round);
  const tips = await getMyTips(user.id, roundFixtures.map((f) => f.id));
  const playing = new Set(roundFixtures.flatMap((f) => [f.home_team_id, f.away_team_id]));
  const byes = teams.filter((t) => !playing.has(t.id));

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-2">
        <RoundLink round={prev?.round} label="Previous round" dir="prev" />
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">{rounds[idx].label}</h1>
          <p className="text-xs text-muted">{season} season</p>
        </div>
        <RoundLink round={next?.round} label="Next round" dir="next" />
      </header>

      <TipsBoard
        key={round}
        userId={user.id}
        fixtures={roundFixtures}
        initialTips={tips}
        marginFixtureId={marginGameId(roundFixtures)}
        serverNow={requestNow()}
      />

      {byes.length > 0 ? (
        <p className="mt-4 text-center text-sm text-muted">
          Bye: {byes.map((t) => t.short_name).join(", ")}
        </p>
      ) : null}
    </>
  );
}

function RoundLink({ round, label, dir }: { round?: number; label: string; dir: "prev" | "next" }) {
  const cls =
    "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg";
  const arrow = dir === "prev" ? "‹" : "›";
  if (round === undefined) {
    return (
      <span className={`${cls} opacity-30`} aria-hidden>
        {arrow}
      </span>
    );
  }
  return (
    <Link href={`/?round=${round}`} className={cls} aria-label={label} prefetch={true}>
      {arrow}
    </Link>
  );
}
