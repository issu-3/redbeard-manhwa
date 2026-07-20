'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

export const getCachedSettings = unstable_cache(
  async () => {
    return await getSettings();
  },
  ['site-settings'],
  { tags: ['settings'], revalidate: 3600 }
);

export async function getSettings() {
  try {
    const settings = await prisma.siteSetting.findMany();
    
    // If no settings exist yet, create defaults
    if (settings.length === 0) {
      console.log('No settings found. Seeding default settings...');
      const defaultSettings = [
        { key: 'siteName', value: 'REDBEARD' },
        { key: 'defaultLanguage', value: 'en' },
        { key: 'defaultTheme', value: 'dark' },
        { key: 'heroBannerEnabled', value: 'true' },
        { key: 'trendingCount', value: '10' },
        { key: 'latestCount', value: '20' },
        { key: 'defaultReadingMode', value: 'VERTICAL' },
        { key: 'lazyLoadingEnabled', value: 'true' },
        { key: 'commentsEnabled', value: 'true' },
        { key: 'registrationEnabled', value: 'true' },
        { key: 'emailVerificationRequired', value: 'false' },
        { key: 'maintenanceMode', value: 'false' },
        { key: 'youtubeUrl', value: 'https://www.youtube.com/@RedBeardShort' },
        // SEO Defaults
        { key: 'seo_site_title', value: 'REDBEARD - The Ultimate Reading Experience' },
        { key: 'seo_site_description', value: 'Premium manhwa reading platform offering the best reading experience.' },
        { key: 'seo_default_keywords', value: 'manhwa, manga, webtoon, read online' },
        { key: 'seo_robots', value: 'index, follow' },
        { key: 'seo_gsc_verification', value: '' },
        { key: 'seo_ga_measurement_id', value: '' },
        { key: 'seo_og_image', value: '/images/og-default.png' },
        { key: 'seo_twitter_handle', value: '@redbeard' },
        // Ad Settings
        { key: 'ads_enabled_adsense', value: 'false' },
        { key: 'ads_enabled_monetag', value: 'false' },
        { key: 'ads_enabled_adsterra', value: 'false' },
        { key: 'ads_enabled_propeller', value: 'false' },
        { key: 'ads_provider_priority', value: 'adsense,monetag,adsterra,propeller' },
        { key: 'ads_placement_header', value: 'none' },
        { key: 'ads_placement_footer', value: 'none' },
        { key: 'ads_placement_sidebar', value: 'none' },
        { key: 'ads_placement_reader', value: 'none' }
      ];

      // Perform upserts in a transaction to safely seed
      await prisma.$transaction(
        defaultSettings.map(({ key, value }) => 
          prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
          })
        )
      );

      // Return the defaults immediately
      const settingsMap: Record<string, string> = {};
      for (const s of defaultSettings) {
        settingsMap[s.key] = s.value;
      }
      return settingsMap;
    }

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    
    return settingsMap;
  } catch (error: any) {
    console.error('Failed to fetch settings (table might not exist):', error.message);
    return {};
  }
}
