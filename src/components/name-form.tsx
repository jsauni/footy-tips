"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { btn, input, Notice } from "@/components/ui";
import { checkDisplayName } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

export function NameForm({
  initial = "",
  submitLabel = "Save",
}: {
  initial?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Use 2–30 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    const problem = await checkDisplayName(trimmed);
    if (problem) {
      setBusy(false);
      setError(problem);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    if (!error) {
      // Mint a fresh JWT so the new name is in the session claims.
      await supabase.auth.refreshSession();
    }
    setBusy(false);
    if (error) {
      // The database also rejects blocked names; its error isn't user-friendly.
      setError("Couldn’t save that name. Try a different one.");
      return;
    }
    setSaved(true);
    const next = params.get("next");
    if (initial === "") {
      // Onboarding: full navigation, because the client router has cached
      // the earlier "go to onboarding" redirects for this session.
      window.location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input
        className={input}
        name="display_name"
        autoComplete="nickname"
        required
        minLength={2}
        maxLength={30}
        placeholder="e.g. Big Kev"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved && initial !== "" ? <Notice tone="success">Saved.</Notice> : null}
      <button className={`${btn.primary} w-full`} disabled={busy || !hydrated}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
