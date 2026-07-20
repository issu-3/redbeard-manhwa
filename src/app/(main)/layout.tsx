import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdSlot } from '@/components/ads/AdSlot';

import { APP_URL } from '@/lib/constants';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = APP_URL || 'http://localhost:3000';
  
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'REDBEARD',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'REDBEARD',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <Header />
      <AdSlot placement="header" />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">{children}</main>
      <AdSlot placement="footer" />
      <Footer />
      <MobileNav />
    </div>
  );
}
