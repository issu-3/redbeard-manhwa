'use client';

import React from 'react';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { RecentlyUpdatedCarousel } from '@/components/home/RecentlyUpdatedCarousel';
import { PopularCarousel } from '@/components/home/PopularCarousel';
import { NewReleasesCarousel } from '@/components/home/NewReleasesCarousel';

import type { HomepageSection } from '@prisma/client';

const sectionTypeToHref: Record<string, string> = {
  RECENTLY_UPDATED: '/browse/latest',
  NEW_RELEASES: '/browse/new-releases',
  LATEST: '/browse/latest',
  COMPLETED: '/browse/completed',
  MANGA: '/search?type=MANGA',
  MANHWA: '/search?type=MANHWA',
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

        if (data.length === 0 && sec.type !== 'HERO_BANNER') return null;

        if (sec.type === 'HERO_BANNER') {
          if (data.length === 0) return null;
          return <HeroSlider key={sec.id} slides={data} />;
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

        // Default layout for MANGA, MANHWA, etc.
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
