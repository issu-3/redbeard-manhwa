import { Metadata } from 'next';
import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Terms of Service',
    description:
      'The terms that govern your use of REDBEARD: accounts, adult content, acceptable use, user content, copyright complaints and liability.',
    url: `${APP_URL}/terms`,
    settings,
  });
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold text-text-primary">Terms of Service</h1>
      <p className="mt-3 text-sm text-text-muted">
        <strong className="font-semibold text-text-secondary">Last updated:</strong> 7 November 2026
      </p>
      <p className="mt-6 leading-relaxed text-text-secondary">
        Welcome to REDBEARD (the &quot;Site&quot;, &quot;we&quot;, &quot;us&quot;). By accessing or
        using redbeard.store (the &quot;Service&quot;), you agree to these Terms of Service. If you
        do not agree, please do not use the Service.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">1. The Service</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        REDBEARD is an online reading platform where visitors can browse and read manhwa, manga and
        webtoon series and chapters in English, and where registered users can keep bookmarks,
        reading history and reading lists, follow other readers, and post reviews and comments.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">2. Accounts</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>
          You may read most content without an account. Some features (including bookmarks, reading
          history, lists, reviews, comments and follows) require a free account.
        </li>
        <li>
          You can register with an email address, a username and a password.
        </li>
        <li>
          You are responsible for keeping your sign-in details confidential and for activity that
          happens under your account.
        </li>
        <li>You must give accurate information when registering and keep it up to date.</li>
        <li>
          We may suspend or ban accounts that violate these Terms. Accounts may also be banned for
          abusive behaviour toward other users.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">3. Adult content</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        Some series on the Service are intended for adult readers and may contain mature themes and
        imagery. Such content is labelled or described as adult/18+ where applicable. By accessing
        adult content you confirm that you are at least 18 years old (or the age of majority in
        your place of residence, if higher) and that accessing such content is lawful where you
        live. If you are not, please do not access adult content on the Service. The Service does
        not currently operate an age-verification system; this confirmation is your own
        representation, and we rely on it.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">4. Acceptable use</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">You agree not to:</p>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>
          Copy, download, redistribute or republish chapters or other content from the Service,
          except where permitted by the rights holder or by law.
        </li>
        <li>
          Scrape, crawl or harvest the Service at a scale that burdens its infrastructure, or
          attempt to bypass technical measures that control access to content or accounts.
        </li>
        <li>
          Upload, post or share content that is unlawful, harassing, hateful, sexually exploitative
          of minors, or that infringes another person&apos;s rights.
        </li>
        <li>
          Impersonate another person, create accounts to evade a ban, or use the Service to spam
          or advertise without permission.
        </li>
        <li>
          Attempt to gain unauthorised access to accounts, the admin area, or the Service&apos;s
          infrastructure.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        5. User content (reviews, comments and profiles)
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>
          Registered users can post reviews and ratings, comments and replies, and set a display
          name, username, bio and avatar.
        </li>
        <li>
          You keep ownership of what you post. By posting it, you grant us a non-exclusive,
          royalty-free licence to host, store, reproduce and display that content as necessary for
          operating, maintaining and improving the Service.
        </li>
        <li>
          You are responsible for what you post. Do not post spoilers with malicious intent,
          personal information of others, or content you do not have the right to share.
        </li>
        <li>
          Other users can report content, and we may review reported content. We may remove
          content, without prior notice, that violates these Terms or applicable law, and we may
          restrict accounts that repeatedly do so.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        6. Intellectual property and copyright
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>The REDBEARD name, site design and original site content belong to us or our licensors.</li>
        <li>
          Series, chapters and artwork available on the Service belong to their respective
          creators, publishers and rights holders.
        </li>
        <li>
          <strong className="font-semibold text-text-primary">Copyright complaints.</strong> If you
          are a rights holder (or authorised to act for one) and believe your work is available on
          the Service without authorisation, you can send a complaint through our official Telegram
          or YouTube channels linked in the Site&apos;s footer. To help us review it, please
          include:
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li>Your name and the name of the copyright owner you represent, if different.</li>
            <li>A description of the copyrighted work you believe has been infringed.</li>
            <li>The exact URL(s) on the Service where the material appears.</li>
            <li>Evidence that you own the work or are authorised to act for the owner.</li>
            <li>
              A statement that you have a good-faith belief that the use is not authorised by the
              owner, its agent, or the law.
            </li>
            <li>Contact details so we can reach you about the complaint.</li>
          </ul>
        </li>
        <li>
          We review complaints sent with this information and, where a complaint appears valid,
          remove or restrict access to the material in question.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">7. Advertising</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        The Service is supported by advertising served by third-party ad networks. We are not
        responsible for the content of third-party advertisements or for external websites they may
        lead to.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">8. Availability and changes</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>
          We work to keep the Service available, but we do not guarantee uninterrupted access.
          Content may be added, changed or removed, and features may change over time.
        </li>
        <li>
          We may update these Terms; the current version will always be posted on this page with
          its &quot;Last updated&quot; date. Continuing to use the Service after a change means you
          accept the updated Terms.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        9. Disclaimer and limitation of liability
      </h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties
        of any kind to the maximum extent permitted by law. To the maximum extent permitted by law,
        we are not liable for indirect or consequential losses arising from your use of, or
        inability to use, the Service. Nothing in these Terms excludes or limits any liability, or
        affects any statutory right, that cannot be excluded, limited or waived under applicable
        law.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">10. Contact</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        Questions about these Terms can be sent through our official Telegram and YouTube channels,
        which are linked in the Site&apos;s footer. We do not publish a contact email address.
      </p>
    </div>
  );
}
