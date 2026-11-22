"use client";

import { useActionState, useState, useTransition } from "react";
import { LocalTime } from "@/components/local-time";
import { btn, input, Notice } from "@/components/ui";
import { deleteFixture, saveFixture, updateResult } from "@/lib/actions";
import type { FixtureWithTeams, Team } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const select = "h-11 w-full rounded-xl border border-border bg-surface px-3";

// "+ Add a game" panel. Open by default for an empty round, then the admin
// controls it: adding the first game mustn't collapse it on refresh.
export function AddGamePanel({
  label,
  startOpen,
  children,
}: {
  label: string;
  startOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <details
      className="rounded-2xl border border-dashed border-border bg-surface p-4"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer font-semibold">+ Add a game to {label}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// One game: result entry, plus its details behind "Edit game"
// ---------------------------------------------------------------------------

export function FixtureEditor({ fixture: f, teams }: { fixture: FixtureWithTeams; teams: Team[] }) {
  const [state, action, pending] = useActionState(updateResult, undefined);
  const [status, setStatus] = useState(f.status);
  const score =
    "h-12 w-16 rounded-xl border border-border bg-surface text-center font-mono text-lg font-bold";

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">
        <LocalTime iso={f.kickoff_at} />
        {f.venue ? ` · ${f.venue}` : ""}
      </p>
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={f.id} />
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
          <span className="truncate text-right font-semibold">{f.home.short_name}</span>
          <input
            className={score}
            name="home_score"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={f.home_score ?? ""}
            aria-label={`${f.home.short_name} score`}
          />
          <span className="text-muted">–</span>
          <input
            className={score}
            name="away_score"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={f.away_score ?? ""}
            aria-label={`${f.away.short_name} score`}
          />
          <span className="truncate font-semibold">{f.away.short_name}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={select}
            aria-label="Status"
          >
            <option value="scheduled">Not started</option>
            <option value="live">Live</option>
            <option value="completed">Full time</option>
            <option value="postponed">Postponed</option>
          </select>
          <button className={btn.primary} disabled={pending}>
            {pending ? "Saving…" : "Save result"}
          </button>
        </div>
        {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
        {state && !state.error ? <Notice tone="success">Saved. Ladders are updated.</Notice> : null}
      </form>
      <details className="group">
        <summary className="cursor-pointer text-sm text-muted underline">Edit game details</summary>
        <div className="mt-3 space-y-3">
          <FixtureForm teams={teams} fixture={f} season={f.season} round={f.round} />
          <DeleteFixture id={f.id} />
        </div>
      </details>
    </article>
  );
}

function DeleteFixture({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button
        type="button"
        className={`${btn.danger} w-full`}
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this game? Everyone’s tips for it are deleted too.")) return;
          start(async () => {
            const res = await deleteFixture(id);
            if (res.error) setError(res.error);
          });
        }}
      >
        Delete game
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Add a game, or edit one's teams / time / round / venue
// ---------------------------------------------------------------------------

export function FixtureForm({
  teams,
  fixture,
  season,
  round,
}: {
  teams: Team[];
  fixture?: FixtureWithTeams;
  season: number;
  round: number;
}) {
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [home, setHome] = useState(fixture?.home_team_id ?? "");
  const [away, setAway] = useState(fixture?.away_team_id ?? "");
  const tz = hydrated ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const local = String(data.get("kickoff_local") ?? "");
        data.set("kickoff_at", local ? new Date(local).toISOString() : "");
        setError(null);
        setSaved(null);
        start(async () => {
          const res = await saveFixture(undefined, data);
          if (res?.error) {
            setError(res.error);
            return;
          }
          if (fixture) {
            setSaved("Saved.");
          } else {
            const h = teams.find((t) => t.id === home)?.short_name;
            const a = teams.find((t) => t.id === away)?.short_name;
            setSaved(`Added ${h} v ${a}. Add the next game below.`);
            setHome("");
            setAway("");
          }
        });
      }}
    >
      {fixture ? <input type="hidden" name="id" value={fixture.id} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Season</span>
          <input className={input} name="season" type="number" inputMode="numeric" defaultValue={season} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Round</span>
          <input
            className={input}
            name="round"
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            defaultValue={round}
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Round name (optional)</span>
        <input
          className={input}
          name="round_label"
          maxLength={40}
          defaultValue={fixture?.round_label ?? ""}
          placeholder="e.g. Finals Week 1, Grand Final"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Home</span>
          <select name="home_team_id" className={select} value={home} onChange={(e) => setHome(e.target.value)} required>
            <option value="">Pick team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === away}>
                {t.short_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Away</span>
          <select name="away_team_id" className={select} value={away} onChange={(e) => setAway(e.target.value)} required>
            <option value="">Pick team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === home}>
                {t.short_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Kick-off</span>
        <input
          className={input}
          name="kickoff_local"
          type="datetime-local"
          required
          suppressHydrationWarning
          defaultValue={fixture ? toLocalInput(fixture.kickoff_at) : ""}
        />
        <span className="mt-1 block text-xs text-muted" suppressHydrationWarning>
          In your time zone{tz ? ` (${tz})` : ""}. Tips lock at this time.
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Venue (optional)</span>
        <input className={input} name="venue" maxLength={80} defaultValue={fixture?.venue ?? ""} />
      </label>
      {fixture ? (
        <p className="text-xs text-muted">
          Changing a team removes tips on the team that’s no longer playing.
        </p>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}
      <button className={`${fixture ? btn.secondary : btn.primary} w-full`} disabled={pending || !hydrated}>
        {pending ? "Saving…" : fixture ? "Save details" : "Add game"}
      </button>
    </form>
  );
}
