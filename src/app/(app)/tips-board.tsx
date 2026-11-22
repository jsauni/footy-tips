"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Notice, TeamBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { FixtureWithTeams, Team, Tip } from "@/lib/types";

type SaveState = "saving" | "saved" | "error";

export function TipsBoard({
  userId,
  fixtures,
  initialTips,
  marginFixtureId,
  serverNow,
}: {
  userId: string;
  fixtures: FixtureWithTeams[];
  initialTips: Tip[];
  marginFixtureId: number | null;
  serverNow: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [now, setNow] = useState(serverNow);
  const [tips, setTips] = useState<Record<number, Tip>>(() =>
    Object.fromEntries(initialTips.map((t) => [t.fixture_id, t])),
  );
  const [state, setState] = useState<Record<number, SaveState>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const marginTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  const isLocked = (f: FixtureWithTeams) =>
    f.status !== "scheduled" || now >= new Date(f.kickoff_at).getTime();

  async function persist(fixtureId: number, next: Tip, prev: Tip | undefined) {
    setState((s) => ({ ...s, [fixtureId]: "saving" }));
    setErrors((e) => ({ ...e, [fixtureId]: "" }));
    const { error } = await supabase.from("tips").upsert(
      { user_id: userId, fixture_id: fixtureId, team_id: next.team_id, margin: next.margin },
      { onConflict: "user_id,fixture_id" },
    );
    if (error) {
      setTips((t) => {
        const copy = { ...t };
        if (prev) copy[fixtureId] = prev;
        else delete copy[fixtureId];
        return copy;
      });
      setState((s) => ({ ...s, [fixtureId]: "error" }));
      setErrors((e) => ({
        ...e,
        [fixtureId]: /closed/i.test(error.message)
          ? "Tipping has closed for this match."
          : "Couldn’t save that tip. Check your connection and try again.",
      }));
      return;
    }
    setState((s) => ({ ...s, [fixtureId]: "saved" }));
  }

  function pick(f: FixtureWithTeams, teamId: string) {
    if (isLocked(f)) return;
    const prev = tips[f.id];
    if (prev?.team_id === teamId && state[f.id] !== "error") return;
    clearTimeout(marginTimers.current[f.id]); // this save carries the latest margin
    const next: Tip = { fixture_id: f.id, team_id: teamId, margin: prev?.margin ?? null };
    setTips((t) => ({ ...t, [f.id]: next }));
    void persist(f.id, next, prev);
  }

  function setMargin(f: FixtureWithTeams, margin: number | null) {
    const prev = tips[f.id];
    if (!prev || isLocked(f)) return;
    const clamped = margin === null ? null : Math.min(99, Math.max(1, Math.round(margin)));
    const next: Tip = { ...prev, margin: clamped };
    setTips((t) => ({ ...t, [f.id]: next }));
    clearTimeout(marginTimers.current[f.id]);
    marginTimers.current[f.id] = setTimeout(() => void persist(f.id, next, prev), 600);
  }

  const open = fixtures.filter((f) => !isLocked(f));
  const openTipped = open.filter((f) => tips[f.id]).length;
  const correct = fixtures.filter(
    (f) => f.status === "completed" && tips[f.id] && isCorrect(f, tips[f.id].team_id),
  ).length;
  const completed = fixtures.filter((f) => f.status === "completed").length;
  const needsMargin =
    marginFixtureId !== null &&
    tips[marginFixtureId] &&
    tips[marginFixtureId].margin === null &&
    open.some((f) => f.id === marginFixtureId);

  // Group by Sydney calendar day (stable between server and client).
  const groups = groupByDay(fixtures);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
        {open.length > 0 ? (
          <span>
            <strong>{openTipped}</strong> of {open.length} open games tipped
          </span>
        ) : (
          <span>All games locked</span>
        )}
        {completed > 0 ? (
          <span>
            Score: <strong>{correct}</strong>/{completed}
          </span>
        ) : null}
      </div>

      {needsMargin ? (
        <Notice tone="warn">Add a margin to your first game. It’s the tiebreaker.</Notice>
      ) : null}

      {groups.map(([day, games]) => (
        <section key={day} className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-muted">
            <LocalTime iso={games[0].kickoff_at} format="day" />
          </h2>
          {games.map((f) => (
            <FixtureCard
              key={f.id}
              fixture={f}
              tip={tips[f.id]}
              locked={isLocked(f)}
              isMarginGame={f.id === marginFixtureId}
              saveState={state[f.id]}
              error={errors[f.id]}
              onPick={(teamId) => pick(f, teamId)}
              onMargin={(m) => setMargin(f, m)}
            />
          ))}
        </section>
      ))}

      <p className="text-center text-xs text-muted">
        Tips save automatically and lock at each game’s kick-off.
      </p>
    </div>
  );
}

function isCorrect(f: FixtureWithTeams, teamId: string) {
  if (f.home_score === null || f.away_score === null) return false;
  if (f.home_score === f.away_score) return true; // draw: everyone who tipped scores
  const winner = f.home_score > f.away_score ? f.home_team_id : f.away_team_id;
  return teamId === winner;
}

function groupByDay(fixtures: FixtureWithTeams[]) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  const map = new Map<string, FixtureWithTeams[]>();
  for (const f of fixtures) {
    const key = fmt.format(new Date(f.kickoff_at));
    map.set(key, [...(map.get(key) ?? []), f]);
  }
  return [...map.entries()];
}

