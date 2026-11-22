import type { Metadata } from "next";
import { Suspense } from "react";
import { NameForm } from "@/components/name-form";

export const metadata: Metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Pick a tipping name</h1>
      <p className="mt-2 mb-6 text-muted">
        This is how you’ll appear on ladders. Your email stays private.
      </p>
      <Suspense>
        <NameForm submitLabel="Start tipping" />
      </Suspense>
    </main>
  );
}
