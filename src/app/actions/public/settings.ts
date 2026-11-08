'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

const getCachedSettingsInternal = unstable_cache(
  async (): Promise<Record<string, string>> => {
    return await getSettings();
  },
  ['site-settings-v3'],
  { tags: ['settings'], revalidate: 3600 }
);

// OPT-08/09: React cache() deduplicates within the same request render,
// so generateMetadata + page component share a single cache lookup.
export const getCachedSettings: () => Promise<Record<string, string>> = cache(getCachedSettingsInternal);

export async function getSettings(): Promise<Record<string, string>> {
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
        { key: 'telegramUrl', value: '' },
        { key: 'instagramUrl', value: '' },
        { key: 'tiktokUrl', value: '' },
        // SEO Defaults
        { key: 'seo_site_title', value: 'REDBEARD - The Ultimate Reading Experience' },
        { key: 'seo_site_description', value: 'Premium reading platform offering the best reading experience.' },
        { key: 'seo_default_keywords', value: 'comics, series, read online' },
        { key: 'seo_robots', value: 'index, follow' },
        { key: 'seo_gsc_verification', value: '' },
        { key: 'seo_ga_measurement_id', value: '' },
        { key: 'seo_og_image', value: '/images/og-default-v2.png' },
        { key: 'seo_twitter_image', value: '' },
        { key: 'seo_twitter_handle', value: '@redbeard' },
        // Ad Settings
        { key: 'ads_enabled_monetag', value: 'false' },
        { key: 'ads_enabled_adsterra', value: 'false' },
        { key: 'ads_provider_priority', value: 'adsterra,monetag' },
        { key: 'ads_placement_homepage', value: 'none' },
        { key: 'ads_placement_series_detail', value: 'none' },
        { key: 'ads_placement_download', value: 'none' },
        { key: 'ads_placement_footer', value: 'none' }
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
      // Ensure empty/null values still have safe defaults
      if (!s.value || s.value.trim() === '') {
        let fallback = '';
        if (s.key === 'siteName') fallback = 'REDBEARD';
        if (s.key === 'seo_site_title') fallback = 'REDBEARD - The Ultimate Reading Experience';
        if (s.key === 'seo_site_description') fallback = 'Premium reading platform offering the best reading experience.';
        if (s.key === 'seo_og_image') fallback = '/images/og-default-v2.png';
        settingsMap[s.key] = fallback;
      } else {
        settingsMap[s.key] = s.value;
      }
    }

    if (!settingsMap.seo_og_image) {
      settingsMap.seo_og_image = '/images/og-default-v2.png';
    }
    if (!settingsMap.seo_twitter_image) {
      settingsMap.seo_twitter_image = '';
    }

    // Legacy default migration: '/images/og-default.png' was the system
    // default before the 2026-11 logo change. A stored value equal to it is
    // that old default, not a deliberate choice — and the path carries a
    // 1-year immutable cache that can keep serving stale bytes — so emit
    // the versioned v2 path instead.
    const normalizeLegacyOgPath = (v?: string): string | undefined => {
      if (!v) return v;
      const pathOnly = v.trim().replace(/^https?:\/\/[^/]+/i, '');
      return pathOnly === '/images/og-default.png' ? '/images/og-default-v2.png' : v;
    };
    settingsMap.seo_og_image = normalizeLegacyOgPath(settingsMap.seo_og_image) || '/images/og-default-v2.png';
    if (settingsMap.seo_twitter_image) {
      settingsMap.seo_twitter_image = normalizeLegacyOgPath(settingsMap.seo_twitter_image) || '';
    }

    return settingsMap;
  } catch (error: any) {
    console.error('Failed to fetch settings (table might not exist):', error.message);
    return {};
  }
}
