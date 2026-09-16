'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { Badge } from '@/components/shared/Badge';

interface HeroSlide {
  id: string;
  title: string;
  slug: string | null;
  coverImage: string;
  bannerImage?: string;
  description: string;
  genres: { name: string; slug: string }[];
  status: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  ONGOING: 'success',
  COMPLETED: 'info',
  HIATUS: 'warning',
  CANCELLED: 'danger',
  UPCOMING: 'primary',
};

export function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
  }, [slides.length]);

  const stopAutoplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  const goTo = (index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
    startAutoplay();
  };

  const goNext = () => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
    startAutoplay();
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    startAutoplay();
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -10000) {
      goNext();
    } else if (swipe > 10000) {
      goPrev();
    }
  };

  if (!slides.length) return null;
  const slide = slides[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <section
      className="relative w-full overflow-hidden aspect-[16/7.5] max-h-[260px] md:aspect-auto md:max-h-none md:h-[clamp(340px,45vh,500px)]"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      role="region"
      aria-label="Featured series"
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={handleDragEnd}
        >
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={slide.bannerImage || slide.coverImage}
              alt={slide.title}
              fill
              className="object-cover"
              priority={current === 0}
              fetchPriority={current === 0 ? "high" : "auto"}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full items-end px-4 pb-4 pt-6 md:px-12 md:pb-16 md:pt-16 lg:px-20 pointer-events-none">
        <div className="max-w-2xl pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id + '-content'}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="mb-1 md:mb-3 flex items-center flex-wrap gap-1.5 md:gap-2">
                <Badge variant={statusVariant[slide.status] || 'primary'} size="sm" className="font-bold uppercase tracking-wider">
                  {slide.status}
                </Badge>
                {slide.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre.slug}
                    className="rounded-md bg-foreground/10 px-3 py-1 text-xs font-medium text-text-primary backdrop-blur-sm border border-border/50"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <h1 className="mb-1.5 md:mb-4 text-xl font-black leading-tight text-text-primary md:text-5xl lg:text-6xl"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                {slide.title}
              </h1>

              <p className="mb-8 hidden md:block line-clamp-3 max-w-lg text-sm font-medium leading-relaxed text-text-secondary md:text-base md:leading-relaxed">
                {slide.description}
              </p>

              <div className="flex items-center gap-2 md:gap-3">
                {slide.slug ? (
                  <Link
                    href={`/series/${slide.slug}`}
                    className="inline-flex h-8 md:h-10 items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-primary px-3 md:px-4 py-1 md:py-2 text-xs md:text-base font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25"
                  >
                    <Download className="h-4 w-4 md:h-5 md:w-5" />
                    Download
                  </Link>
                ) : null}
                <div className="h-8 md:h-[52px]">
                  <BookmarkButton seriesId={slide.id} initialBookmarked={false} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={goPrev}
        className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 p-3 text-white backdrop-blur-md transition-all hover:bg-black/60 md:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 p-3 text-white backdrop-blur-md transition-all hover:bg-black/60 md:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-2 md:bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-primary' : 'w-2 bg-foreground/30 hover:bg-foreground/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
