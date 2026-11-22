import type { Metadata } from "next";
import { Suspense } from "react";
import { LadderTable } from "@/components/ladder-table";
import { PageTitle, Skeleton } from "@/components/ui";
import { getCurrentSeason, getCurrentUser, getLadder } from "@/lib/data";

export const metadata: Metadata = { title: "Ladder" };

const TOP_N = 100;

export default function LadderPage() {
  return (
    <>
      <PageTitle title="Public ladder" subtitle="Everyone who plays, ranked by correct tips." />
      <Suspense fallback={<Skeleton rows={8} />}>
        <PublicLadder />
      </Suspense>
    </>
  );
}

async function PublicLadder() {
  const user = await getCurrentUser();
  const season = await getCurrentSeason();
  const rows = await getLadder(season);
  const top = rows.slice(0, TOP_N);
  const meRow = rows.find((r) => r.user_id === user.id);
  const meOutsideTop = meRow && !top.includes(meRow);

  return (
    <div className="space-y-4">
      {meRow ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Your rank" value={`${meRow.rank}`} sub={`of ${rows.length}`} />
          <Stat label="Points" value={`${meRow.points}`} />
          <Stat label="Margin" value={`${meRow.margin_error}`} sub="lower is better" />
        </div>
      ) : null}
      <LadderTable rows={top} meId={user.id} />
      {meOutsideTop ? (
        <>
          <p className="text-center text-xs text-muted">Showing the top {TOP_N}. You:</p>
          <LadderTable rows={[meRow]} meId={user.id} />
        </>
      ) : null}
      <p className="text-center text-xs text-muted">
        {season} season · Ties are split by total margin error on each round’s first game.
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-2 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-2xl font-bold">{value}</div>
      {sub ? <div className="text-[11px] text-muted">{sub}</div> : null}
    </div>
  );
}
