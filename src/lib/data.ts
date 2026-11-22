import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Competition,
  Fixture,
  FixtureWithTeams,
  LadderRow,
  Member,
  PaymentStatus,
  Team,
  Tip,
} from "@/lib/types";

export type CurrentUser = { id: string; email: string; displayName: string };

/** Verifies the session (JWT) and returns a narrow user, or redirects to login. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");
  const meta = (claims.user_metadata ?? {}) as { display_name?: string };
  if (!meta.display_name) redirect("/onboarding");
  return { id: claims.sub, email: String(claims.email ?? ""), displayName: meta.display_name };
}

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

/** The season of the next unfinished fixture; otherwise the latest season. */
export async function getCurrentSeason(): Promise<number> {
  const supabase = await createClient();
  const { data: upcoming } = await supabase
    .from("fixtures")
    .select("season")
    .neq("status", "completed")
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (upcoming) return upcoming.season;

  const { data: latest } = await supabase
    .from("fixtures")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  return latest?.season ?? new Date().getFullYear();
}

export async function getSeasonFixtures(season: number): Promise<FixtureWithTeams[]> {
  const supabase = await createClient();
  const [{ data: fixtures, error }, { data: teams }] = await Promise.all([
    supabase
      .from("fixtures")
      .select(
        "id, season, round, round_label, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score",
      )
      .eq("season", season)
      .order("kickoff_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("teams").select("*"),
  ]);
  if (error) throw new Error(error.message);
  const byId = new Map((teams as Team[] | null)?.map((t) => [t.id, t]) ?? []);
  return (fixtures as Fixture[]).map((f) => ({
    ...f,
    home: byId.get(f.home_team_id)!,
    away: byId.get(f.away_team_id)!,
  }));
}

/** Every season that has at least one game. */
export async function getSeasons(): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("fixtures").select("season").order("season");
  return [...new Set((data ?? []).map((r) => r.season as number))];
}

export type AdminPlayer = {
  id: string;
  display_name: string | null;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  owned_comps_with_others: number;
};

export async function adminListPlayers(query: string): Promise<AdminPlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_players", { p_query: query || null, p_limit: 100 });
  if (error) throw new Error(error.message);
  return data as AdminPlayer[];
}

export async function listBlockedEmails(): Promise<{ email: string; blocked_at: string; note: string | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_blocked_emails");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type DeletionBlocker = {
  competition_id: string;
  name: string;
  other_members: number;
  buy_in_cents: number | null;
};

/** Comps the user runs that still have other players (must go before account deletion). */
export async function getDeletionBlockers(): Promise<DeletionBlocker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("account_deletion_blockers");
  if (error) throw new Error(error.message);
  return (data as DeletionBlocker[]) ?? [];
}

export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*").order("name");
  return (data as Team[]) ?? [];
}

export type RoundSummary = { round: number; label: string };

export function summariseRounds(fixtures: Fixture[]): RoundSummary[] {
  const seen = new Map<number, string>();
  for (const f of fixtures) {
    if (!seen.has(f.round)) seen.set(f.round, f.round_label ?? `Round ${f.round}`);
  }
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([round, label]) => ({ round, label }));
}

/** First round that still has an unfinished game; else the last round. */
export function pickCurrentRound(fixtures: Fixture[]): number | null {
  if (fixtures.length === 0) return null;
  const open = fixtures
    .filter((f) => f.status !== "completed" && f.status !== "postponed")
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))[0];
  return open?.round ?? Math.max(...fixtures.map((f) => f.round));
}

export async function getMyTips(userId: string, fixtureIds: number[]): Promise<Tip[]> {
  if (fixtureIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tips")
    .select("fixture_id, team_id, margin")
    .eq("user_id", userId)
    .in("fixture_id", fixtureIds);
  if (error) throw new Error(error.message);
  return data as Tip[];
}

export async function getLadder(season: number, competitionId?: string): Promise<LadderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ladder", {
    p_season: season,
    p_competition_id: competitionId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as LadderRow[];
}

export type MyCompetition = Pick<
  Competition,
  "id" | "name" | "season" | "buy_in_cents" | "owner_id"
> & {
  role: Member["role"];
  has_paid: boolean;
  payment_status: PaymentStatus;
  /** Organiser only: members who say they've paid and need confirming. */
  to_confirm: number;
};

export async function getMyCompetitions(userId: string): Promise<MyCompetition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_members")
    .select(
      "role, has_paid, payment_status, competitions!inner(id, name, season, buy_in_cents, owner_id, created_at)",
    )
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  type Row = {
    role: Member["role"];
    has_paid: boolean;
    payment_status: PaymentStatus;
    competitions: Pick<Competition, "id" | "name" | "season" | "buy_in_cents" | "owner_id" | "created_at">;
  };
  const rows = data as unknown as Row[];

  const owned = rows
    .filter((r) => r.role === "owner" && r.competitions.buy_in_cents)
    .map((r) => r.competitions.id);
  const toConfirm = new Map<string, number>();
  if (owned.length) {
    const { data: claims } = await supabase
      .from("competition_members")
      .select("competition_id")
      .in("competition_id", owned)
      .eq("payment_status", "claimed");
    for (const c of claims ?? []) {
      toConfirm.set(c.competition_id, (toConfirm.get(c.competition_id) ?? 0) + 1);
    }
  }

  return rows
    .map((r) => ({
      ...r.competitions,
      role: r.role,
      has_paid: r.has_paid,
      payment_status: r.payment_status,
      to_confirm: toConfirm.get(r.competitions.id) ?? 0,
    }))
    .sort((a, b) => b.season - a.season || a.name.localeCompare(b.name));
}

export async function getCompetition(id: string): Promise<Competition | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitions")
    .select(
      "id, name, season, owner_id, invite_code, buy_in_cents, payment_instructions, payid, payee_name, prize_paid_out_at, max_members, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as Competition | null) ?? null;
}

export async function getMembers(competitionId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competition_members")
    .select(
      "user_id, role, has_paid, payment_status, payment_reference, payment_claimed_at, joined_at, profiles!inner(display_name)",
    )
    .eq("competition_id", competitionId);
  if (error) throw new Error(error.message);
  type Row = Omit<Member, "display_name"> & { profiles: { display_name: string | null } };
  return (data as unknown as Row[]).map(({ profiles, ...m }) => ({
    ...m,
    display_name: profiles.display_name,
  }));
}

export type CompetitionPreview = {
  id: string;
  name: string;
  season: number;
  owner_name: string | null;
  buy_in_cents: number | null;
  member_count: number;
  max_members: number;
  already_member: boolean;
};

export async function previewCompetition(code: string): Promise<CompetitionPreview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_competition", { p_code: code });
  return ((data as CompetitionPreview[] | null) ?? [])[0] ?? null;
}

/** Request-time clock (call only after a dynamic read such as getCurrentUser). */
export function requestNow(): number {
  return Date.now();
}

/** True once every game of the season is finished (postponed games excepted). */
export async function isSeasonComplete(season: number): Promise<boolean> {
  const supabase = await createClient();
  const [{ count: total }, { count: open }] = await Promise.all([
    supabase.from("fixtures").select("id", { count: "exact", head: true }).eq("season", season),
    supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("season", season)
      .in("status", ["scheduled", "live"]),
  ]);
  return (total ?? 0) > 0 && open === 0;
}
