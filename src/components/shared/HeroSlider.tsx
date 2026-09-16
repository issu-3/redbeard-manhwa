'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion, Variants } from 'framer-motion';
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
  const prefersReducedMotion = useReducedMotion();
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 100, mass: 0.5 };
  const parallaxX = useSpring(mouseX, springConfig);
  const parallaxY = useSpring(mouseY, springConfig);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion || typeof window === 'undefined' || window.innerWidth < 768) return;
    const { clientWidth, clientHeight } = e.currentTarget;
    const { clientX, clientY } = e;
    const x = (clientX / clientWidth - 0.5) * 16;
    const y = (clientY / clientHeight - 0.5) * 16;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    if (!prefersReducedMotion && typeof window !== 'undefined' && window.innerWidth >= 768) {
      mouseX.set(0);
      mouseY.set(0);
    }
    startAutoplay();
  };

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

  const variants: Variants = {
    enter: (d: number) => ({ x: d > 0 ? '3%' : '-3%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-3%' : '3%', opacity: 0 }),
  };

  const contentContainerVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.33, 1, 0.68, 1] as const } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.3 } }
  };

  return (
    <section
      className="relative w-full overflow-hidden aspect-[16/7.5] max-h-[260px] md:aspect-auto md:max-h-none md:h-[clamp(340px,45vh,500px)]"
      onMouseEnter={stopAutoplay}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
          transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] as const }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={handleDragEnd}
        >
          <motion.div 
            className="absolute inset-0 pointer-events-none origin-center"
            style={{ x: parallaxX, y: parallaxY }}
            animate={prefersReducedMotion ? {} : { scale: [1.02, 1.06, 1.02] }}
            transition={{ duration: 15, ease: "easeInOut", repeat: Infinity }}
          >
            <Image
              src={slide.bannerImage || slide.coverImage}
              alt={slide.title}
              fill
              className="object-cover"
              priority={current === 0}
              fetchPriority={current === 0 ? "high" : "auto"}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent sm:via-transparent" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full flex-col justify-end pointer-events-none">
        
        {/* Main Content Safe Area */}
        <div className="px-4 pt-6 md:px-12 md:pt-16 lg:px-20 pointer-events-auto">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id + '-content'}
                variants={contentContainerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <motion.div variants={itemVariants} className="mb-1 md:mb-3 flex items-center flex-wrap gap-1.5 md:gap-2">
                  <Badge variant={statusVariant[slide.status] || 'primary'} size="sm" className="font-bold uppercase tracking-wider">
                    {slide.status}
                  </Badge>
                </motion.div>

                <motion.h1 variants={itemVariants} className="mb-1.5 md:mb-4 text-xl font-black leading-tight text-text-primary md:text-5xl lg:text-6xl"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                  {slide.title}
                </motion.h1>

                <motion.p variants={itemVariants} className="mb-8 hidden md:block line-clamp-3 max-w-lg text-sm font-medium leading-relaxed text-text-secondary md:text-base md:leading-relaxed">
                  {slide.description}
                </motion.p>

                <motion.div variants={itemVariants} className="flex items-center gap-2 md:gap-3">
                  {slide.slug ? (
                    <Link
                      href={`/series/${slide.slug}`}
                      className="inline-flex h-8 md:h-10 items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-primary px-3 md:px-4 py-1 md:py-2 text-xs md:text-base font-bold text-white transition-all duration-200 hover:bg-primary-hover hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/40 active:scale-[0.97] shadow-md shadow-primary/25"
                    >
                      <Download className="h-4 w-4 md:h-5 md:w-5" />
                      Download
                    </Link>
                  ) : null}
                  <div className="flex h-8 md:h-10 items-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]">
                    <BookmarkButton seriesId={slide.id} initialBookmarked={false} />
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Indicator Safe Area */}
        <div className="flex w-full justify-center gap-2 py-4 md:py-6 pointer-events-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ease-in-out ${
                i === current ? 'w-6 md:w-8 bg-primary shadow-sm shadow-primary/50' : 'w-1.5 md:w-2 bg-foreground/30 hover:bg-foreground/50 hover:w-3 md:hover:w-4'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
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
    </section>
  );
}

