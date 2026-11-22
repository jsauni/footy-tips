import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <section>
        <p>
          {site.name} is a free rugby league tipping game run by {site.operator} (“we”, “us”). This
          policy explains what personal information we collect, why, who can see it, and how to
          get it deleted. We handle personal information in line with the Australian Privacy
          Principles in the <em>Privacy Act 1988</em> (Cth).
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <h3>When you sign up and play</h3>
        <ul>
          <li>Your email address, which we use to send you sign-in codes.</li>
          <li>Your tipping name.</li>
          <li>Your tips and margin tips, and when you made them.</li>
          <li>The competitions you create or join, and your role in them.</li>
          <li>When your account was created and when you last signed in.</li>
        </ul>
        <h3>In buy-in competitions</h3>
        <ul>
          <li>That you confirmed you’re 18 or over, and when.</li>
          <li>
            Your payment reference (like <span className="font-mono">TIPS-7K3Q</span>), whether
            you’ve said you paid, and whether the organiser confirmed it, with dates.
          </li>
          <li>
            If you’re the organiser: the PayID, account name and payment note you enter, that you
            accepted the organiser terms, and when you recorded paying the prize.
          </li>
        </ul>
        <p>
          <strong>We never collect bank, card or payment details from players</strong>, and we
          never receive or hold money. Players pay organisers directly through their own bank.
        </p>
        <h3>Automatically</h3>
        <ul>
          <li>
            Technical information such as your IP address, browser type and the time of requests.
            Our hosting and sign-in providers log these to run the service and protect it from
            abuse. If the app hits an error, a report about it goes to our error-reporting
            provider (see below).
          </li>
          <li>
            Cookies that keep you signed in. We use these only to keep you signed in. We don’t use
            advertising or analytics cookies, and we don’t track you across other sites.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To sign you in, run the game, score tips and show ladders.</li>
          <li>To run private competitions and show buy-in payment status to their members.</li>
          <li>To answer your questions and handle complaints.</li>
          <li>
            To keep the game fair and safe, for example by removing offensive names or accounts that
            break the <Link href="/terms">Terms</Link>.
          </li>
          <li>To meet our legal obligations.</li>
        </ul>
        <p>
          We don’t sell your personal information, use it for advertising, or send you marketing.
          We only email you sign-in codes.
        </p>
      </section>

      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>
            <strong>Every player</strong> can see your tipping name, points and ladder position, and
            your tip on a game once that game has kicked off (never before).
          </li>
          <li>
            <strong>Members of a competition you’re in</strong> can see that you’re a member and,
            for buy-in competitions, your payment status and reference.
          </li>
          <li>
            <strong>If you organise a buy-in competition</strong>, its members can see the PayID,
            account name and payment note you enter. A PayID is often a phone number or email
            address, so only enter one you’re happy for those people to see.
          </li>
          <li>
            <strong>Our admins</strong> can see your email address, tipping name, join date and
            last sign-in, to help with support and moderation.
          </li>
        </ul>
        <p>We never show your email address to other players.</p>
      </section>

      <section>
        <h2>Service providers and overseas storage</h2>
        <p>We use these providers to run the app. They handle your information only on our behalf:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: database and sign-in. Your account and game data are stored
            in {site.dataRegion}.
          </li>
          <li>
            <strong>Vercel</strong>: website hosting. It may process requests (including your IP
            address) on servers outside Australia, including the United States.
          </li>
          <li>
            <strong>{site.emailProvider}</strong>: sends sign-in emails, so it receives your email
            address.
          </li>
          <li>
            <strong>Sentry</strong>: error reporting. When the app crashes, it receives technical
            details about the error (the page, your browser and device type, and what the app was
            doing). We set it up not to receive your IP address, email address, cookies or tips.
            Reports are stored in the United States and deleted after 90 days at most.
          </li>
        </ul>
        <p>
          Because some of these providers operate overseas, your information may be accessed or
          processed outside Australia. We choose providers that protect personal information with
          industry-standard security.
        </p>
        <p>We may also disclose information if the law requires it.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your information while you have an account. When you delete your account we
          delete your information from the live database straight away. Copies may remain in
          backups and provider logs for up to 30 days before they’re overwritten.
        </p>
        <p>
          If we remove an account for breaking the Terms, we may keep its email address on a
          blocked list so it can’t be used to sign up again.
        </p>
      </section>

      <section id="deleting">
        <h2>Deleting your account</h2>
        <p>
          You can delete your account at any time in the app: go to{" "}
          <strong>Me → Delete my account</strong>, type DELETE and confirm. This permanently
          deletes:
        </p>
        <ul>
          <li>your email address, sign-in details and tipping name</li>
          <li>all your tips, including past seasons, so you disappear from every ladder</li>
          <li>your competition memberships and buy-in payment records</li>
          <li>any competitions you run with no other players</li>
        </ul>
        <p>
          If you run a competition that has other players, you need to delete it first (from the
          competition’s Settings), after settling any buy-ins. Deleting your account doesn’t refund
          any money you paid to an organiser. Sort that out with them directly.
        </p>
        <p>
          If you can’t sign in, email <Contact /> from the address on your account and we’ll delete
          it for you.
        </p>
      </section>

      <section>
        <h2>Accessing and correcting your information</h2>
        <p>
          You can change your tipping name any time on the <strong>Me</strong> page. To ask for a
          copy of the personal information we hold about you, or to correct it, email <Contact />.
          We’ll respond within 30 days.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Sign-in uses one-time codes, so there are no passwords to leak. Data is encrypted in
          transit and access is restricted by database security rules. No system is completely
          secure. If a data breach is likely to cause you serious harm, we’ll tell you and the
          Office of the Australian Information Commissioner as the law requires.
        </p>
      </section>

      <section>
        <h2>Young people</h2>
        <p>
          You must be 13 or over to use {site.name}. If you’re under 18, check with a parent or
          guardian first. Buy-in competitions are 18+ only.
        </p>
      </section>

      <section>
        <h2>Complaints</h2>
        <p>
          If you’re worried about how we’ve handled your information, email <Contact />. We’ll
          reply within 30 days. If you’re not satisfied, you can complain to the Office of the
          Australian Information Commissioner at{" "}
          <a href="https://www.oaic.gov.au">oaic.gov.au</a> or on 1300 363 992.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We’ll update this page if anything changes and show the new date at the top. If a change
          significantly affects how we use your information, we’ll tell you in the app.
        </p>
      </section>
    </LegalPage>
  );
}
