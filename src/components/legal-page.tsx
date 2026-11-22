import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

/** Shared layout for Rules, Terms, Privacy and Disclaimer (all public pages). */
export function LegalPage({
  title,
  updated = true,
  children,
}: {
  title: string;
  updated?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="pt-safe mx-auto max-w-lg px-4 py-6">
      <Link href="/" className="text-sm text-muted">
        ‹ Back
      </Link>
      <article className="mt-4 space-y-6 text-[15px] leading-relaxed [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_p+ul]:mt-2 [&_section]:scroll-mt-6 [&_ul+p]:mt-2">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {updated ? <p className="mt-1 text-sm text-muted">Last updated {site.legalUpdated}</p> : null}
        </header>
        {children}
      </article>
      <LegalFooter />
    </main>
  );
}

export function LegalFooter() {
  return (
    <nav className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-muted">
      <Link href="/rules">Rules</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/disclaimer">Disclaimer</Link>
    </nav>
  );
}

export function Contact() {
  return (
    <a href={`mailto:${site.contactEmail}`} className="font-semibold">
      {site.contactEmail}
    </a>
  );
}
