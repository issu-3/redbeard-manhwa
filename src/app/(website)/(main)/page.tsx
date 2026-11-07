export const revalidate = 300;
import { Metadata } from 'next';
import Link from 'next/link';
// Removed Link import since it's unused
import { HomepageClient } from './homepage-client';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdRenderer } from '@/components/ads/AdRenderer';
import { SubscribeCard } from '@/components/shared/SubscribeCard';

import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  const title = settings.seo_site_title || 'REDBEARD - The Ultimate Reading Experience';
  const description = settings.seo_site_description || 'Read the best series and comics online.';
  const baseUrl = APP_URL || 'https://redbeard.store';
  
  const seo = generateSeoMetadata({
    title: title.split(' | ')[0], // generateSeoMetadata appends APP_NAME
    description,
    url: baseUrl,
    settings,
  });

  return {
    ...seo,
    alternates: {
      canonical: baseUrl,
    },
  };
}

import { getCachedHomepageSections, getCachedHeroBanners, getCachedSectionSeries } from '@/app/actions/public/homepage';
import { getCachedGenreList } from '@/lib/genres';

export default async function HomePage() {
  const settings = await getCachedSettings();
  const genreList = await getCachedGenreList();
  const allSections = await getCachedHomepageSections();
  const activeSections = allSections.filter((s) => s.isActive).sort((a, b) => a.order - b.order);

  const sectionData: Record<string, any[]> = {};

  const sectionPromises = activeSections.map(async (sec) => {
    let data: unknown[] = [];
    try {
      if (sec.type === 'HERO_BANNER') {
        data = await getCachedHeroBanners();
      } else if (sec.type === 'CONTINUE_READING') {
        data = [];
      } else {
        data = await getCachedSectionSeries(sec.type, sec.limit, sec.isManual || false, sec.manualSeriesId || []);
      }
    } catch (e) {
      console.warn(`Error loading homepage section ${sec.type}:`, e);
    }
    return { type: sec.type, data };
  });

  const results = await Promise.allSettled(sectionPromises);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      sectionData[result.value.type] = result.value.data;
    } else {
      console.error('Failed to load homepage section:', result.reason);
    }
  }

  const baseUrl = APP_URL || 'https://redbeard.store';
  const websiteLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: settings.siteName || 'REDBEARD',
        description: settings.seo_site_description || 'Read the best series and comics online.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: settings.siteName || 'REDBEARD',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <h1 className="sr-only">REDBEARD - The Ultimate Reading Experience</h1>
      <div className="px-4 md:px-8 lg:px-16 xl:px-20 flex justify-center overflow-hidden [&:not(:has(.ad-container))]:hidden">
        <AdRenderer placement="homepage" />
      </div>
      <HomepageClient
        sections={activeSections}
        sectionData={sectionData}
        isLoggedIn={false} // Managed internally by HomepageClient via next-auth
      />
      {/* Internal linking: genre discovery from the homepage. Genre pages
          previously received links almost only from the genres index. */}
      {genreList.length > 0 && (
        <section aria-label="Browse by genre" className="px-4 md:px-8 lg:px-16 xl:px-20 pb-6 md:pb-8">
          <h2 className="mb-4 text-xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            Browse by Genre
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {genreList.map((g) => (
              <Link
                key={g.slug}
                href={`/browse/genres/${g.slug}`}
                prefetch={false}
                className="rounded-md bg-card/80 border border-border/60 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="px-4 md:px-8 lg:px-16 xl:px-20 pb-6 md:pb-8">
        <SubscribeCard youtubeUrl={settings.youtubeUrl || null} />
      </div>
    </>
  );
}
