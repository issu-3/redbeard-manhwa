'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Eye } from 'lucide-react';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { GenreCard } from '@/components/shared/GenreCard';
import type { SeriesCardData } from '@/types';

interface HomepageClientProps {
  banners: any[];
  sections: any[];
  sectionData: Record<string, SeriesCardData[]>;
  genres: { name: string; slug: string; icon: string; color: string; seriesCount: number }[];
  adSlot?: React.ReactNode;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function SectionWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={sectionVariants}
      className={`px-4 md:px-8 lg:px-16 xl:px-20 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function HomepageClient({
  banners,
  sections,
  sectionData,
  genres,
  adSlot,
}: HomepageClientProps) {

  // Create a mapping of section type to rendering logic
  const renderSection = (sec: any) => {
    const data = sectionData[sec.type] || [];
    if (data.length === 0) return null;

    switch (sec.type) {
      case 'HERO':
        if (banners.length === 0) return null;
        // Banners map to the Slider format natively in the DB but need to be matched
        return (
          <HeroSlider
            key="hero"
            slides={banners.map((b) => ({
              id: b.id,
              title: b.title || '',
              slug: b.buttonUrl || '#',
              coverImage: b.desktopImage,
              bannerImage: b.desktopImage,
              description: b.subtitle || '',
              genres: [],
              averageRating: 5,
              chapterCount: 0,
              totalViews: 0,
            }))}
          />
        );

      case 'TRENDING':
        return (
          <SectionWrapper key="trending">
            <Carousel title="Trending Today" subtitle="What everyone is reading right now" href="/browse/trending">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[180px]">
                  <div className="relative">
                    <div className="absolute -left-1 -top-1 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-xs text-white shadow-lg">
                      {i + 1}
                    </div>
                    <SeriesCard series={series} variant="compact" index={i} />
                  </div>
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );

      case 'POPULAR':
        return (
          <SectionWrapper key="popular">
            <Carousel title="Most Popular" subtitle="All-time fan favorites" href="/browse/popular">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );

      case 'LATEST':
        return (
          <SectionWrapper key="latest">
            <Carousel title="Recently Updated" subtitle="Fresh chapters just dropped" href="/browse/latest">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[180px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );
        
      case 'NEW_RELEASES':
        return (
          <SectionWrapper key="new-releases">
            <Carousel title="New Releases" subtitle="Hot off the press" href="/browse/new">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[180px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );

      case 'EDITORS_PICKS':
        return (
          <SectionWrapper key="editors-picks">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-surface to-card p-6 md:p-10">
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/5 blur-3xl" />
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary md:text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
                      Staff Picks
                    </h2>
                    <p className="text-sm text-text-muted">Handpicked by our editors</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {data.map((series, i) => (
                    <SeriesCard key={series.id} series={series} variant="compact" index={i} />
                  ))}
                </div>
              </div>
            </div>
          </SectionWrapper>
        );
        
      case 'FEATURED':
        return (
          <SectionWrapper key="featured">
            <Carousel title="Featured Series" subtitle="Don't miss these" href="/browse/featured">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );

      case 'COMPLETED':
        return (
          <SectionWrapper key="completed">
            <Carousel title="Completed Series" subtitle="Binge-worthy from start to finish" href="/browse/completed">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );
        
      case 'ONGOING':
        return (
          <SectionWrapper key="ongoing">
            <Carousel title="Currently Ongoing" subtitle="Catch up on the latest" href="/browse/ongoing">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );
        
      case 'TOP_RATED':
        return (
          <SectionWrapper key="top-rated">
            <Carousel title="Top Rated" subtitle="Highest rated by the community" href="/browse/top">
              {data.map((series, i) => (
                <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
                  <SeriesCard series={series} index={i} />
                </div>
              ))}
            </Carousel>
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-12 pb-16 md:space-y-16">
      {/* Dynamically render sections based on DB order */}
      {sections.map((sec, index) => (
        <React.Fragment key={sec.id || index}>
          {renderSection(sec)}
          {index === 1 && adSlot && (
            <SectionWrapper>
              <div className="flex justify-center w-full py-4">
                {adSlot}
              </div>
            </SectionWrapper>
          )}
        </React.Fragment>
      ))}

      {/* ── Browse by Genre (Always show near the bottom) ──────────────────────────────── */}
      <SectionWrapper>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary md:text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Browse by Genre
          </h2>
          <p className="mt-1 text-sm text-text-muted">Find your next obsession</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {genres.map((genre, i) => (
            <GenreCard key={genre.slug} genre={genre} index={i} />
          ))}
        </div>
      </SectionWrapper>

    </div>
  );
}
