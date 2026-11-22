export type Team = {
  id: string;
  name: string;
  short_name: string;
  abbreviation: string;
  primary_color: string;
  secondary_color: string;
};

export type FixtureStatus = "scheduled" | "live" | "completed" | "postponed";

export type Fixture = {
  id: number;
  season: number;
  round: number;
  round_label: string | null;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: string;
  venue: string | null;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
};

export type FixtureWithTeams = Fixture & { home: Team; away: Team };

export type Tip = {
  fixture_id: number;
  team_id: string;
  margin: number | null;
};

export type LadderRow = {
  user_id: string;
  display_name: string;
  points: number;
  margin_error: number;
  tips_made: number;
  last_round_points: number;
  rank: number;
};

export type Competition = {
  id: string;
  name: string;
  season: number;
  owner_id: string;
  invite_code: string;
  buy_in_cents: number | null;
  payment_instructions: string | null;
  payid: string | null;
  payee_name: string | null;
  prize_paid_out_at: string | null;
  max_members: number;
  created_at: string;
};

export type PaymentStatus = "unpaid" | "claimed" | "paid";

export type Member = {
  user_id: string;
  role: "owner" | "member";
  has_paid: boolean;
  payment_status: PaymentStatus;
  payment_reference: string;
  payment_claimed_at: string | null;
  joined_at: string;
  display_name: string | null;
};
