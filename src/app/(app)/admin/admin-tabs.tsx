import Link from "next/link";

export function AdminTabs({ active }: { active: "fixtures" | "players" }) {
  const tab = (key: typeof active, href: string, label: string) => (
    <Link
      href={href}
      className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
        active === key ? "bg-surface shadow-sm" : "text-muted"
      }`}
      aria-current={active === key ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1" aria-label="Admin sections">
      {tab("fixtures", "/admin", "Fixtures & results")}
      {tab("players", "/admin/players", "Players")}
    </nav>
  );
}