function FixtureCard({
  fixture: f,
  tip,
  locked,
  isMarginGame,
  saveState,
  error,
  onPick,
  onMargin,
}: {
  fixture: FixtureWithTeams;
  tip: Tip | undefined;
  locked: boolean;
  isMarginGame: boolean;
  saveState?: SaveState;
  error?: string;
  onPick: (teamId: string) => void;
  onMargin: (m: number | null) => void;
}) {
  const done = f.status === "completed";
  const result = done && tip ? (isCorrect(f, tip.team_id) ? "correct" : "wrong") : null;

  return (
    <article
      className={`rounded-2xl border bg-surface p-3 ${
        result === "correct"
          ? "border-accent/50"
          : result === "wrong"
            ? "border-danger/40"
            : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted">
        <span>
          <LocalTime iso={f.kickoff_at} format="time" />
          {f.venue ? ` · ${f.venue}` : ""}
        </span>
        <StatusPill fixture={f} locked={locked} saveState={saveState} tipped={!!tip} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <TeamButton
          team={f.home}
          side="home"
          selected={tip?.team_id === f.home_team_id}
          disabled={locked}
          score={done || f.status === "live" ? f.home_score : null}
          onClick={() => onPick(f.home_team_id)}
        />
        <span className="self-center text-xs font-semibold text-muted">v</span>
        <TeamButton
          team={f.away}
          side="away"
          selected={tip?.team_id === f.away_team_id}
          disabled={locked}
          score={done || f.status === "live" ? f.away_score : null}
          onClick={() => onPick(f.away_team_id)}
        />
      </div>

      {isMarginGame ? (
        <MarginRow tip={tip} locked={locked} fixture={f} onMargin={onMargin} />
      ) : null}

      {result ? (
        <p
          className={`mt-2 px-1 text-sm font-medium ${
            result === "correct" ? "text-accent" : "text-danger"
          }`}
        >
          {result === "correct" ? "✓ Correct tip" : "✗ Missed this one"}
        </p>
      ) : done && !tip ? (
        <p className="mt-2 px-1 text-sm text-muted">No tip</p>
      ) : null}

      {error ? <p className="mt-2 px-1 text-sm text-danger">{error}</p> : null}
    </article>
  );
}

function StatusPill({
  fixture: f,
  locked,
  saveState,
  tipped,
}: {
  fixture: FixtureWithTeams;
  locked: boolean;
  saveState?: SaveState;
  tipped: boolean;
}) {
  if (f.status === "completed") return <span className="font-semibold">Full time</span>;
  if (f.status === "postponed") return <span className="font-semibold text-warn-fg">Postponed</span>;
  if (f.status === "live") return <span className="font-semibold text-danger">● Live</span>;
  if (locked) return <span>Locked</span>;
  if (saveState === "saving") return <span>Saving…</span>;
  if (saveState === "saved") return <span className="text-accent">Saved ✓</span>;
  if (!tipped) return <span className="font-semibold text-warn-fg">Tip needed</span>;
  return null;
}

function TeamButton({
  team,
  side,
  selected,
  disabled,
  score,
  onClick,
}: {
  team: Team;
  side: "home" | "away";
  selected: boolean;
  disabled: boolean;
  score: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Tip ${team.name}${selected ? " (your tip)" : ""}`}
      className={`relative flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-center transition-colors ${
        selected
          ? "border-accent bg-accent-soft"
          : "border-transparent bg-surface-2 enabled:active:border-border"
      } ${disabled && !selected ? "opacity-60" : ""}`}
    >
      <TeamBadge team={team} size={40} />
      <span className="text-sm leading-tight font-semibold">{team.short_name}</span>
      <span className="text-[10px] tracking-wide text-muted uppercase">{side}</span>
      {score !== null ? (
        <span className="absolute top-1.5 right-2 font-mono text-lg font-bold">{score}</span>
      ) : null}
      {selected ? (
        <span className="absolute top-1.5 left-2 text-xs font-bold text-accent" aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  );
}

function MarginRow({
  tip,
  locked,
  fixture: f,
  onMargin,
}: {
  tip: Tip | undefined;
  locked: boolean;
  fixture: FixtureWithTeams;
  onMargin: (m: number | null) => void;
}) {
  const tipped = tip ? (tip.team_id === f.home_team_id ? f.home : f.away) : null;
  const stepCls =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-lg font-bold disabled:opacity-40";
  return (
    <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Margin game</p>
      {!tipped ? (
        <p className="mt-1 text-sm text-muted">
          {locked ? "No margin tipped." : "Pick a winner, then tip the margin."}
        </p>
      ) : (
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-sm">
            {tipped.short_name} by
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepCls}
              aria-label="Decrease margin"
              disabled={locked || (tip?.margin ?? 1) <= 1}
              onClick={() => onMargin((tip?.margin ?? 13) - 1)}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              disabled={locked}
              aria-label="Winning margin"
              className="h-10 w-16 rounded-lg border border-border bg-surface text-center font-mono font-bold"
              value={tip?.margin ?? ""}
              placeholder="–"
              onChange={(e) => onMargin(e.target.value === "" ? null : Number(e.target.value))}
            />
            <button
              type="button"
              className={stepCls}
              aria-label="Increase margin"
              disabled={locked || (tip?.margin ?? 0) >= 99}
              onClick={() => onMargin((tip?.margin ?? 12) + 1)}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
