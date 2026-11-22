import { Suspense } from "react";
import { BottomNav, BottomNavFallback } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-safe">
      <main className="mx-auto max-w-lg px-4 pt-5 pb-28">{children}</main>
      <Suspense fallback={<BottomNavFallback />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
