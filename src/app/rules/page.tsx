import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
  return (
    <LegalPage title="Rules" updated={false}>

        <section>
          <h2>Tipping</h2>
          <ul>
            <li>Pick a winner for every game, every round.</li>
            <li>Each game locks at its own kick-off. You can change tips until then.</li>
            <li>One set of tips counts on the public ladder and in every competition you’re in.</li>
          </ul>
        </section>

        <section>
          <h2>Scoring</h2>
          <ul>
            <li>1 point for each correct tip.</li>
            <li>Draw: everyone who tipped that game gets the point.</li>
            <li>No tip: 0 points.</li>
            <li>Postponed games aren’t scored until they’re played.</li>
          </ul>
        </section>

        <section>
          <h2>Tiebreaker: margin</h2>
          <p>
            The first game of each round is the <strong>margin game</strong>. Tip how much your team
            will win by. Your error is the difference between your margin and the actual result
            (from your team’s side). Lowest total error across the season wins a tie on points. A
            missing margin adds 50.
          </p>
        </section>

        <section id="buy-ins" className="scroll-mt-6">
          <h2>Buy-in competitions</h2>
          <p className="mb-2">
            Full details are in the <Link href="/terms#buy-ins">Terms of use</Link>.
          </p>
          <ul>
            <li>
              <strong>This app never collects, holds or pays out money.</strong> It only records who
              the organiser has marked as paid.
            </li>
            <li>
              Buy-ins are a private arrangement between people who know each other. Organisers should
              only invite friends, family, workmates or club mates, never advertise to the public.
            </li>
            <li>
              Players pay the organiser directly (e.g. by PayID) using their personal payment
              reference, then tap “I’ve paid”. The organiser confirms once the money arrives.
            </li>
            <li>Only players whose buy-in has been confirmed can win the prize.</li>
            <li>
              The organiser must pay <strong>100% of buy-ins</strong> to the winner at the end of the
              season and take no cut, fee or commission. Ties on points and margin split the pool
              evenly.
            </li>
            <li>You must be 18 or over to create or join a buy-in competition.</li>
            <li>Buy-ins are capped at $500 per person.</li>
            <li>
              Laws on private gambling differ between states, territories and countries. Organisers
              are responsible for complying with the law where they and their players live.
            </li>
            <li>
              Disputes about payment are between the organiser and players. We can’t recover or
              refund money.
            </li>
          </ul>
          <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
            Gambling should be fun. If it isn’t, call the National Gambling Helpline on{" "}
            <a href="tel:1800858858" className="font-semibold underline">
              1800 858 858
            </a>{" "}
            or visit{" "}
            <a href="https://www.gamblinghelponline.org.au" className="underline">
              gamblinghelponline.org.au
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Your account</h2>
          <ul>
            <li>Change your tipping name any time on the Me page.</li>
            <li>
              To delete your account and all your tips, go to <strong>Me → Delete my account</strong>.
              See the <Link href="/privacy#deleting">Privacy Policy</Link> for exactly what’s deleted.
            </li>
            <li>Offensive tipping names aren’t allowed, and admins can rename or remove players.</li>
          </ul>
        </section>

        <p className="text-sm text-muted">
          By playing you agree to the <Link href="/terms">Terms of use</Link>. See also the{" "}
          <Link href="/privacy">Privacy Policy</Link> and <Link href="/disclaimer">Disclaimer</Link>.
          Footy Tips isn’t affiliated with the NRL or any club.
        </p>
    </LegalPage>
  );
}
