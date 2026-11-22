// Database rules: auth, RLS, lockout, scoring, payments, moderation.
// Runs against the local Supabase stack with its demo seed (season 2027).
import { anonClient, apiLogin, done, makeAdmin, ok, serviceClient, sql, uniq } from "./lib.mjs";

const run = uniq();
const alice = await apiLogin(`alice+${run}@example.com`, "Alice");
const bob = await apiLogin(`bob+${run}@example.com`, "Bob");
const carol = await apiLogin(`carol+${run}@example.com`, "Carol");
ok(true, "three users signed in with email OTP codes");

const { data: claims } = await alice.sb.auth.getClaims();
ok(claims.claims.user_metadata.display_name === "Alice", "display name is in the refreshed JWT claims");
ok(sql(`select display_name from profiles where id='${alice.id}'`) === "Alice", "profile row mirrored by trigger");

// --- tips -----------------------------------------------------------------
const f = (round, idx) => Number(sql(`select id from fixtures where external_id='demo-${round}-${idx}'`));
const tip = (u, fixture, team, margin = null) =>
  u.sb.from("tips").upsert({ user_id: u.id, fixture_id: fixture, team_id: team, margin }, { onConflict: "user_id,fixture_id" });

let r = await tip(alice, f(2, 0), "panthers", 8);
ok(!r.error, "can tip an open game");
r = await tip(alice, f(2, 0), "broncos", 8);
ok(!r.error, "can change a tip before kick-off");
r = await tip(alice, f(1, 1), "roosters");
ok(r.error && /closed/.test(r.error.message), "cannot tip a game after kick-off");
r = await tip(alice, f(2, 1), "storm");
ok(r.error && /not playing/.test(r.error.message), "cannot tip a team that isn't playing");
r = await bob.sb.from("tips").insert({ user_id: alice.id, fixture_id: f(2, 2), team_id: "eels" });
ok(!!r.error, "cannot insert a tip for someone else");
r = await bob.sb.from("tips").select("*").eq("fixture_id", f(2, 0));
ok(r.data.length === 0, "cannot see others' tips before kick-off");

// Backdate round-1 tips (bypassing the lockout trigger as superuser).
const t = (u, round, idx, team, margin = "null") => `('${u.id}', ${f(round, idx)}, '${team}', ${margin})`;
sql(`alter table tips disable trigger tips_validate;
insert into tips (user_id, fixture_id, team_id, margin) values
 ${t(alice, 1, 0, "storm", 6)}, ${t(alice, 1, 1, "roosters")}, ${t(alice, 1, 2, "sharks")}, ${t(alice, 1, 3, "dragons")}, ${t(alice, 1, 4, "titans")},
 ${t(bob, 1, 0, "panthers", 10)}, ${t(bob, 1, 1, "broncos")}, ${t(bob, 1, 2, "sharks")}, ${t(bob, 1, 4, "cowboys")}, ${t(bob, 1, 5, "raiders")}, ${t(bob, 1, 6, "warriors")}, ${t(bob, 1, 7, "bulldogs")};
alter table tips enable trigger tips_validate;`);

r = await bob.sb.from("tips").select("*").eq("user_id", alice.id).eq("fixture_id", f(1, 0));
ok(r.data.length === 1, "can see others' tips after kick-off");
r = await bob.sb.from("tips").delete().eq("user_id", bob.id).eq("fixture_id", f(1, 0)).select();
ok(r.data.length === 0, "cannot delete a locked tip (margin-penalty dodge)");

// --- profiles / admin ------------------------------------------------------
r = await bob.sb.from("profiles").update({ is_admin: true }).eq("id", bob.id).select();
ok(!!r.error || r.data.length === 0, "cannot make yourself admin");
r = await bob.sb.from("fixtures").update({ home_score: 99 }).eq("id", f(1, 0)).select();
ok(r.data.length === 0, "non-admin cannot edit fixtures");

