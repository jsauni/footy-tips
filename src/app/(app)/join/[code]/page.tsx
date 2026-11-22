import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { btn, Card, Skeleton } from "@/components/ui";
import { previewCompetition } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join competition" };

export default function JoinPage(props: PageProps<"/join/[code]">) {
  return (
    <Suspense fallback={<Skeleton rows={2} />}>
      <Join params={props.params} />
    </Suspense>
  );
}

async function Join({ params }: { params: PageProps<"/join/[code]">["params"] }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase();
  const comp = await previewCompetition(code);

  if (!comp) {
    return (
      <Card className="text-center">
        <h1 className="text-xl font-bold">Invite code not found</h1>
        <p className="mt-2 text-muted">
          Check the code <span className="font-mono">{code}</span> with whoever invited you.
        </p>
        <Link href="/comps" className={`${btn.secondary} mt-4`}>
          Back to competitions
        </Link>
      </Card>
    );
  }

  if (comp.already_member) redirect(`/comps/${comp.id}`);

  const full = comp.member_count >= comp.max_members;

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">You’re invited to</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{comp.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Run by {comp.owner_name ?? "a player"} · {comp.member_count} playing · {comp.season} season
        </p>
      </div>
      {comp.buy_in_cents ? (
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p>
            <strong>{formatMoney(comp.buy_in_cents)} buy-in</strong>, winner takes all.
          </p>
          <p className="mt-1 text-muted">
            You pay the organiser directly. This app doesn’t collect or hold money.
          </p>
        </div>
      ) : null}
      {full ? (
        <p className="text-danger">This competition is full.</p>
      ) : (
        <JoinForm code={code} hasBuyIn={!!comp.buy_in_cents} />
      )}
    </Card>
  );
}
