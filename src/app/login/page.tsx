import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LegalFooter } from "@/components/legal-page";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-3xl font-bold tracking-tight">Footy Tips</h1>
        <p className="mt-2 text-muted">Tip every round. Beat your mates.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-xs text-muted">
        By continuing you agree to the{" "}
        <Link href="/terms" className="underline">
          Terms of use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
      <LegalFooter />
    </main>
  );
}
