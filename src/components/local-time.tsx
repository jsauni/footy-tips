"use client";

import { useHydrated } from "@/lib/use-hydrated";

/** Formats a timestamp in the viewer's own timezone (server renders AEST fallback). */
export function LocalTime({
  iso,
  format = "datetime",
}: {
  iso: string;
  format?: "datetime" | "day" | "time";
}) {
  const isClient = useHydrated();
  const opts: Intl.DateTimeFormatOptions =
    format === "day"
      ? { weekday: "long", day: "numeric", month: "long" }
      : format === "time"
        ? { hour: "numeric", minute: "2-digit" }
        : { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
  if (!isClient) opts.timeZone = "Australia/Sydney";
  const text = new Intl.DateTimeFormat("en-AU", opts).format(new Date(iso));
  return <time dateTime={iso}>{text}</time>;
}
