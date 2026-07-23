'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getPersonalizedSections } from '@/app/actions/public/homepage';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { TrendingCarousel } from '@/components/home/TrendingCarousel';
import { RecentlyUpdatedCarousel } from '@/components/home/RecentlyUpdatedCarousel';
import { ContinueReadingCarousel } from '@/components/home/ContinueReadingCarousel';
import { Sparkles, Heart } from 'lucide-react';

interface HomepageClientProps {
  sections: any[];
  sectionData: Record<string, any[]>;
  isLoggedIn: boolean; // We keep the prop for signature compatibility, but determine actual status via useSession
}

export function HomepageClient({
  sections,
  sectionData,
}: HomepageClientProps) {
  const { data: _session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  
  const [personalizedData, setPersonalizedData] = useState<{ continueReading: any[], recommended: any[] } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const crSection = sections.find(s => s.type === 'CONTINUE_READING');
      const recSection = sections.find(s => s.type === 'RECOMMENDED');
      
      const limit = Math.max(crSection?.limit || 10, recSection?.limit || 10);
      getPersonalizedSections(limit).then(data => {
        if (data) setPersonalizedData(data);
      });
    }
  }, [isLoggedIn, sections]);

  return (
    <div className="space-y-12 pb-16 md:space-y-16">
      {sections.map(sec => {
        let data = sectionData[sec.type] || [];
        
        if (sec.type === 'CONTINUE_READING') {
          if (!isLoggedIn) return null;
          data = personalizedData?.continueReading || [];
          if (data.length === 0) return null;
          return (
            <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
              <ContinueReadingCarousel items={data} />
            </div>
          );
        }

        if (sec.type === 'RECOMMENDED' && isLoggedIn && !sec.isManual) {
          data = personalizedData?.recommended || sectionData[sec.type] || [];
        }

        if (data.length === 0 && sec.type !== 'HERO_BANNER') return null;

        if (sec.type === 'HERO_BANNER') {
          if (data.length === 0) return null;
          return <HeroSlider key={sec.id} slides={data} />;
        }

        if (sec.type === 'TRENDING') {
          return (
            <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
              <TrendingCarousel series={data} />
            </div>
          );
        }

        if (sec.type === 'RECENTLY_UPDATED') {
          return (
            <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
              <RecentlyUpdatedCarousel updates={data} />
            </div>
          );
        }

        // Default layout for RECOMMENDED, FEATURED, etc.
        const isRecommended = sec.type === 'RECOMMENDED';
        return (
          <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
            {isRecommended ? (
              <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-surface to-card p-6 md:p-10 shadow-lg">
                <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
                <div className="relative">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
                        {isLoggedIn ? (
                          <Heart className="h-6 w-6 text-primary" />
                        ) : (
                          <Sparkles className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-text-primary md:text-3xl tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                          {sec.title || (isLoggedIn ? 'Recommended For You' : "Editor's Picks")}
                        </h2>
                        <p className="text-sm font-medium text-text-muted mt-1">
                          {sec.subtitle || (isLoggedIn ? 'Based on your reading history and bookmarks' : 'Handpicked by our staff')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {data.map((series: any, i: number) => (
                      <SeriesCard key={series.id} series={series} index={i} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Carousel 
                title={sec.title || sec.type.replace('_', ' ')} 
                subtitle={sec.subtitle} 
                href={sec.showViewAll ? '#' : undefined}
              >
                {data.map((series: any, i: number) => (
                  <SeriesCard key={series.id} series={series} index={i} />
                ))}
              </Carousel>
            )}
          </div>
        );
      })}
    </div>
  );
}