// --- competitions --------------------------------------------------------
r = await alice.sb.from("competitions").insert({ name: "Sneaky", season: 2027, owner_id: alice.id, buy_in_cents: 2000 }).select();
ok(!!r.error, "buy-in comp requires organiser acknowledgement");
r = await alice.sb.from("competitions").insert({ name: "Huge", season: 2027, owner_id: alice.id, buy_in_cents: 100000, organiser_ack_at: new Date().toISOString() }).select();
ok(!!r.error, "buy-in over $500 rejected");
r = await alice.sb.from("competitions").insert({ name: "Family Comp", season: 2027, owner_id: alice.id, buy_in_cents: 2000, organiser_ack_at: new Date().toISOString() }).select().single();
ok(!r.error, "organiser creates a $20 buy-in comp");
const comp = r.data;
ok(/^[A-HJKMNP-Z2-9]{8}$/.test(comp.invite_code), `invite code generated (${comp.invite_code})`);

r = await carol.sb.from("competitions").select("*").eq("id", comp.id);
ok(r.data.length === 0, "non-member cannot read the comp");
r = await carol.sb.rpc("ladder", { p_season: 2027, p_competition_id: comp.id });
ok(!!r.error, "non-member cannot read the comp ladder");

r = await bob.sb.rpc("preview_competition", { p_code: comp.invite_code.toLowerCase() });
ok(r.data?.[0]?.name === "Family Comp" && r.data[0].buy_in_cents === 2000, "preview by invite code (case-insensitive)");
r = await bob.sb.rpc("join_competition", { p_code: comp.invite_code });
ok(r.error && /18/.test(r.error.message), "joining a buy-in comp requires 18+ confirmation");
r = await bob.sb.rpc("join_competition", { p_code: comp.invite_code, p_confirm_adult: true });
ok(r.data === comp.id, "member joins with confirmation");
r = await bob.sb.rpc("join_competition", { p_code: "NOPE2345" });
ok(!!r.error, "bad invite code rejected");

r = await bob.sb.from("competition_members").update({ has_paid: true }).eq("competition_id", comp.id).eq("user_id", bob.id).select();
ok(!!r.error || r.data.length === 0, "member cannot mark themselves paid");
r = await bob.sb.from("competitions").update({ buy_in_cents: 5000 }).eq("id", comp.id).select();
ok(!!r.error, "buy-in amount cannot be changed after creation");
r = await alice.sb.from("competitions").update({ buy_in_cents: 5000 }).eq("id", comp.id).select();
ok(!!r.error, "...not even by the organiser");
// --- payments (option 1: claim + confirm) ---
r = await bob.sb.from("competition_members").select("user_id, payment_reference, payment_status").eq("competition_id", comp.id);
const refs = r.data.map((m) => m.payment_reference);
ok(refs.every((x) => /^TIPS-[A-HJKMNP-Z2-9]{4}$/.test(x)) && new Set(refs).size === refs.length, `unique payment references (${refs.join(", ")})`);
ok(r.data.every((m) => m.payment_status === "unpaid"), "everyone starts unpaid");
r = await bob.sb.from("competition_members").update({ payment_status: "paid" }).eq("competition_id", comp.id).eq("user_id", bob.id).select();
ok(!!r.error || r.data.length === 0, "member cannot set payment_status directly");
r = await bob.sb.rpc("set_payment_status", { p_competition_id: comp.id, p_user_id: bob.id, p_status: "paid" });
ok(r.error && /organiser/.test(r.error.message), "member cannot confirm their own payment");
r = await bob.sb.rpc("claim_payment", { p_competition_id: comp.id });
ok(r.data === "claimed", "member claims 'I've paid'");
r = await bob.sb.rpc("claim_payment", { p_competition_id: comp.id, p_claimed: false });
ok(r.data === "unpaid", "member can undo a claim");
await bob.sb.rpc("claim_payment", { p_competition_id: comp.id });
r = await carol.sb.rpc("claim_payment", { p_competition_id: comp.id });
ok(!!r.error, "non-member cannot claim");
r = await alice.sb.rpc("set_payment_status", { p_competition_id: comp.id, p_user_id: bob.id, p_status: "paid" });
ok(!r.error, "organiser confirms payment");
r = await bob.sb.rpc("claim_payment", { p_competition_id: comp.id, p_claimed: false });
ok(!!r.error, "member cannot un-claim once confirmed");
r = await bob.sb.from("competition_members").select("has_paid, payment_confirmed_at").eq("competition_id", comp.id).eq("user_id", bob.id).single();
ok(r.data.has_paid === true && !!r.data.payment_confirmed_at, "has_paid derived from status");
r = await bob.sb.from("competitions").update({ prize_paid_out_at: new Date().toISOString() }).eq("id", comp.id).select();
ok(!!r.error || r.data.length === 0, "member cannot mark prize paid out");
r = await bob.sb.from("competitions").update({ payid: "hacker@example.com" }).eq("id", comp.id).select();
ok(!!r.error || r.data.length === 0, "member cannot change the organiser's PayID");
r = await alice.sb.from("competitions").update({ payid: "0400000000", payee_name: "A Smith", prize_paid_out_at: new Date().toISOString() }).eq("id", comp.id).select();
ok(r.data?.length === 1, "organiser sets PayID and marks prize paid out");
r = await bob.sb.from("competitions").select("payid").eq("id", comp.id).single();
ok(r.data.payid === "0400000000", "member can read the PayID");
r = await carol.sb.from("competitions").select("payid").eq("id", comp.id);
ok(r.data.length === 0, "non-member cannot read the PayID");
r = await alice.sb.from("competition_members").update({ role: "owner" }).eq("competition_id", comp.id).eq("user_id", bob.id).select();
ok(!!r.error, "organiser cannot change roles directly");

