// Runs every end-to-end suite in order. Needs local Supabase (`supabase start`)
// and the app running against it (APP_URL, default http://localhost:3000).
// The UI suite completes the 2027 demo season, so run `supabase db reset`
// before re-running locally.
import { spawnSync } from "node:child_process";

const suites = ["db", "web", "ui"];
const only = process.argv.slice(2);
let failed = [];

for (const suite of only.length ? only : suites) {
  console.log(`\n=== ${suite} ===`);
  const res = spawnSync(process.execPath, [new URL(`./${suite}.test.mjs`, import.meta.url).pathname], {
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) failed.push(suite);
}

console.log(failed.length ? `\nFailed: ${failed.join(", ")}` : "\nAll suites passed.");
process.exit(failed.length ? 1 : 0);
