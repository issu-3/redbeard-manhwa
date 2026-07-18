import { Metadata } from 'next';
import { getBanners, getSections, getHomepageSettings } from '@/app/actions/admin/homepage';
import { HomepageManager } from '@/components/admin/homepage/HomepageManager';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Homepage Management - Admin',
};

export default async function AdminHomepagePage() {
  const [banners, sections, featuredSeriesCount, settings] = await Promise.all([
    getBanners(),
    getSections(),
    prisma.series.count({ where: { isFeatured: true } }),
    getHomepageSettings()
  ]);

  // Fetch manual or automated series for sections
  const sectionSeriesData: Record<string, any[]> = {};
  
  // We can't import getAutomatedSeries here directly if it's a server action, 
  // but it's safe since it's just a server-side async function.
  const { getAutomatedSeries } = await import('@/app/actions/admin/homepage');

  for (const sec of sections) {
    if (sec.isManual && sec.manualSeriesId.length > 0) {
      const seriesList = await prisma.series.findMany({
        where: { id: { in: sec.manualSeriesId } },
        select: { id: true, title: true, coverImage: true, type: true, status: true }
      });
      // Sort back into array order
      sectionSeriesData[sec.type] = sec.manualSeriesId.map(id => seriesList.find(s => s.id === id)).filter(Boolean);
    } else if (!sec.isManual) {
      sectionSeriesData[sec.type] = await getAutomatedSeries(sec.type, sec.limit);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          Homepage Management
        </h1>
        <p className="mt-1 text-text-muted">
          Configure the public homepage, banners, section ordering, and manual curation.
        </p>
      </div>

      <HomepageManager 
        initialBanners={banners}
        initialSections={sections}
        initialManualData={sectionSeriesData}
        featuredCount={featuredSeriesCount}
        initialSettings={settings}
      />
    </div>
  );
}