// --- scoring ---------------------------------------------------------------
r = await carol.sb.rpc("ladder", { p_season: 2027 });
const byId = (id) => r.data.find((x) => x.user_id === id);
const pub = { Alice: byId(alice.id), Bob: byId(bob.id), Carol: byId(carol.id) };
ok(pub.Bob.points === 5 && pub.Bob.margin_error === 12, `Bob: 5 pts, margin err 12 (got ${pub.Bob.points}/${pub.Bob.margin_error})`);
ok(pub.Alice.points === 4 && pub.Alice.margin_error === 4, `Alice: 4 pts incl. draw, margin err 4 (got ${pub.Alice.points}/${pub.Alice.margin_error})`);
ok(pub.Carol.points === 0 && pub.Carol.margin_error === 50, `Carol: no tips = 0 pts, +50 margin (got ${pub.Carol.points}/${pub.Carol.margin_error})`);
ok(pub.Bob.rank < pub.Alice.rank && pub.Alice.rank < pub.Carol.rank, "public ladder order Bob > Alice > Carol");
ok(pub.Bob.last_round_points === 5, "last-round points");

r = await bob.sb.rpc("ladder", { p_season: 2027, p_competition_id: comp.id });
ok(r.data.length === 2 && r.data[0].display_name === "Bob" && r.data[0].rank === 1, "comp ladder only has members, Bob first");

// Tie-break: give Alice one more point via result correction → re-scored on read.
sql(`update fixtures set away_score = 40 where external_id='demo-1-4'`); // titans 40 v cowboys 34
r = await carol.sb.rpc("ladder", { p_season: 2027 });
const a = r.data.find((x) => x.user_id === alice.id), b = r.data.find((x) => x.user_id === bob.id);
ok(a.points === 5 && b.points === 4, "correcting a result re-scores instantly");
sql(`update fixtures set away_score = 10 where external_id='demo-1-4'`);
sql(`update fixtures set away_score = 26 where external_id='demo-1-5'`); // keep consistent
r = await carol.sb.rpc("ladder", { p_season: 2027 });

// --- leaving ---------------------------------------------------------------
r = await alice.sb.from("competition_members").delete().eq("competition_id", comp.id).eq("user_id", alice.id).select();
ok(r.data.length === 0, "organiser cannot leave their own comp");
r = await bob.sb.from("competition_members").delete().eq("competition_id", comp.id).eq("user_id", bob.id).select();
ok(r.data.length === 1, "member can leave");

// Anonymous access blocked
const anon = anonClient();
r = await anon.from("fixtures").select("*");
ok((r.data ?? []).length === 0, "anonymous users see no data");
r = await anon.rpc("ladder", { p_season: 2027 });
ok(!!r.error, "anonymous users cannot call ladder()");

