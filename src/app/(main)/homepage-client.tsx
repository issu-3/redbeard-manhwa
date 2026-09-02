'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getPersonalizedSections } from '@/app/actions/public/homepage';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { TrendingCarousel } from '@/components/home/TrendingCarousel';
import { RecentlyUpdatedCarousel } from '@/components/home/RecentlyUpdatedCarousel';
import { PopularCarousel } from '@/components/home/PopularCarousel';
import { NewReleasesCarousel } from '@/components/home/NewReleasesCarousel';

import type { HomepageSection } from '@prisma/client';
import type { SeriesCardData } from '@/types';

// Map homepage section types to their browse page URLs
const sectionTypeToHref: Record<string, string> = {
  TRENDING: '/browse/trending',
  RECENTLY_UPDATED: '/browse/latest',
  NEW_RELEASES: '/browse/new-releases',
  LATEST: '/browse/latest',
  FEATURED: '/browse/popular',
  RECOMMENDED: '/browse/popular',
  COMPLETED: '/browse/completed',
};

interface HomepageClientProps {
  sections: HomepageSection[];
  sectionData: Record<string, any[]>;
  isLoggedIn: boolean; // We keep the prop for signature compatibility, but determine actual status via useSession
}

export function HomepageClient({
  sections,
  sectionData,
}: HomepageClientProps) {
  const { data: _session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  
  const [personalizedData, setPersonalizedData] = useState<{ recommended: SeriesCardData[] } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      const recSection = sections.find((s: any) => s.type === 'RECOMMENDED');
      const limit = recSection?.limit || 10;
      getPersonalizedSections(limit).then(data => {
        if (data) setPersonalizedData(data);
      });
    }
  }, [isLoggedIn, sections]);

  return (
    <div className="space-y-8 md:space-y-10 pb-4">
      {sections.map(sec => {
        let data = sectionData[sec.type] || [];
        
        if (sec.type === 'POPULAR') {
          return (
            <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
              <PopularCarousel series={data} />
            </div>
          );
        }

        if (sec.type === 'RECOMMENDED' && isLoggedIn && !sec.isManual) {
          if (!personalizedData) {
            return (
              <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
                <div className="mb-4 flex flex-col gap-2">
                  <div className="h-8 w-48 rounded-lg bg-foreground/10 animate-pulse" />
                  <div className="h-4 w-32 rounded-lg bg-foreground/5 animate-pulse" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="aspect-[3/4] w-[160px] md:w-[200px] shrink-0 rounded-2xl bg-surface animate-pulse" />
                  ))}
                </div>
              </div>
            );
          }
          data = personalizedData.recommended || sectionData[sec.type] || [];
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

        if (sec.type === 'NEW_RELEASES') {
          return (
            <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
              <NewReleasesCarousel series={data} />
            </div>
          );
        }

        // Default layout for FEATURED, RECOMMENDED (if logged out or fallback), etc.
        return (
          <div key={sec.id} className="px-4 md:px-8 lg:px-16 xl:px-20">
            <Carousel 
              title={sec.title || sec.type.replace('_', ' ')} 
              subtitle={sec.subtitle || undefined} 
              href={sec.showViewAll ? (sectionTypeToHref[sec.type] || undefined) : undefined}
            >
              {data.map((series: any, i: number) => (
                <SeriesCard key={series.id} series={series} index={i} />
              ))}
            </Carousel>
          </div>
        );
      })}
    </div>
  );
}
