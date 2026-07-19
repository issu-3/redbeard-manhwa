'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { auth } from '@/auth';

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
        { key: 'seo_twitter_handle', value: '@redbeard' }
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

export async function saveSettings(formData: FormData) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const updates = Array.from(formData.entries())
      .filter(([key]) => !key.startsWith('$ACTION_ID') && !key.startsWith('ACTION_ID'))
      .map(([key, value]) => ({
        key,
        value: value.toString()
      }));

    // Perform upserts in a transaction
    await prisma.$transaction(
      updates.map(({ key, value }) => 
        prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      )
    );

    // @ts-ignore - Next.js canary type expects 2 arguments for revalidateTag but at runtime works with 1
    revalidateTag('settings'); // IMPORTANT: Invalidates getCachedSettings cache
    revalidatePath('/', 'layout'); // Revalidate everything so new settings take effect
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    
    let errorMessage = error.message || 'Failed to save settings';
    
    // Check if the error is about a missing table (P2021)
    if (error.code === 'P2021' || errorMessage.includes('does not exist')) {
      errorMessage = 'The Settings table does not exist in the database. Please run "npx prisma db push" or deploy migrations to create it.';
    }
    
    return { success: false, error: errorMessage };
  }
}
