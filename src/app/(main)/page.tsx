export const revalidate = 3600;
import { Metadata } from 'next';
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
  
  return generateSeoMetadata({
    title: title.split(' | ')[0], // generateSeoMetadata appends APP_NAME
    description,
    url: APP_URL
  });
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

  return (
    <>
      <h1 className="sr-only">REDBEARD - The Ultimate Reading Experience</h1>
      <div className="my-6 px-4 md:my-8 md:px-8 lg:px-16 xl:px-20 flex justify-center overflow-hidden">
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
