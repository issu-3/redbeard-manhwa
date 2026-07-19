import { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/admin/settings';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = APP_URL || 'http://localhost:3000';
  const settings = await getCachedSettings();
  
  const robotsSetting = settings.seo_robots || 'index, follow';
  const isNoIndex = robotsSetting.includes('noindex');

  return {
    rules: {
      userAgent: '*',
      allow: isNoIndex ? undefined : '/',
      disallow: isNoIndex ? ['/'] : ['/admin/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