// --- tipping-name and comp-name filter -----------------------------------
r = await carol.sb.auth.updateUser({ data: { display_name: "Big D1ck" } });
ok(!!r.error, "offensive tipping name rejected by the database");
ok(sql(`select display_name from profiles where id='${carol.id}'`) === "Carol", "...and the old name is kept");
r = await carol.sb.rpc("display_name_problem", { p_name: "f u c k" });
ok(typeof r.data === "string" && /isn’t allowed/.test(r.data), "spaced-out swear word detected");
r = await carol.sb.rpc("display_name_problem", { p_name: "Scott Hancock" });
ok(r.data === null, "ordinary names containing short words pass (Hancock)");
r = await carol.sb.rpc("display_name_problem", { p_name: "NRL Admin" });
ok(/reserved/.test(r.data ?? ""), "staff-like names are reserved");
r = await carol.sb.from("competitions").insert({ name: "Sh1t Tippers", season: 2027, owner_id: carol.id }).select();
ok(r.error?.code === "P0001" && /competition name/.test(r.error.message), "offensive competition name rejected");

// --- admin-only functions ----------------------------------------------------
r = await carol.sb.rpc("admin_list_players", {});
ok(!!r.error, "non-admin cannot list players (with emails)");
r = await carol.sb.rpc("block_email", { p_email: "someone@example.com" });
ok(!!r.error, "non-admin cannot block emails");
r = await carol.sb.rpc("list_blocked_emails");
ok(!!r.error, "non-admin cannot see blocked emails");
makeAdmin(alice.id);
r = await alice.sb.rpc("admin_list_players", { p_query: carol.email });
ok(r.data?.length === 1 && r.data[0].email === carol.email && r.data[0].display_name === "Carol", "admin finds a player by email");

// --- blocked emails ------------------------------------------------------------
const blocked = `blocked+${run}@example.com`;
r = await alice.sb.rpc("block_email", { p_email: "BLOCKED+anything@Example.com", p_note: "test" });
ok(!r.error, "admin blocks an email");
r = await anonClient().auth.signInWithOtp({ email: blocked, options: { shouldCreateUser: true } });
ok(!!r.error, "blocked email (any +tag, any case) can't sign up");
await alice.sb.rpc("unblock_email", { p_email: "blocked@example.com" });
r = await anonClient().auth.signInWithOtp({ email: blocked, options: { shouldCreateUser: true } });
ok(!r.error, "unblocked email can sign up again");

// --- team changes void tips on a team that's no longer playing ---------------
const g = f(2, 0); // Panthers v Broncos; Alice tipped Broncos above
ok(sql(`select count(*) from tips where fixture_id=${g} and user_id='${alice.id}'`) === "1", "Alice has a tip on the game");
r = await alice.sb.from("fixtures").update({ away_team_id: "storm" }).eq("id", g).select();
ok(r.data?.length === 1, "admin changes the away team");
ok(sql(`select count(*) from tips where fixture_id=${g} and user_id='${alice.id}'`) === "0", "tip on the removed team is voided");
await alice.sb.from("fixtures").update({ away_team_id: "broncos" }).eq("id", g);

// --- account deletion ------------------------------------------------------------
r = await alice.sb.rpc("account_deletion_blockers");
ok(r.data?.length === 0, "organiser alone in their comp: nothing blocks deletion");
await carol.sb.rpc("join_competition", { p_code: comp.invite_code, p_confirm_adult: true });
r = await alice.sb.rpc("account_deletion_blockers");
ok(r.data?.length === 1 && r.data[0].other_members === 1, "comp with another player blocks the organiser's deletion");
r = await carol.sb.from("competitions").insert({ name: "Carol Solo", season: 2027, owner_id: carol.id }).select().single();
const solo = r.data.id;
await serviceClient().auth.admin.deleteUser(carol.id);
ok(sql(`select count(*) from profiles where id='${carol.id}'`) === "0", "deleting an account removes the profile");
ok(sql(`select count(*) from tips where user_id='${carol.id}'`) === "0", "...their tips");
ok(sql(`select count(*) from competition_members where user_id='${carol.id}'`) === "0", "...their memberships");
ok(sql(`select count(*) from competitions where id='${solo}'`) === "0", "...and comps they ran alone");
r = await alice.sb.rpc("account_deletion_blockers");
ok(r.data?.length === 0, "organiser can delete once the other player has gone");

done();
