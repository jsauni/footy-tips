import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NameForm } from "@/components/name-form";
import { btn, Card, PageTitle, Skeleton } from "@/components/ui";
import { signOut } from "@/lib/actions";
import { getCurrentUser, isAdmin } from "@/lib/data";

export const metadata: Metadata = { title: "Me" };

export default function MePage() {
  return (
    <>
      <PageTitle title="Me" />
      <Suspense fallback={<Skeleton rows={3} />}>
        <Me />
      </Suspense>
    </>
  );
}

async function Me() {
  const [user, admin] = await Promise.all([getCurrentUser(), isAdmin()]);
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="font-medium break-all">{user.email}</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Tipping name</h2>
        <NameForm initial={user.displayName} />
      </Card>
      {admin ? (
        <nav className="overflow-hidden rounded-2xl border border-border bg-surface">
          <NavLink href="/admin">Admin: fixtures &amp; results</NavLink>
          <NavLink href="/admin/players">Admin: players</NavLink>
        </nav>
      ) : null}
      <nav className="overflow-hidden rounded-2xl border border-border bg-surface">
        <NavLink href="/rules">Rules &amp; scoring</NavLink>
        <NavLink href="/terms">Terms of use</NavLink>
        <NavLink href="/privacy">Privacy policy</NavLink>
        <NavLink href="/disclaimer">Disclaimer</NavLink>
      </nav>
      <form action={signOut}>
        <button className={`${btn.secondary} w-full`}>Sign out</button>
      </form>
      <Link href="/me/delete" className="block py-2 text-center text-sm text-danger underline">
        Delete my account
      </Link>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex justify-between border-border px-4 py-4 active:bg-surface-2 [&:not(:first-child)]:border-t"
    >
      <span>{children}</span> <span className="text-muted">›</span>
    </Link>
  );
}
