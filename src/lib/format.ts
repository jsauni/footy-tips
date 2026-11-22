export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
  }).format(dollars);
}

/** Returns black or white, whichever reads better on the given hex colour. */
export function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "#111111" : "#ffffff";
}

/** The margin game is the first non-postponed fixture of the round by kickoff. */
export function marginGameId<T extends { id: number; kickoff_at: string; status: string }>(
  roundFixtures: T[],
): number | null {
  const sorted = roundFixtures
    .filter((f) => f.status !== "postponed")
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at) || a.id - b.id);
  return sorted[0]?.id ?? null;
}
