"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Tips", icon: TipsIcon, match: (p: string) => p === "/" },
  { href: "/ladder", label: "Ladder", icon: LadderIcon, match: (p: string) => p.startsWith("/ladder") },
  {
    href: "/comps",
    label: "Comps",
    icon: CompsIcon,
    match: (p: string) => p.startsWith("/comps") || p.startsWith("/join"),
  },
  { href: "/me", label: "Me", icon: MeIcon, match: (p: string) => p.startsWith("/me") || p.startsWith("/admin") },
];

export function BottomNav() {
  const pathname = usePathname();
  return <NavBar active={(m) => m(pathname)} />;
}

export function BottomNavFallback() {
  return <NavBar active={() => false} />;
}

function NavBar({ active }: { active: (match: (p: string) => boolean) => boolean }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((t) => {
          const on = active(t.match);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  on ? "text-accent" : "text-muted"
                }`}
              >
                <Icon />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function TipsIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}
function LadderIcon() {
  return (
    <svg {...iconProps}>
      <path d="M8 21V11M16 21V7M12 21V3M4 21h16" />
    </svg>
  );
}
function CompsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" />
    </svg>
  );
}
function MeIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4.2-6 8-6s7 2 8 6" />
    </svg>
  );
}
