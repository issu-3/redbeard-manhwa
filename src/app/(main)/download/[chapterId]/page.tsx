import { redirect } from 'next/navigation';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdRenderer } from '@/components/ads/AdRenderer';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowDownToLine } from 'lucide-react';
import { AdCountdown } from '@/components/ads/AdCountdown';

export default async function DownloadInterstitialPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const settings = await getCachedSettings();
  const placementSetting = settings['ads_placement_download'] || 'none';
  
  // If no download ad placement is configured, skip interstitial entirely
  if (placementSetting === 'none') {
    redirect(`/api/chapter/${chapterId}/download`);
  }

  // Fetch the chapter to display context to the user
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { series: true }
  });

  if (!chapter || chapter.sourceType !== 'DOWNLOAD' || !chapter.downloadUrl) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 p-4 pt-20">
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center">
        
        <div className="bg-surface border border-border/50 rounded-2xl p-8 md:p-12 text-center w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
          
          <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-2">
            Your Download is Ready
          </h1>
          <p className="text-text-secondary mb-8 font-medium">
            {chapter.series.title} — {chapter.title || `Chapter ${chapter.number}`}
          </p>

          {/* Ad Container */}
          <div className="w-full flex justify-center my-8 min-h-[90px] bg-background/50 rounded-lg p-2 border border-border/30">
             <AdRenderer placement="download" />
          </div>

          <div className="mt-8">
            <AdCountdown 
              redirectUrl={`/api/chapter/${chapterId}/download`}
              chapterId={chapterId}
              seriesId={chapter.series.id}
              seriesTitle={chapter.series.title}
              seriesSlug={chapter.series.slug}
              chapterNumber={chapter.number || chapter.title || '1'}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
