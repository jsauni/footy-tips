import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <section>
        <p>
          These terms are an agreement between you and {site.operator} (“we”, “us”), who runs{" "}
          {site.name}. By signing in you agree to them, along with the{" "}
          <Link href="/rules">Rules</Link>, <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/disclaimer">Disclaimer</Link>. If you don’t agree, please don’t use the app.
        </p>
      </section>

      <section>
        <h2>1. Who can play</h2>
        <ul>
          <li>You must be 13 or over. If you’re under 18, you need a parent or guardian’s permission.</li>
          <li>You must be 18 or over to create or join a buy-in competition.</li>
          <li>One account per person, using an email address you control.</li>
        </ul>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p>
          You sign in with a one-time code sent to your email. Keep your email account secure:
          anyone who can read it can sign in as you. You can delete your account at any time from{" "}
          <strong>Me → Delete my account</strong>.
        </p>
      </section>

      <section>
        <h2>3. Tipping names and behaviour</h2>
        <p>Your tipping name is public to other players. Don’t use a name, or behave in a way, that:</p>
        <ul>
          <li>is offensive, abusive, discriminatory, sexual or threatening</li>
          <li>pretends to be someone else, an official, a club or the NRL</li>
          <li>includes someone else’s personal information</li>
          <li>advertises or promotes anything</li>
        </ul>
        <p>Don’t try to cheat, interfere with the app, or get around the tipping lock-out.</p>
        <p>
          We may change your tipping name, or suspend or delete your account, if you break these
          terms. Where it’s reasonable we’ll try to contact you first.
        </p>
      </section>

      <section>
        <h2>4. Fixtures, results and scoring</h2>
        <ul>
          <li>
            Our admins enter fixtures, kick-off times and results by hand. They may contain mistakes
            or be updated after the game.
          </li>
          <li>
            Tips lock at the kick-off time shown in the app. If a time is wrong, the time in the app
            still applies unless we correct it.
          </li>
          <li>
            We may correct fixtures and results at any time, and ladders will re-score
            automatically. Our records of tips and results are final.
          </li>
          <li>
            Scoring and tiebreakers work as described in the <Link href="/rules">Rules</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Private competitions</h2>
        <p>
          Anyone can create a private competition and invite people with a link or code. The
          person who creates it (the “organiser”) can remove members and delete the competition.
          Deleting a competition removes it for everyone.
        </p>
      </section>

      <section id="buy-ins">
        <h2>6. Buy-in competitions</h2>
        <p>
          A buy-in competition is a private arrangement between people who know each other.{" "}
          <strong>
            We don’t collect, hold, transfer or pay out money, and we aren’t a party to any buy-in.
          </strong>{" "}
          The app only shows what the organiser and players record.
        </p>
        <h3>If you’re the organiser, you agree to:</h3>
        <ul>
          <li>only invite people you know personally, and never advertise the competition publicly</li>
          <li>hold buy-ins safely and pay 100% of them to the winner (split evenly if tied)</li>
          <li>take no cut, fee or commission</li>
          <li>keep the payment details you enter accurate, and record payments honestly</li>
          <li>sort out refunds if you cancel the competition or remove someone who has paid</li>
          <li>check that running the competition is lawful where you and your players live</li>
        </ul>
        <h3>If you’re a player, you agree that:</h3>
        <ul>
          <li>you pay the organiser directly, at your own risk</li>
          <li>only players whose buy-in the organiser has confirmed can win</li>
          <li>disputes about money are between you and the organiser</li>
        </ul>
        <p>
          Buy-ins are capped at $500 per person and can’t be changed once a competition is created.
          We can’t recover, refund or guarantee any payment. Gambling laws differ between states
          and countries; don’t join a buy-in where it isn’t allowed.
        </p>
        <p>
          If gambling stops being fun, call the National Gambling Helpline on 1800 858 858 or visit{" "}
          <a href="https://www.gamblinghelponline.org.au">gamblinghelponline.org.au</a>.
        </p>
      </section>

      <section>
        <h2>7. The service</h2>
        <p>
          {site.name} is free. We try to keep it running and accurate, but we may change features,
          pause the app for maintenance, or stop running it. If we plan to shut it down, we’ll
          give notice in the app where we can.
        </p>
      </section>

      <section>
        <h2>8. Names and trademarks</h2>
        <p>
          {site.name} is an independent fan-made game. It isn’t affiliated with, endorsed by or
          sponsored by the National Rugby League or any club. Team names are used only to identify
          teams. See the <Link href="/disclaimer">Disclaimer</Link>.
        </p>
      </section>

      <section>
        <h2>9. Liability</h2>
        <p>
          Nothing in these terms excludes rights you have under the Australian Consumer Law that
          can’t be excluded. Otherwise, to the extent the law allows:
        </p>
        <ul>
          <li>the app is provided “as is”, without warranties about accuracy or availability</li>
          <li>
            we aren’t liable for any loss arising from your use of the app, errors in fixtures or
            results, or any buy-in, payment or dispute between users
          </li>
          <li>
            where our liability can’t be excluded but can be limited, it’s limited to supplying the
            service again
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Changes to these terms</h2>
        <p>
          We may update these terms. We’ll show the new date at the top and, for significant
          changes, tell you in the app. If you keep using the app after a change, you accept the
          updated terms.
        </p>
      </section>

      <section>
        <h2>11. Governing law</h2>
        <p>
          These terms are governed by the laws of {site.governingState}, Australia. You and we
          submit to the courts of that state.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions or complaints: <Contact />.
        </p>
      </section>
    </LegalPage>
  );
}
