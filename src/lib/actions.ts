"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSeason } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

// ---------------------------------------------------------------------------
// Competitions
// ---------------------------------------------------------------------------

export async function createCompetition(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUserId();

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 40) return { error: "Name must be 3–40 characters." };

  const hasBuyIn = formData.get("has_buy_in") === "on";
  let buyInCents: number | null = null;
  let paymentInstructions: string | null = null;
  let payid: string | null = null;
  let payeeName: string | null = null;

  if (hasBuyIn) {
    const dollars = Number(formData.get("buy_in"));
    if (!Number.isFinite(dollars) || dollars < 1 || dollars > 500) {
      return { error: "Buy-in must be between $1 and $500." };
    }
    buyInCents = Math.round(dollars * 100);
    paymentInstructions =
      String(formData.get("payment_instructions") ?? "").trim().slice(0, 200) || null;
    const payment = readPaymentDetails(formData);
    if ("error" in payment) return { error: payment.error };
    ({ payid, payeeName } = payment);
    if (!payid && !paymentInstructions) {
      return { error: "Add your PayID (or other payment instructions) so people can pay you." };
    }
    if (formData.get("confirm_adult") !== "on") {
      return { error: "You must be 18 or over to run a buy-in competition." };
    }
    if (formData.get("confirm_organiser") !== "on") {
      return { error: "Please accept the organiser responsibilities to add a buy-in." };
    }
  }

  const season = await getCurrentSeason();
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      name,
      season,
      owner_id: userId,
      buy_in_cents: buyInCents,
      payment_instructions: paymentInstructions,
      payid,
      payee_name: payeeName,
      organiser_ack_at: hasBuyIn ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.code === "P0001" ? error.message : "Couldn’t create the competition. Please try again." };
  }
  redirect(`/comps/${data.id}`);
}

export async function joinCompetition(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUserId();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter an invite code." };

  const { data, error } = await supabase.rpc("join_competition", {
    p_code: code,
    p_confirm_adult: formData.get("confirm_adult") === "on",
  });
  if (error) return { error: error.message };
  redirect(`/comps/${data}`);
}

function readPaymentDetails(
  formData: FormData,
): { payid: string | null; payeeName: string | null } | { error: string } {
  const payid = String(formData.get("payid") ?? "").trim().replace(/\s+/g, " ") || null;
  const payeeName = String(formData.get("payee_name") ?? "").trim().replace(/\s+/g, " ") || null;
  if (payid && (payid.length < 3 || payid.length > 100)) return { error: "That PayID doesn’t look right." };
  if (payid && !payeeName) return { error: "Add the account name shown for your PayID." };
  if (payeeName && (payeeName.length < 2 || payeeName.length > 60)) {
    return { error: "Account name must be 2–60 characters." };
  }
  return { payid, payeeName };
}

export type ActionResult = { error?: string };

/** Member: "I've paid" (claimed = true) or undo (claimed = false). */
export async function claimPayment(competitionId: string, claimed: boolean): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.rpc("claim_payment", {
    p_competition_id: competitionId,
    p_claimed: claimed,
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Organiser: confirm received, reject a claim, mark paid in cash, or undo. */
export async function setPaymentStatus(
  competitionId: string,
  userId: string,
  status: "unpaid" | "claimed" | "paid",
): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.rpc("set_payment_status", {
    p_competition_id: competitionId,
    p_user_id: userId,
    p_status: status,
  });
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Organiser: record (or undo) that the prize has been paid to the winner(s). */
export async function setPrizePaidOut(competitionId: string, paidOut: boolean): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("competitions")
    .update({ prize_paid_out_at: paidOut ? new Date().toISOString() : null })
    .eq("id", competitionId)
    .select("id");
  if (error || !data?.length) return { error: "Only the organiser can do that." };
  refresh();
  return {};
}

export async function removeMember(competitionId: string, userId: string) {
  const { supabase } = await requireUserId();
  await supabase
    .from("competition_members")
    .delete()
    .eq("competition_id", competitionId)
    .eq("user_id", userId);
  refresh();
}

export async function leaveCompetition(competitionId: string) {
  const { supabase, userId } = await requireUserId();
  await supabase
    .from("competition_members")
    .delete()
    .eq("competition_id", competitionId)
    .eq("user_id", userId);
  redirect("/comps");
}

export async function deleteCompetition(competitionId: string) {
  const { supabase } = await requireUserId();
  await supabase.from("competitions").delete().eq("id", competitionId);
  redirect("/comps");
}

export async function renameCompetition(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUserId();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 40) return { error: "Name must be 3–40 characters." };
  const payment = formData.get("payment_instructions");
  const hasPaymentFields = formData.has("payid");
  const details = hasPaymentFields ? readPaymentDetails(formData) : null;
  if (details && "error" in details) return { error: details.error };
  const { error } = await supabase
    .from("competitions")
    .update({
      name,
      ...(payment !== null
        ? { payment_instructions: String(payment).trim().slice(0, 200) || null }
        : {}),
      ...(details ? { payid: details.payid, payee_name: details.payeeName } : {}),
    })
    .eq("id", id);
  if (error) return { error: error.code === "P0001" ? error.message : "Couldn’t save changes." };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Admin: fixtures and results. RLS only lets admins write fixtures, so these
// use the admin's own session.
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const ctx = await requireUserId();
  const { data } = await ctx.supabase.rpc("is_admin");
  if (data !== true) throw new Error("Admins only.");
  return ctx;
}

