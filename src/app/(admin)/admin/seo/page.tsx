import { Metadata } from 'next';
import { SeoDashboard } from '@/components/admin/seo/SeoDashboard';
import { fetchSeoDashboardData } from '@/app/actions/admin/seo';

export const metadata: Metadata = {
  title: 'SEO Health Dashboard | REDBEARD Admin',
};

export default async function SeoHealthPage() {
  const seoData = await fetchSeoDashboardData();

  return (
    <SeoDashboard data={seoData} />
  );
}
