// Server-rendered pages: redirects, public pages, signed-in pages.
// Signs in with @supabase/ssr's cookie format and fetches pages from the app.
import { createServerClient } from "@supabase/ssr";
import { ANON_KEY, APP_URL, SUPABASE_URL, done, ok, otp } from "./lib.mjs";

const jar = new Map();
const sb = createServerClient(SUPABASE_URL, ANON_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (cs) => cs.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
  },
});
const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
const get = (path, withCookie = true) =>
  fetch(APP_URL + path, { redirect: "manual", headers: withCookie ? { cookie: cookie() } : {} });

// Logged out
let r = await get("/", false);
ok(r.status === 307 && r.headers.get("location").endsWith("/login"), `logged-out / redirects to /login (${r.status})`);
r = await get("/comps/123?x=1", false);
ok(r.headers.get("location")?.includes("/login?next=%2Fcomps%2F123%3Fx%3D1"), "redirect keeps ?next");
r = await get("/login", false);
// The form itself renders in the browser (it reads ?next), so check the static shell.
ok(r.status === 200 && (await r.text()).includes("Tip every round"), "login page renders");
r = await get("/rules", false);
ok(r.status === 200 && (await r.text()).includes("Buy-in competitions"), "rules page is public");
for (const [path, text] of [["/privacy", "Deleting your account"], ["/terms", "Buy-in competitions"], ["/disclaimer", "Not affiliated with the NRL"]]) {
  r = await get(path, false);
  ok(r.status === 200 && (await r.text()).includes(text), `${path} is public`);
}
r = await fetch(APP_URL + "/monitoring", { method: "POST", redirect: "manual", body: "{}" });
ok(r.status !== 307 && r.status !== 308, `error-report tunnel isn't behind sign-in (${r.status})`);
r = await get("/apple-icon.png", false);
ok(r.status === 200 && r.headers.get("content-type") === "image/png", "iOS home-screen icon served");

// Sign in
const email = `web+${Date.now()}@example.com`;
await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
const { code, subject } = await otp(email);
ok(/sign-in code/i.test(subject), `OTP email uses custom template ("${subject}")`);
await sb.auth.verifyOtp({ email, token: code, type: "email" });

r = await get("/");
ok(r.status === 307 && r.headers.get("location").endsWith("/onboarding"), "new user without a name goes to onboarding");

await sb.auth.updateUser({ data: { display_name: "Web Tester" } });
await sb.auth.refreshSession();

r = await get("/login");
ok(r.status === 307, "signed-in user bounced off /login");

const page = async (path) => {
  const res = await get(path);
  const html = await res.text();
  return { status: res.status, html };
};

let p = await page("/");
ok(p.status === 200 && p.html.includes("Round 2") && p.html.includes("Panthers"), "tips page shows current round (Round 2)");
ok(p.html.includes("Margin game"), "margin game shown");
ok(/Bye: (<!-- -->)?Knights/.test(p.html), "byes listed");
p = await page("/?round=1");
ok(p.html.includes("Round 1") && p.html.includes("Full time") && p.html.includes("No tip"), "past round shows results");
p = await page("/ladder");
ok(p.status === 200 && p.html.includes("Web Tester") && p.html.includes("(you)"), "public ladder includes me");
p = await page("/comps");
ok(p.status === 200 && p.html.includes("not in any private comps"), "comps empty state");
p = await page("/comps/new");
ok(p.status === 200 && p.html.includes("Add a buy-in"), "create comp form");
p = await page("/me");
ok(p.status === 200 && p.html.includes(email) && !p.html.includes("Admin:"), "me page (no admin links)");
ok(p.html.includes("Delete my account") && p.html.includes("/privacy"), "me page links to account deletion and legal pages");
p = await page("/me/delete");
ok(p.status === 200 && p.html.includes("Permanently delete my account"), "delete account page");
p = await page("/admin");
ok(p.status === 404 || p.html.includes("NEXT_HTTP_ERROR_FALLBACK;404") || p.html.includes("could not be found"), "admin is 404 for non-admins");
p = await page("/admin/players");
ok(p.status === 404 || p.html.includes("NEXT_HTTP_ERROR_FALLBACK;404") || p.html.includes("could not be found"), "admin players page is 404 for non-admins");

// Comp created via API shows up
const { data: claims } = await sb.auth.getClaims();
const { data: comp } = await sb.from("competitions").insert({
  name: "Web Comp", season: 2027, owner_id: claims.claims.sub, buy_in_cents: 2500, organiser_ack_at: new Date().toISOString(),
}).select().single();
p = await page(`/comps/${comp.id}`);
ok(p.html.includes("Web Comp") && p.html.includes("Prize pool") && p.html.includes(comp.invite_code), "comp page: pool + invite code");
p = await page(`/join/${comp.invite_code}`);
ok(p.html.includes("NEXT_REDIRECT") || p.status === 307, "join page redirects existing members to the comp");
p = await page(`/join/ZZZZZZZZ`);
ok(p.html.includes("Invite code not found"), "bad invite code page");

done();
