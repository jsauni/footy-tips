// Real browser on a phone-sized screen: sign-in, tipping, a buy-in comp from
// both sides, admin fixtures/results and players, and account deletion.
// Set SCREENSHOTS=dir to save screenshots along the way.
import { mkdirSync } from "node:fs";
import {
  APP_URL,
  apiLogin,
  done,
  launchBrowser,
  makeAdmin,
  ok,
  phone,
  sleep,
  sql,
  uiSignIn,
  uniq,
} from "./lib.mjs";

const SHOTS = process.env.SCREENSHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : null);
const appears = (page, selector, timeout = 10000) =>
  page.waitForSelector(selector, { timeout }).then(
    () => true,
    () => false,
  );

const browser = await launchBrowser();
const errors = [];
const watch = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("caret-color")) errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  return page;
};
const run = uniq();

// --- Organiser signs up; offensive name rejected at onboarding ----------------
const emailA = `organiser+${run}@example.com`;
const a = watch(await (await phone(browser)).newPage());
await uiSignIn(a, emailA);
await a.waitForURL(/\/onboarding/);
await a.fill('input[name="display_name"]', "Big D1ck");
await a.click("text=Start tipping");
ok(await appears(a, "text=isn’t allowed"), "offensive tipping name rejected at onboarding");
await a.fill('input[name="display_name"]', "Mad Monday");
await a.click("text=Start tipping");
await a.waitForURL((u) => u.pathname === "/");
await a.waitForSelector("text=Margin game");
ok(true, "sign in with emailed code + onboarding");

// --- Tipping -------------------------------------------------------------------
const cards = a.locator("article");
await cards.nth(0).locator("button[aria-pressed]").nth(0).click();
await a.waitForSelector("text=Saved ✓");
await a.click('button[aria-label="Increase margin"]');
await a.click('button[aria-label="Increase margin"]');
await cards.nth(1).locator("button[aria-pressed]").nth(1).click();
await sleep(1200);
await a.reload();
await a.waitForSelector("text=Margin game");
ok((await a.locator('button[aria-pressed="true"]').count()) === 2, "tips persist after reload");
ok((await a.inputValue('input[aria-label="Winning margin"]')) === "14", "margin persists");
await shot(a, "01-tips");
await a.goto(APP_URL + "/?round=1");
ok(await appears(a, "text=Full time"), "last round shows results");

// --- Create a buy-in comp --------------------------------------------------------
await a.goto(APP_URL + "/comps/new");
await a.fill('input[name="name"]', "Sh1t Tippers");
await a.check('input[name="has_buy_in"]');
await a.fill('input[name="buy_in"]', "20");
await a.fill('input[name="payid"]', "0400 000 000");
await a.fill('input[name="payee_name"]', "M Monday");
await a.check('input[name="confirm_adult"]');
await a.check('input[name="confirm_organiser"]');
await a.click('button:has-text("Create competition")');
ok(await appears(a, "text=competition name isn’t allowed"), "offensive comp name rejected");
ok((await a.inputValue('input[name="payid"]')) === "0400 000 000", "form keeps what was typed after an error");
await a.fill('input[name="name"]', "Smith Family Tipping");
await a.click('button:has-text("Create competition")');
await a.waitForURL(/\/comps\/[0-9a-f-]{36}/);
const compUrl = a.url();
const code = (await a.locator("p.font-mono.tracking-widest").textContent()).trim();
ok(/^[A-Z2-9]{8}$/.test(code), `buy-in comp created with invite code ${code}`);

// --- Member joins from the invite link (dark mode) and pays -------------------------
const emailB = `member+${run}@example.com`;
const b = watch(await (await phone(browser, "dark")).newPage());
await uiSignIn(b, emailB, "Aunty Lou", { from: `/join/${code}` });
await b.waitForSelector("text=You’re invited to");
await b.check('input[name="confirm_adult"]');
await b.click('button:has-text("Join competition")');
await b.waitForURL(/\/comps\/[0-9a-f-]{36}/);
await b.waitForSelector("text=Buy-in due");
const ref = (await b.locator("div.font-mono").first().textContent()).trim();
ok(/^TIPS-[A-Z2-9]{4}$/.test(ref), `member sees their payment reference (${ref})`);
await shot(b, "02-pay");
await b.goto(APP_URL + "/");
ok(await appears(b, "text=isn’t paid yet"), "tips page reminds the member to pay");
await b.goto(compUrl);
await b.click('button:has-text("I’ve paid")');
ok(await appears(b, "text=waiting for"), "member claim → waiting for confirmation");

// --- Organiser confirms --------------------------------------------------------------
await a.goto(APP_URL + "/comps");
ok(await appears(a, "text=1 to confirm"), "comps list shows '1 to confirm'");
await a.goto(compUrl);
await a.waitForSelector("text=Check your bank");
await a.click('button:has-text("Received ✓")');
await a.waitForFunction(() => document.querySelector("p.font-mono.text-3xl")?.textContent.includes("20"));
await a.click('button:has-text("Mark paid")');
await a.waitForFunction(() => document.querySelector("p.font-mono.text-3xl")?.textContent.includes("40"));
ok(true, "organiser confirms payments; prize pool $40");

