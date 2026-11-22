import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { btn, input, PageTitle, Skeleton } from "@/components/ui";
import { adminListPlayers, getCurrentUser, isAdmin, listBlockedEmails } from "@/lib/data";
import { AdminTabs } from "../admin-tabs";
import { BlockedEmail, PlayerRow } from "./player-row";

export const metadata: Metadata = { title: "Players · Admin" };

export default function PlayersPage(props: PageProps<"/admin/players">) {
  return (
    <>
      <PageTitle title="Admin" />
      <Suspense fallback={<Skeleton rows={6} />}>
        <Players searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Players({
  searchParams,
}: {
  searchParams: PageProps<"/admin/players">["searchParams"];
}) {
  if (!(await isAdmin())) notFound();
  const sp = await searchParams;
  const q = String((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim();
  const [me, players, blocked] = await Promise.all([
    getCurrentUser(),
    adminListPlayers(q),
    listBlockedEmails(),
  ]);

  return (
    <div className="space-y-4">
      <AdminTabs active="players" />
      <form className="flex gap-2" role="search">
        <input
          className={input}
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          aria-label="Search players"
        />
        <button className={btn.secondary}>Search</button>
      </form>
      <p className="text-sm text-muted">
        {q ? `${players.length} match${players.length === 1 ? "" : "es"} for “${q}”.` : "Newest players first."}{" "}
        Rename anyone with an offensive name. Removing a player deletes their account and tips.
      </p>

      {players.length === 0 ? (
        <p className="text-center text-muted">No players found.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              isMe={p.id === me.id}
              joined={<LocalTime iso={p.created_at} format="day" />}
            />
          ))}
        </ul>
      )}

      {blocked.length ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Blocked emails ({blocked.length})</h2>
          <p className="text-sm text-muted">These addresses can’t create a new account.</p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {blocked.map((b) => (
              <BlockedEmail key={b.email} email={b.email} note={b.note} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
