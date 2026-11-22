import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer">
      <section>
        <h2>Not affiliated with the NRL</h2>
        <p>
          {site.name} is an independent, fan-made tipping game. It isn’t affiliated with, endorsed
          by, sponsored by or connected to the National Rugby League (NRL), the Australian Rugby
          League Commission or any club. Club and competition names belong to their owners and are
          used only to identify teams. We don’t use official logos.
        </p>
      </section>

      <section>
        <h2>Fixtures and results</h2>
        <p>
          Fixtures, kick-off times and results are entered by hand and may be wrong, incomplete or
          late. For official information, check the NRL or your club. Ladders in this app are for
          fun and aren’t official.
        </p>
      </section>

      <section>
        <h2>Not a betting service</h2>
        <p>
          {site.name} isn’t a bookmaker or wagering service. There are no odds, and we don’t take
          bets, sell entries or award prizes.
        </p>
        <p>
          Some private competitions record an optional buy-in that players pay to the organiser.
          That’s a private arrangement between people who know each other. We never handle the
          money and aren’t responsible for it. See the{" "}
          <Link href="/terms#buy-ins">Terms</Link>.
        </p>
      </section>

      <section>
        <h2>No advice</h2>
        <p>Nothing in the app is financial, legal or betting advice.</p>
      </section>

      <section>
        <h2>Gambling help</h2>
        <p>
          If gambling is causing problems for you or someone you know, free and confidential help
          is available 24/7. Call the National Gambling Helpline on{" "}
          <a href="tel:1800858858" className="font-semibold">
            1800 858 858
          </a>{" "}
          or visit <a href="https://www.gamblinghelponline.org.au">gamblinghelponline.org.au</a>.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Spotted a wrong result or have a question? Email <Contact />.
        </p>
      </section>
    </LegalPage>
  );
}
