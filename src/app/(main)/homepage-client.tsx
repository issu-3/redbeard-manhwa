'use client';

import { motion } from 'framer-motion';
import { Flame, BookCheck, Sparkles, Star, Eye } from 'lucide-react';
import { HeroSlider } from '@/components/shared/HeroSlider';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { GenreCard } from '@/components/shared/GenreCard';
import type { SeriesCardData } from '@/types';

interface HomepageClientProps {
  featured: (SeriesCardData & { bannerImage?: string; description?: string })[];
  trending: SeriesCardData[];
  popular: SeriesCardData[];
  recentlyUpdated: SeriesCardData[];
  completed: SeriesCardData[];
  staffPicks: SeriesCardData[];
  genres: { name: string; slug: string; icon: string; color: string; seriesCount: number }[];
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
  featured,
  trending,
  popular,
  recentlyUpdated,
  completed,
  staffPicks,
  genres,
}: HomepageClientProps) {
  return (
    <div className="space-y-12 pb-16 md:space-y-16">
      {/* ── Hero Slider ──────────────────────────────────── */}
      <HeroSlider
        slides={featured.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          coverImage: s.coverImage,
          bannerImage: s.bannerImage,
          description: s.description || '',
          genres: s.genres,
          averageRating: s.averageRating,
          chapterCount: s.chapterCount,
          totalViews: s.totalViews,
        }))}
      />

      {/* ── Trending Today ───────────────────────────────── */}
      <SectionWrapper>
        <Carousel
          title="Trending Today"
          subtitle="What everyone is reading right now"
          href="/browse/trending"
        >
          {trending.map((series, i) => (
            <div key={series.id} className="w-[160px] shrink-0 md:w-[180px]">
              <div className="relative">
                {/* Rank badge */}
                <div className="absolute -left-1 -top-1 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-xs text-white shadow-lg">
                  {i + 1}
                </div>
                <SeriesCard series={series} variant="compact" index={i} />
              </div>
            </div>
          ))}
        </Carousel>
      </SectionWrapper>

      {/* ── Most Popular ─────────────────────────────────── */}
      <SectionWrapper>
        <Carousel
          title="Most Popular"
          subtitle="All-time fan favorites"
          href="/browse/popular"
        >
          {popular.map((series, i) => (
            <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
              <SeriesCard series={series} index={i} />
            </div>
          ))}
        </Carousel>
      </SectionWrapper>

      {/* ── Recently Updated ─────────────────────────────── */}
      <SectionWrapper>
        <Carousel
          title="Recently Updated"
          subtitle="Fresh chapters just dropped"
          href="/browse/latest"
        >
          {recentlyUpdated.map((series, i) => (
            <div key={series.id} className="w-[160px] shrink-0 md:w-[180px]">
              <SeriesCard series={series} index={i} />
            </div>
          ))}
        </Carousel>
      </SectionWrapper>

      {/* ── Staff Picks ──────────────────────────────────── */}
      <SectionWrapper>
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
              {staffPicks.map((series, i) => (
                <SeriesCard key={series.id} series={series} variant="compact" index={i} />
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Browse by Genre ──────────────────────────────── */}
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

      {/* ── Completed Series ─────────────────────────────── */}
      <SectionWrapper>
        <Carousel
          title="Completed Series"
          subtitle="Binge-worthy from start to finish"
          href="/browse/completed"
        >
          {completed.map((series, i) => (
            <div key={series.id} className="w-[160px] shrink-0 md:w-[190px]">
              <SeriesCard series={series} index={i} />
            </div>
          ))}
        </Carousel>
      </SectionWrapper>

      {/* ── Stats Banner ─────────────────────────────────── */}
      <SectionWrapper>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Flame, label: 'Active Series', value: '2,400+', color: '#E53935' },
            { icon: BookCheck, label: 'Total Chapters', value: '156,000+', color: '#4CAF50' },
            { icon: Eye, label: 'Monthly Readers', value: '12M+', color: '#2196F3' },
            { icon: Star, label: 'Average Rating', value: '4.6★', color: '#FFC107' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-center"
            >
              <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 0%, ${stat.color}, transparent 70%)` }} />
              <stat.icon className="mx-auto mb-2 h-7 w-7" style={{ color: stat.color }} />
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-xs text-text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );
}
