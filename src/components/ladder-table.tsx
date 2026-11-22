import type { ReactNode } from "react";
import type { LadderRow } from "@/lib/types";

export function LadderTable({
  rows,
  meId,
  badge,
  emptyText = "No players yet.",
}: {
  rows: LadderRow[];
  meId: string;
  badge?: (userId: string) => ReactNode;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-muted">{emptyText}</p>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-xs text-muted">
          <tr>
            <th className="w-10 py-2 pl-3 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">Player</th>
            <th className="w-12 py-2 text-right font-medium" title="Points last completed round">
              Rnd
            </th>
            <th className="w-14 py-2 text-right font-medium" title="Total margin error (tiebreaker)">
              Mgn
            </th>
            <th className="w-12 py-2 pr-3 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const me = r.user_id === meId;
            return (
              <tr
                key={r.user_id}
                className={`border-t border-border ${me ? "bg-accent-soft font-semibold" : ""}`}
              >
                <td className="py-3 pl-3 font-mono text-muted">{r.rank}</td>
                <td className="max-w-0 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{r.display_name}</span>
                    {me ? <span className="text-xs text-accent">(you)</span> : null}
                    {badge?.(r.user_id)}
                  </div>
                </td>
                <td className="py-3 text-right font-mono text-muted">{r.last_round_points}</td>
                <td className="py-3 text-right font-mono text-muted">{r.margin_error}</td>
                <td className="py-3 pr-3 text-right font-mono text-base font-bold">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
