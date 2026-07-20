'use client';

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CarouselProps {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function Carousel({ title, subtitle, href, children, className = '' }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 400);
  };

  return (
    <section className={`relative ${className}`}>
      {/* Section header */}
      <div className="mb-5 flex items-end justify-between px-1">
        <div>
          <h2
            className="text-xl font-bold text-text-primary md:text-2xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="group flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-primary"
          >
            View All
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      {/* Carousel container */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Scroll arrows */}
        <AnimatePresence>
          {isHovered && canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={() => scroll('left')}
              className="absolute -left-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 p-2.5 text-text-primary shadow-xl backdrop-blur-md transition-colors hover:bg-card md:flex"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isHovered && canScrollRight && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => scroll('right')}
              className="absolute -right-2 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 p-2.5 text-text-primary shadow-xl backdrop-blur-md transition-colors hover:bg-card md:flex"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scroll area */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [&>div]:snap-start"
        >
          {children}
        </div>

        {/* Edge gradients */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-background to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-background to-transparent" />
        )}
      </div>
    </section>
  );
}
