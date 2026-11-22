"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { btn, input, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

function safeNext(next: string | null): string {
  // Only allow same-site relative paths.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const hydrated = useHydrated();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : /database error/i.test(error.message)
            ? // Raised by the blocked-email check on sign-up.
              "This email address can’t be used to sign up. If you think that’s a mistake, contact us (see the Privacy Policy)."
            : error.message,
      );
      return;
    }
    setStep("code");
    setInfo(`We sent a code to ${email.trim()}.`);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setError("That code didn’t work. Check it, or send a new one.");
      return;
    }
    // Full navigation so no pre-login router cache survives.
    window.location.replace(next);
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        {params.get("deleted") ? (
          <Notice tone="success">Your account and all your tips have been deleted.</Notice>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            className={input}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <button className={`${btn.primary} w-full`} disabled={busy || !hydrated}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
        <p className="text-center text-xs text-muted">
          No password needed. New here? This creates your account.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      {info ? <Notice tone="success">{info}</Notice> : null}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Sign-in code</span>
        <input
          className={`${input} text-center font-mono text-2xl tracking-[0.4em]`}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          maxLength={10}
          required
          autoFocus
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </label>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button className={`${btn.primary} w-full`} disabled={busy || !hydrated || code.length < 6}>
        {busy ? "Checking…" : "Sign in"}
      </button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-muted underline"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Change email
        </button>
        <button type="button" className="text-accent underline" disabled={busy} onClick={() => sendCode()}>
          Resend code
        </button>
      </div>
    </form>
  );
}
