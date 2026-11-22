// Shared helpers for the end-to-end tests. These run against the LOCAL
// Supabase stack (`supabase start`) and a running copy of the app.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function supabaseStatus() {
  try {
    return JSON.parse(execSync("supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString());
  } catch {
    return {};
  }
}

const status =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? {} : supabaseStatus();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? status.API_URL;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? status.ANON_KEY;
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY;
export const MAIL_URL = process.env.MAILPIT_URL ?? status.MAILPIT_URL ?? status.INBUCKET_URL ?? "http://127.0.0.1:55324";
export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const DB_CONTAINER = process.env.DB_CONTAINER ?? "supabase_db_footy-tips";

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Supabase isn't running. Start it with `supabase start`.");
  process.exit(1);
}
// These tests create users and rewrite data. Never point them at production.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL)) {
  console.error(`Refusing to run tests against ${SUPABASE_URL}: local Supabase only.`);
  process.exit(1);
}

let failures = 0;
export function ok(cond, msg) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
}
export function done() {
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Runs SQL as the postgres superuser inside the local database container. */
export function sql(query) {
  return execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -At -v ON_ERROR_STOP=1`, { input: query })
    .toString()
    .trim();
}

/** Latest 6-digit sign-in code emailed to `email` (from Mailpit). */
export async function otp(email) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = await res.json();
    if (messages?.length) {
      const msg = await (await fetch(`${MAIL_URL}/api/v1/message/${messages[0].ID}`)).json();
      const m = (msg.Text || msg.HTML).match(/\b(\d{6})\b/);
      if (m) return { code: m[1], subject: msg.Subject };
    }
    await sleep(300);
  }
  throw new Error(`No sign-in email for ${email}`);
}

export const anonClient = () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
export const serviceClient = () =>
  createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/** Signs a new user in through the real OTP flow and (optionally) sets their name. */
export async function apiLogin(email, name) {
  const sb = anonClient();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  const { code } = await otp(email);
  const { data, error: verifyError } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
  if (verifyError) throw verifyError;
  if (name) {
    const { error: nameError } = await sb.auth.updateUser({ data: { display_name: name } });
    if (nameError) throw nameError;
    await sb.auth.refreshSession();
  }
  return { sb, id: data.user.id, email };
}

export function makeAdmin(userId) {
  sql(`update profiles set is_admin = true where id = '${userId}'`);
}

/** Phone-sized browser (system Chrome by default; set PW_CHANNEL="" for bundled Chromium). */
export async function launchBrowser() {
  const { chromium } = await import("playwright-core");
  const channel = process.env.PW_CHANNEL ?? "chrome";
  return chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
}

export function phone(browser, colorScheme = "light") {
  return browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme,
  });
}

/** Full sign-in through the UI: email, code, then the onboarding name (if new). */
export async function uiSignIn(page, email, name, { from = "/" } = {}) {
  await page.goto(APP_URL + from);
  await page.waitForURL(/\/login/);
  await page.fill('input[name="email"]', email);
  await page.click("text=Email me a code");
  await page.waitForSelector('input[name="code"]');
  await page.fill('input[name="code"]', (await otp(email)).code);
  await page.click('button:has-text("Sign in")');
  if (name) {
    await page.waitForURL(/\/onboarding/);
    await page.fill('input[name="display_name"]', name);
    await page.click("text=Start tipping");
    await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"));
  }
}
