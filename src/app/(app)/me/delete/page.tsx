import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Notice, PageTitle, Skeleton } from "@/components/ui";
import { getCurrentUser, getDeletionBlockers, getMyCompetitions } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { DeleteAccountForm } from "./delete-form";

export const metadata: Metadata = { title: "Delete account" };

export default function DeleteAccountPage() {
  return (
    <>
      <Link href="/me" className="text-sm text-muted">
        ‹ Me
      </Link>
      <div className="mt-3">
        <PageTitle title="Delete account" />
      </div>
      <Suspense fallback={<Skeleton rows={3} />}>
        <DeleteAccount />
      </Suspense>
    </>
  );
}

async function DeleteAccount() {
  const user = await getCurrentUser();
  const [blockers, comps] = await Promise.all([getDeletionBlockers(), getMyCompetitions(user.id)]);
  const paidBuyIns = comps.filter(
    (c) => c.role === "member" && c.buy_in_cents && c.payment_status !== "unpaid",
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-2 text-[15px]">
        <p>
          This permanently deletes <strong>{user.email}</strong> and everything linked to it:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>your tipping name and all your tips, including past seasons</li>
          <li>your place on the public ladder and in every competition</li>
          <li>your buy-in payment records</li>
          <li>any competitions you run on your own</li>
        </ul>
        <p className="text-sm text-muted">
          It can’t be undone. You can sign up again later with the same email, but you’ll start
          from scratch. See the{" "}
          <Link href="/privacy#deleting" className="underline">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
      </Card>

      {blockers.length ? (
        <Notice tone="warn">
          <p className="font-semibold">First, delete the competitions you run</p>
          <p className="mt-1">
            Other players are in these, so they won’t be deleted automatically. Open each one,
            settle up any buy-ins, then use <strong>Settings → Delete competition</strong>.
          </p>
          <ul className="mt-2 space-y-1">
            {blockers.map((b) => (
              <li key={b.competition_id}>
                <Link href={`/comps/${b.competition_id}`} className="font-semibold underline">
                  {b.name}
                </Link>{" "}
                ({b.other_members} other player{b.other_members === 1 ? "" : "s"}
                {b.buy_in_cents ? `, ${formatMoney(b.buy_in_cents)} buy-in` : ""})
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {paidBuyIns.length ? (
        <Notice tone="warn">
          You’ve paid a buy-in for{" "}
          <strong>{paidBuyIns.map((c) => c.name).join(", ")}</strong>. Deleting your account takes
          you out of the running, and this app can’t refund money. Talk to the organiser first.
        </Notice>
      ) : null}

      <DeleteAccountForm disabled={blockers.length > 0} />

      <p className="text-center text-sm text-muted">
        Just want a break?{" "}
        <Link href="/me" className="underline">
          Sign out instead
        </Link>
        .
      </p>
    </div>
  );
}
