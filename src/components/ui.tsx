import type { ReactNode } from "react";
import { contrastText } from "@/lib/format";
import type { Team } from "@/lib/types";

export const btn = {
  primary:
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-fg active:opacity-80 disabled:opacity-50",
  secondary:
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 font-semibold active:bg-surface-2 disabled:opacity-50",
  danger:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-danger/40 px-4 font-semibold text-danger active:bg-danger-soft disabled:opacity-50",
  smallPrimary:
    "inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg active:opacity-80 disabled:opacity-50",
  small:
    "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold active:bg-surface-2 disabled:opacity-50",
};

export const input =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>
      {children}
    </section>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function TeamBadge({ team, size = 40 }: { team: Team; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.3,
        background: team.primary_color,
        color: contrastText(team.primary_color),
        boxShadow: `inset 0 0 0 3px ${team.secondary_color}`,
      }}
    >
      {team.abbreviation}
    </span>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-surface-2 text-fg",
    warn: "bg-warn-soft text-warn-fg",
    error: "bg-danger-soft text-danger",
    success: "bg-accent-soft text-accent",
  };
  return <div className={`rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />
      ))}
    </div>
  );
}
