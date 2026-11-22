"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, input } from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";

export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const hydrated = useHydrated();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (c) router.push(`/join/${encodeURIComponent(c)}`);
      }}
    >
      <input
        className={`${input} font-mono uppercase`}
        placeholder="Invite code"
        aria-label="Invite code"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={12}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className={btn.secondary} disabled={!hydrated || !code.trim()}>
        Join
      </button>
    </form>
  );
}
