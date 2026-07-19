'use client';

import React from 'react';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { TrendingCarousel } from '@/components/home/TrendingCarousel';
import { RecentlyUpdatedCarousel, type RecentUpdate } from '@/components/home/RecentlyUpdatedCarousel';
import { ContinueReadingCarousel, type ContinueReadingItem } from '@/components/home/ContinueReadingCarousel';
import { Sparkles, Heart } from 'lucide-react';
import type { SeriesCardData } from '@/types';

interface HomepageClientProps {
  hero: any[];
  trending: SeriesCardData[];
  recentlyUpdated: RecentUpdate[];
  continueReading: ContinueReadingItem[];
  recommended: SeriesCardData[];
  isLoggedIn: boolean;
}

export function HomepageClient({
  hero,
  trending,
  recentlyUpdated,
  continueReading,
  recommended,
  isLoggedIn
}: HomepageClientProps) {

  return (
    <div className="space-y-12 pb-16 md:space-y-16">
      {/* 1. Hero Banner */}
      {hero.length > 0 && (
        <HeroSlider
          slides={hero.map((b) => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            coverImage: b.coverImage,
            bannerImage: b.bannerImage,
            description: b.synopsis || b.description || '',
            genres: b.genres || [],
            averageRating: b.averageRating || 0,
            chapterCount: b.chapterCount || 0,
            totalViews: b.totalViews || 0,
            status: b.status || 'ONGOING'
          }))}
        />
      )}

      {/* 2. Continue Reading (Logged in only) */}
      {isLoggedIn && continueReading.length > 0 && (
        <div className="px-4 md:px-8 lg:px-16 xl:px-20">
          <ContinueReadingCarousel items={continueReading} />
        </div>
      )}

      {/* 3. Trending */}
      {trending.length > 0 && (
        <div className="px-4 md:px-8 lg:px-16 xl:px-20">
          <TrendingCarousel series={trending} />
        </div>
      )}

      {/* 4. Recently Updated */}
      {recentlyUpdated.length > 0 && (
        <div className="px-4 md:px-8 lg:px-16 xl:px-20">
          <RecentlyUpdatedCarousel updates={recentlyUpdated} />
        </div>
      )}

      {/* 5. Recommended / Editor's Picks */}
      {recommended.length > 0 && (
        <div className="px-4 md:px-8 lg:px-16 xl:px-20">
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
                      {isLoggedIn ? 'Recommended For You' : "Editor's Picks"}
                    </h2>
                    <p className="text-sm font-medium text-text-muted mt-1">
                      {isLoggedIn ? 'Based on your reading history and bookmarks' : 'Handpicked by our staff'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {recommended.map((series, i) => (
                  <SeriesCard key={series.id} series={series} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
