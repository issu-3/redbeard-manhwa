export const revalidate = 300;
import { Metadata } from 'next';
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

export default async function HomePage() {
  const settings = await getCachedSettings();
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
        logo: `${baseUrl}/icons/icon-512x512.png`
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
      <div className="my-2 px-4 md:my-5 md:px-8 lg:px-16 xl:px-20 flex justify-center overflow-hidden">
        <AdRenderer placement="homepage" />
      </div>
      <HomepageClient
        sections={activeSections}
        sectionData={sectionData}
        isLoggedIn={false} // Managed internally by HomepageClient via next-auth
      />
      <div className="px-4 md:px-8 lg:px-16 xl:px-20 pb-16">
        <SubscribeCard youtubeUrl={settings.youtubeUrl || null} />
      </div>
    </>
  );
}
