import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTitle, Skeleton } from "@/components/ui";
import {
  getCurrentSeason,
  getSeasonFixtures,
  getSeasons,
  getTeams,
  isAdmin,
  pickCurrentRound,
  summariseRounds,
} from "@/lib/data";
import { AdminTabs } from "./admin-tabs";
import { AddGamePanel, FixtureEditor, FixtureForm } from "./fixture-editor";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <>
      <PageTitle title="Admin" />
      <Suspense fallback={<Skeleton rows={6} />}>
        <Admin searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const chip = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-sm ${
    active ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border bg-surface"
  }`;

async function Admin({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  if (!(await isAdmin())) notFound();
  const sp = await searchParams;
  const [current, seasons, teams] = await Promise.all([getCurrentSeason(), getSeasons(), getTeams()]);
  const requestedSeason = Number(first(sp.season));
  const season = requestedSeason >= 2000 && requestedSeason <= 2100 ? requestedSeason : current;
  const seasonChoices = [...new Set([...seasons, current, season, Math.max(current, ...seasons) + 1])].sort();

  const fixtures = await getSeasonFixtures(season);
  const rounds = summariseRounds(fixtures);
  const requestedRound = Number(first(sp.round));
  const round =
    requestedRound >= 1 && requestedRound <= 40
      ? requestedRound
      : (pickCurrentRound(fixtures) ?? 1);
  const nextRound = Math.min(40, Math.max(0, ...rounds.map((r) => r.round)) + 1);
  const games = fixtures.filter((f) => f.round === round);
  const label = rounds.find((r) => r.round === round)?.label ?? `Round ${round}`;

  return (
    <div className="space-y-4">
      <AdminTabs active="fixtures" />
      <p className="text-sm text-muted">
        Add each round’s games, then enter the score and set <strong>Full time</strong> after each
        game. Ladders update straight away.
      </p>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Season">
        {seasonChoices.map((s) => (
          <Link key={s} href={`/admin?season=${s}`} className={chip(s === season)}>
            {s}
          </Link>
        ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Round">
        {rounds.map((r) => (
          <Link key={r.round} href={`/admin?season=${season}&round=${r.round}`} className={chip(r.round === round)}>
            {r.label}
          </Link>
        ))}
        {!rounds.some((r) => r.round === round) ? (
          <span className={chip(true)}>{label}</span>
        ) : null}
        {nextRound !== round ? (
          <Link href={`/admin?season=${season}&round=${nextRound}`} className={chip(false)}>
            + Round {nextRound}
          </Link>
        ) : null}
      </div>

      <h2 className="text-lg font-semibold">
        {season} · {label}{" "}
        <span className="text-sm font-normal text-muted">
          ({games.length} game{games.length === 1 ? "" : "s"})
        </span>
      </h2>

      {games.map((f) => (
        <FixtureEditor key={f.id} fixture={f} teams={teams} />
      ))}

      <AddGamePanel key={`${season}-${round}`} label={label} startOpen={games.length === 0}>
        <FixtureForm teams={teams} season={season} round={round} />
      </AddGamePanel>
    </div>
  );
}