// --- Admin: add a game, enter a result ----------------------------------------------
makeAdmin(sql(`select id from auth.users where email = '${emailA}'`));
await a.goto(APP_URL + "/admin?season=2027&round=4");
await a.waitForSelector("text=Add a game to Round 4");
await a.selectOption('select[name="home_team_id"]', "panthers");
await a.selectOption('select[name="away_team_id"]', "storm");
const kickoff = new Date(Date.now() + 20 * 864e5);
const pad = (n) => String(n).padStart(2, "0");
await a.fill(
  'input[name="kickoff_local"]',
  `${kickoff.getFullYear()}-${pad(kickoff.getMonth() + 1)}-${pad(kickoff.getDate())}T19:50`,
);
await a.fill('input[name="venue"]', "BlueBet Stadium");
await a.click('button:has-text("Add game")');
ok(await appears(a, "text=Added Panthers v Storm"), "admin adds a game");
ok(
  sql(`select count(*) from fixtures where season=2027 and round=4 and home_team_id='panthers' and away_team_id='storm'`) === "1",
  "...and it's saved to round 4",
);
await a.reload();
await a.waitForSelector('input[aria-label="Panthers score"]');
await a.fill('input[aria-label="Panthers score"]', "24");
await a.fill('input[aria-label="Storm score"]', "18");
await a.selectOption('select[aria-label="Status"]', "completed");
await a.click('button:has-text("Save result")');
ok(await appears(a, "text=Saved. Ladders are updated."), "admin enters a result");
ok(
  sql(`select status || ' ' || home_score || '-' || away_score from fixtures where season=2027 and round=4`) === "completed 24-18",
  "...and it's stored as full time",
);
await shot(a, "03-admin-fixtures");

// --- Admin: rename a player ------------------------------------------------------------
await a.goto(APP_URL + "/admin/players?q=" + encodeURIComponent(emailB));
await a.click('button:has-text("Rename")');
await a.fill('input[aria-label^="New name for"]', "Wank3r");
await a.click('button:has-text("Save name")');
ok(await appears(a, "text=isn’t allowed"), "admin can't rename someone to an offensive name either");
await a.fill('input[aria-label^="New name for"]', "Lou");
await a.click('button:has-text("Save name")');
await sleep(1000);
ok(sql(`select display_name from profiles p join auth.users u on u.id = p.id where u.email = '${emailB}'`) === "Lou", "admin renames a player");

// --- Organiser can't delete their account while others are in their comp --------------
await a.goto(APP_URL + "/me/delete");
ok(await appears(a, "text=First, delete the competitions you run"), "deletion blocked while running a comp with players");
ok(await a.locator('button:has-text("Permanently delete my account")').isDisabled(), "...delete button disabled");

// --- Season ends: payout ---------------------------------------------------------------
sql(`update fixtures set status='completed', home_score=coalesce(home_score, 10), away_score=coalesce(away_score, 12) where season=2027`);
await a.goto(compUrl);
await a.waitForSelector("text=Season complete");
await a.click('button:has-text("I’ve paid the prize")');
ok(await appears(a, "text=marked the prize as paid out"), "organiser records the payout");
await b.goto(compUrl);
ok(await appears(b, "text=marked the prize as paid out"), "members see the prize was paid out");

// --- Member deletes their account --------------------------------------------------------
await b.goto(APP_URL + "/me");
await b.click("text=Delete my account");
await b.waitForURL(/\/me\/delete/);
ok(await appears(b, "text=You’ve paid a buy-in"), "warned about a paid buy-in before deleting");
await b.fill('input[name="confirm"]', "delete");
await b.click('button:has-text("Permanently delete my account")');
await b.waitForURL(/\/login\?deleted=1/);
ok(await appears(b, "text=Your account and all your tips have been deleted"), "member deletes their account");
ok(sql(`select count(*) from auth.users where email = '${emailB}'`) === "0", "...and it's gone from the database");
await b.goto(APP_URL + "/");
ok(/\/login/.test(b.url()), "...and they're signed out");

// --- Admin removes and blocks a player -----------------------------------------------------
const troll = await apiLogin(`troll+${run}@example.com`, "Just Trolling");
await a.goto(APP_URL + "/admin/players?q=" + encodeURIComponent(troll.email));
await a.click('button:has-text("Remove")');
await a.fill('input[aria-label="Reason for blocking"]', "Abusive");
await a.click('button:has-text("Remove player")');
await sleep(1500);
ok(sql(`select count(*) from profiles where id = '${troll.id}'`) === "0", "admin removes a player");
ok(await appears(a, `text=${troll.email}`), "...and their email shows as blocked");
// Not watched: the rejected sign-up logs an expected 500 in the console.
const c = await (await phone(browser)).newPage();
await c.goto(APP_URL + "/login");
await c.fill('input[name="email"]', troll.email);
await c.click("text=Email me a code");
ok(await appears(c, "text=can’t be used to sign up"), "blocked email can't sign up again");

// Errors in the browser console (React hydration problems, crashes) fail the run.
ok(errors.length === 0, `no client errors${errors.length ? `: ${errors.join(" | ").slice(0, 500)}` : ""}`);
await browser.close();
done();