const STATUSES = ["scheduled", "live", "completed", "postponed"] as const;

function readScore(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 200 ? n : NaN;
}

/** Scores and status for one game (the weekly job). */
export async function updateResult(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { error: "Invalid status." };
  const home = readScore(formData.get("home_score"));
  const away = readScore(formData.get("away_score"));
  if (Number.isNaN(home) || Number.isNaN(away)) return { error: "Scores must be whole numbers." };
  if (status === "completed" && (home === null || away === null)) {
    return { error: "Enter both scores to mark a game full time." };
  }
  const { data, error } = await supabase
    .from("fixtures")
    .update({ status, home_score: home, away_score: away })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Game not found." };
  refresh();
  return {};
}

/** Add a game (no id) or change its details (with id). */
export async function saveFixture(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const season = Math.floor(Number(formData.get("season")));
  const round = Math.floor(Number(formData.get("round")));
  const roundLabel = String(formData.get("round_label") ?? "").trim().slice(0, 40) || null;
  const home = String(formData.get("home_team_id") ?? "");
  const away = String(formData.get("away_team_id") ?? "");
  const venue = String(formData.get("venue") ?? "").trim().slice(0, 80) || null;
  const kickoffRaw = String(formData.get("kickoff_at") ?? "");
  const kickoff = new Date(kickoffRaw);

  if (!(season >= 2000 && season <= 2100)) return { error: "Enter a season, e.g. 2027." };
  if (!(round >= 1 && round <= 40)) return { error: "Round must be between 1 and 40." };
  if (!home || !away) return { error: "Pick both teams." };
  if (home === away) return { error: "Home and away teams must be different." };
  if (!kickoffRaw || Number.isNaN(kickoff.getTime())) return { error: "Enter the kick-off date and time." };

  const row = {
    season,
    round,
    round_label: roundLabel,
    home_team_id: home,
    away_team_id: away,
    venue,
    kickoff_at: kickoff.toISOString(),
  };
  const { data, error } = id
    ? await supabase.from("fixtures").update(row).eq("id", id).select("id")
    : await supabase.from("fixtures").insert(row).select("id");
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Those two teams already play each other in that round."
          : error.message,
    };
  }
  if (!data?.length) return { error: "Game not found." };
  refresh();
  return {};
}

export async function deleteFixture(id: number): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("fixtures").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Game not found." };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Admin: players
// ---------------------------------------------------------------------------

async function nameProblem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<string | null> {
  if (name.length < 2 || name.length > 30) return "Use 2–30 characters.";
  const { data } = await supabase.rpc("display_name_problem", { p_name: name });
  return (data as string | null) ?? null;
}

export async function adminRenamePlayer(userId: string, rawName: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const name = rawName.trim().replace(/\s+/g, " ");
  const problem = await nameProblem(supabase, name);
  if (problem) return { error: problem };
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    user_metadata: { display_name: name },
  });
  if (error) return { error: "Couldn’t rename that player." };
  refresh();
  return {};
}

export async function adminRemovePlayer(
  userId: string,
  opts: { block: boolean; note?: string },
): Promise<ActionResult> {
  const { supabase, userId: me } = await requireAdmin();
  if (userId === me) return { error: "You can’t remove yourself here. Use Me → Delete account." };
  const { data: target } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "Player not found." };
  if (target.is_admin) return { error: "Remove their admin access first." };

  const admin = createAdminClient();
  if (opts.block) {
    const { data: user } = await admin.auth.admin.getUserById(userId);
    const email = user?.user?.email;
    if (email) {
      const { error } = await supabase.rpc("block_email", { p_email: email, p_note: opts.note ?? null });
      if (error) return { error: "Couldn’t block that email." };
    }
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "Couldn’t remove that player." };
  refresh();
  return {};
}

export async function adminUnblockEmail(email: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("unblock_email", { p_email: email });
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/** Check a tipping name before saving it (the database enforces it too). */
export async function checkDisplayName(rawName: string): Promise<string | null> {
  const { supabase } = await requireUserId();
  return nameProblem(supabase, rawName.trim().replace(/\s+/g, " "));
}

/**
 * Permanently deletes the signed-in user's account. Their tips, comp
 * memberships, payment records and any comps they run alone go with it
 * (foreign keys cascade from auth.users).
 */
export async function deleteMyAccount(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUserId();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }
  const { data: blockers, error } = await supabase.rpc("account_deletion_blockers");
  if (error) return { error: "Couldn’t check your competitions. Please try again." };
  if ((blockers as unknown[] | null)?.length) {
    return { error: "You still run competitions with other players. Delete those first." };
  }
  const { error: deleteError } = await createAdminClient().auth.admin.deleteUser(userId);
  if (deleteError) return { error: "Couldn’t delete your account. Please try again or contact us." };
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
