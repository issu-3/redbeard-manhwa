import { Metadata } from 'next';
import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  return generateSeoMetadata({
    title: 'Privacy Policy',
    description:
      'What information REDBEARD collects, how it is used and shared, advertising cookies, view logs and your choices.',
    url: `${APP_URL}/privacy`,
    settings,
  });
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold text-text-primary">Privacy Policy</h1>
      <p className="mt-3 text-sm text-text-muted">
        <strong className="font-semibold text-text-secondary">Last updated:</strong> 7 November 2026
      </p>
      <p className="mt-6 leading-relaxed text-text-secondary">
        This policy describes what information REDBEARD (redbeard.store, &quot;we&quot;,
        &quot;us&quot;) collects when you use the Service, and how it is used. &quot;The
        Service&quot; means the website and its reading features.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">1. Information you give us</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        <strong className="font-semibold text-text-primary">Account information.</strong> When you
        register, we collect your email address, a username and a password (stored in hashed form).
      </p>
      <p className="mt-3 leading-relaxed text-text-secondary">
        <strong className="font-semibold text-text-primary">Profile information.</strong> You may
        optionally add a display name, a short bio and an avatar or banner image.
      </p>
      <p className="mt-3 leading-relaxed text-text-secondary">
        <strong className="font-semibold text-text-primary">Your activity and content.</strong> The
        Service stores the things you create and do while signed in, including bookmarks, reading
        lists, reading history and reading progress, reviews and ratings, comments and replies,
        content you like, readers you follow, reports you submit, and in-service notifications and
        achievements. Your preferences (such as reader settings) are also stored.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        2. Information collected automatically
      </h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        <strong className="font-semibold text-text-primary">Reading and view logs.</strong> When
        you read a series or chapter, we record which series and chapter were viewed, the time of
        the view, your account ID if you are signed in, and your IP address. We use these records
        to provide reading features (such as your reading history and progress), to measure how
        series and chapters are read, and to help protect the Service against abuse.
      </p>
      <p className="mt-3 leading-relaxed text-text-secondary">
        <strong className="font-semibold text-text-primary">Server and security logs.</strong> Our
        hosting and infrastructure providers automatically process technical information needed to
        deliver the Service, such as IP addresses, browser and device information, and request
        times.
      </p>
      <p className="mt-3 leading-relaxed text-text-secondary">
        <strong className="font-semibold text-text-primary">Cookies and similar storage.</strong>{' '}
        We use cookies that are necessary for the Service to work, in particular to sign you in
        and keep you signed in (session cookies). We also use local storage in your browser for
        reading-related preferences. Third-party advertising partners (see Section 5) may set their
        own cookies or use similar technologies, over which we do not have control.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">3. How we use information</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">We use the information above to:</p>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>
          Operate the Service: create and secure accounts, sign you in, and show your bookmarks,
          lists, history and progress.
        </li>
        <li>
          Display your public activity on the Service, such as your username, avatar, reviews,
          comments and follows, to other users.
        </li>
        <li>
          Understand reading trends through aggregated view statistics, maintain the Service,
          prevent abuse and enforce our Terms.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        4. Sharing and service providers
      </h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        We do not sell your personal information for money. We share information only as needed to
        run the Service with the providers that host and support it, including:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>Hosting and deployment infrastructure (the website is hosted on Vercel).</li>
        <li>A cloud database provider that stores account and content data.</li>
        <li>
          Cloud file storage for chapter images and media (including Cloudflare R2 and Google
          Drive).
        </li>
        <li>
          Advertising networks (see Section 5). Separately from the providers above, advertising
          networks collect information directly through their own scripts and cookies when ads load;
          some privacy laws may describe that kind of advertising data collection as a
          &quot;sale&quot; or &quot;sharing&quot; of personal information, even though we do not
          sell information for money.
        </li>
      </ul>
      <p className="mt-3 leading-relaxed text-text-secondary">
        These providers process information on our behalf or as described in their own policies. We
        may also disclose information if required by law.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">5. Advertising</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        The Service displays advertising provided through scripts supplied by third-party ad
        networks, including Adsterra (used for banner, pop-under and social-bar ad formats) and
        Monetag (a site-wide advertising script). When ads load, these networks may set cookies and
        use similar technologies, and may collect information such as your IP address, device and
        browser details, the pages you visit and your interactions with ads. They may use that
        information for purposes such as serving, personalising and measuring advertising and
        preventing ad fraud, as described in their own privacy policies. We do not control how
        these networks use that information. The Site does not provide a separate consent tool for
        advertising cookies; you can block or delete cookies at any time through your browser
        settings, although doing so may affect how the Service and its ads work.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        6. How long we keep information
      </h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        We store account information and the content you create for as long as your account exists
        and the Service operates. View logs are kept as part of the Service&apos;s operating
        records; we do not publish a fixed retention period for view logs. If an account is banned
        or removed by us, associated information may remain in backups and operating records for a
        period of time.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">
        7. Your choices and requests
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-text-secondary">
        <li>You can update your display name, bio and avatar from your account settings at any time.</li>
        <li>
          You can stop using the Service at any time, and you can clear cookies through your
          browser settings (this will sign you out).
        </li>
        <li>
          You can ask questions about your information, or request that it be deleted, through our
          official Telegram and YouTube channels linked in the Site&apos;s footer. We will review
          each request. The Service does not currently provide an in-product account-deletion
          feature, and we cannot guarantee that every item of information can be deleted — for
          example, copies held in backups, or records kept for the operation and security of the
          Service.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">8. Children and age</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        The Service is not directed at children. Adult content on the Service is intended for
        readers who are at least 18 years old (or the age of majority where they live, if higher).
        The Service does not currently operate an age-verification system.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">9. Changes to this policy</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        We may update this policy from time to time. The current version will always be posted on
        this page with its &quot;Last updated&quot; date.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-text-primary">10. Contact</h2>
      <p className="mt-3 leading-relaxed text-text-secondary">
        Questions about this policy can be sent through our official Telegram and YouTube channels,
        which are linked in the Site&apos;s footer. We do not publish a contact email address.
      </p>
    </div>
  );
}
