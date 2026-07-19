'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Sun,
  Contrast,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Monitor,
  Smartphone,
  Scroll,
  FileImage,
  ArrowDownToLine,
  ArrowRightToLine,
  ArrowLeftToLine,
  SkipForward,
  Play,
  Gauge,
  MessageSquare,
} from 'lucide-react';
import { useReaderStore, type ReaderMode, type FitMode, type ReadingDirection } from '@/store/reader-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { cn } from '@/lib/utils';
import type { ChapterData } from '@/types';

import { CommentSection } from '@/components/shared/CommentSection';
import type { CommentData } from '@/components/shared/CommentItem';

// ─── Types ─────────────────────────────────────────────────────

interface ChapterReaderProps {
  chapter: ChapterData;
  comments: CommentData[];
  currentUserId?: string;
}

// ─── Main Component ────────────────────────────────────────────

export function ChapterReader({ chapter, comments, currentUserId }: ChapterReaderProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reader store
  const {
    mode,
    direction,
    fitMode,
    currentPage,
    totalPages,
    isFullscreen,
    isUIHidden,
    brightness,
    contrast,
    sepia,
    autoScroll,
    autoScrollSpeed,
    autoNextChapter,
    zoom,
    setMode,
    setDirection,
    setFitMode,
    setCurrentPage,
    setTotalPages,
    toggleFullscreen,
    setBrightness,
    setContrast,
    setSepia,
    toggleAutoScroll,
    setAutoScrollSpeed,
    toggleAutoNextChapter,
    setZoom,
    resetFilters,
    nextPage,
    prevPage,
  } = useReaderStore();

  // Local state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [showUI, setShowUI] = useState(true);

  // ─── Initialize ────────────────────────────────────────────

  useEffect(() => {
    setTotalPages(chapter.images.length);
    setCurrentPage(1);
  }, [chapter.id, chapter.images.length, setTotalPages, setCurrentPage]);

  // ─── UI Auto-hide ──────────────────────────────────────────

  const resetUITimer = useCallback(() => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      if (!settingsOpen && !commentsOpen) setShowUI(false);
    }, 3000);
  }, [settingsOpen, commentsOpen]);

  useEffect(() => {
    setTimeout(() => resetUITimer(), 0);
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUITimer]);

  const handleMouseMove = useCallback(() => {
    resetUITimer();
  }, [resetUITimer]);

  // ─── Fullscreen ────────────────────────────────────────────

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    toggleFullscreen();
  }, [toggleFullscreen]);

  // ─── Auto-scroll ───────────────────────────────────────────

  useEffect(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (autoScroll && (mode === 'vertical' || mode === 'longStrip') && scrollRef.current) {
      const speed = autoScrollSpeed; // 1-10
      autoScrollIntervalRef.current = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += speed;

          // Check if reached bottom
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 10) {
            if (autoNextChapter && chapter.nextChapter) {
              router.push(
                `/series/${chapter.seriesSlug}/chapter/${chapter.nextChapter.number}`
              );
            }
          }
        }
      }, 16);
    }

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [autoScroll, autoScrollSpeed, mode, autoNextChapter, chapter.nextChapter, chapter.seriesSlug, router]);

  // ─── Scroll-based page tracking ───────────────────────────

  useEffect(() => {
    if (mode !== 'vertical' && mode !== 'longStrip') return;
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const images = el.querySelectorAll('[data-page]');
      let visiblePage = 1;

      images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const containerRect = el.getBoundingClientRect();
        if (rect.top < containerRect.top + containerRect.height / 2) {
          visiblePage = parseInt(img.getAttribute('data-page') || '1', 10);
        }
      });

      setCurrentPage(visiblePage);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [mode, setCurrentPage]);

  // ─── Navigation helpers ────────────────────────────────────

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, chapter.images.length));
      setCurrentPage(clamped);

      if (mode === 'vertical' || mode === 'longStrip') {
        const el = scrollRef.current?.querySelector(`[data-page="${clamped}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [chapter.images.length, mode, setCurrentPage]
  );

  const goNext = useCallback(() => {
    if (mode === 'singlePage' || mode === 'horizontal') {
      if (currentPage < chapter.images.length) {
        nextPage();
      } else if (autoNextChapter && chapter.nextChapter) {
        router.push(`/series/${chapter.seriesSlug}/chapter/${chapter.nextChapter.number}`);
      }
    }
  }, [mode, currentPage, chapter.images.length, chapter.nextChapter, chapter.seriesSlug, autoNextChapter, nextPage, router]);

  const goPrev = useCallback(() => {
    if (mode === 'singlePage' || mode === 'horizontal') {
      if (currentPage > 1) {
        prevPage();
      } else if (chapter.prevChapter) {
        router.push(`/series/${chapter.seriesSlug}/chapter/${chapter.prevChapter.number}`);
      }
    }
  }, [mode, currentPage, chapter.prevChapter, chapter.seriesSlug, prevPage, router]);

  // ─── Keyboard Shortcuts ────────────────────────────────────

  useKeyboardShortcuts([
    {
      key: 'ArrowRight',
      handler: () => (direction === 'rtl' ? goPrev() : goNext()),
      enabled: mode === 'singlePage' || mode === 'horizontal',
    },
    {
      key: 'ArrowLeft',
      handler: () => (direction === 'rtl' ? goNext() : goPrev()),
      enabled: mode === 'singlePage' || mode === 'horizontal',
    },
    { key: 'f', handler: handleFullscreen },
    { key: 'h', handler: () => setShowUI((p) => !p) },
    {
      key: 'Escape',
      handler: () => {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (commentsOpen) {
          setCommentsOpen(false);
        } else {
          router.push(`/series/${chapter.seriesSlug}`);
        }
      },
    },
  ]);

  // ─── Swipe Gestures ───────────────────────────────────────

  const { touchHandlers } = useSwipeGestures({
    onSwipeLeft: () => {
      if (mode === 'singlePage' || mode === 'horizontal') {
        if (direction === 'rtl') goPrev(); else goNext();
      }
    },
    onSwipeRight: () => {
      if (mode === 'singlePage' || mode === 'horizontal') {
        if (direction === 'rtl') goNext(); else goPrev();
      }
    },
  });

  // ─── Center-tap to toggle UI ──────────────────────────────

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const centerStart = width * 0.33;
      const centerEnd = width * 0.66;

      if (x >= centerStart && x <= centerEnd) {
        setShowUI((p) => !p);
      } else if (mode === 'singlePage' || mode === 'horizontal') {
        if (x < centerStart) {
          if (direction === 'rtl') goNext(); else goPrev();
        } else {
          if (direction === 'rtl') goPrev(); else goNext();
        }
      }
    },
    [mode, direction, goNext, goPrev]
  );

  // ─── Image load tracking ──────────────────────────────────

  const handleImageLoad = useCallback((pageNumber: number) => {
    setLoadedImages((prev) => new Set(prev).add(pageNumber));
  }, []);

  // ─── CSS filter style ─────────────────────────────────────

  const filterStyle = useMemo(
    () => ({
      filter: `brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)`,
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'center top' as const,
    }),
    [brightness, contrast, sepia, zoom]
  );

  // ─── Progress percentage ──────────────────────────────────

  const progress = totalPages > 0 ? ((currentPage) / totalPages) * 100 : 0;

  // Determine UI visibility
  const uiVisible = showUI && !isUIHidden;

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen bg-black overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      {...touchHandlers}
    >
      {/* ── Top Bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {uiVisible && (
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute top-0 left-0 right-0 z-50 glass border-b border-white/5"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href={`/series/${chapter.seriesSlug}`}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground/5 text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {chapter.seriesTitle}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    Ch. {chapter.number}
                    {chapter.title && ` — ${chapter.title}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFullscreen}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground/5 text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all"
                  title="Toggle Fullscreen (F)"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setCommentsOpen(true);
                    resetUITimer();
                  }}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground/5 text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all relative"
                  title="Comments"
                >
                  <MessageSquare className="h-4 w-4" />
                  {comments.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-white">
                      {comments.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    resetUITimer();
                  }}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground/5 text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── Reader Content ─────────────────────────────────── */}
      <div
        className="h-full w-full"
        onClick={handleContainerClick}
      >
        {/* Vertical / Long Strip Mode */}
        {(mode === 'vertical' || mode === 'longStrip') && (
          <div
            ref={scrollRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden thin-scrollbar"
          >
            <div
              className={cn(
                'mx-auto',
                fitMode === 'width' && 'w-full max-w-[900px]',
                fitMode === 'height' && 'w-auto',
                fitMode === 'original' && 'w-auto'
              )}
              style={filterStyle}
            >
              {chapter.images.map((img) => (
                <div
                  key={img.id}
                  data-page={img.pageNumber}
                  className="relative w-full"
                >
                  {/* Loading skeleton */}
                  {!loadedImages.has(img.pageNumber) && (
                    <div
                      className="w-full skeleton"
                      style={{
                        aspectRatio:
                          img.width && img.height
                            ? `${img.width}/${img.height}`
                            : '2/3',
                      }}
                    >
                      <div className="flex items-center justify-center h-full text-white/20">
                        <FileImage className="h-12 w-12" />
                      </div>
                    </div>
                  )}
                  <Image
                    src={img.imageUrl}
                    alt={`Page ${img.pageNumber}`}
                    width={img.width || 800}
                    height={img.height || 1200}
                    className={cn(
                      'w-full h-auto block',
                      !loadedImages.has(img.pageNumber) && 'opacity-0 absolute'
                    )}
                    priority={img.pageNumber <= 3}
                    onLoad={() => handleImageLoad(img.pageNumber)}
                    sizes="(max-width: 900px) 100vw, 900px"
                  />
                </div>
              ))}

              {/* End of chapter */}
              <div className="py-16 px-4 text-center">
                <p className="text-white/30 text-sm mb-6">
                  End of Chapter {chapter.number}
                </p>
                <div className="flex items-center justify-center gap-4">
                  {chapter.prevChapter && (
                    <Link
                      href={`/series/${chapter.seriesSlug}/chapter/${chapter.prevChapter.number}`}
                      className="flex items-center gap-2 rounded-xl bg-foreground/5 px-6 py-3 text-sm font-medium text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Link>
                  )}
                  {chapter.nextChapter && (
                    <Link
                      href={`/series/${chapter.seriesSlug}/chapter/${chapter.nextChapter.number}`}
                      className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Next Chapter
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Page / Horizontal Mode */}
        {(mode === 'singlePage' || mode === 'horizontal') && (
          <div className="h-full w-full flex items-center justify-center">
            <div
              className={cn(
                'relative',
                fitMode === 'width' && 'w-full max-w-[900px] h-auto',
                fitMode === 'height' && 'h-full w-auto',
                fitMode === 'original' && 'w-auto h-auto'
              )}
              style={filterStyle}
            >
              {chapter.images[currentPage - 1] && (
                <>
                  {!loadedImages.has(currentPage) && (
                    <div className="w-[800px] max-w-full aspect-[2/3] skeleton flex items-center justify-center">
                      <FileImage className="h-12 w-12 text-white/20" />
                    </div>
                  )}
                  <Image
                    src={chapter.images[currentPage - 1].imageUrl}
                    alt={`Page ${currentPage}`}
                    width={chapter.images[currentPage - 1].width || 800}
                    height={chapter.images[currentPage - 1].height || 1200}
                    className={cn(
                      'max-h-screen object-contain mx-auto',
                      fitMode === 'width' && 'w-full h-auto',
                      fitMode === 'height' && 'h-full w-auto',
                      !loadedImages.has(currentPage) && 'opacity-0 absolute'
                    )}
                    priority
                    onLoad={() => handleImageLoad(currentPage)}
                    sizes="900px"
                  />
                </>
              )}
            </div>

            {/* Side navigation arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (direction === 'rtl') goNext(); else goPrev();
              }}
              className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-start pl-3 text-white/0 hover:text-white/60 transition-all group"
              disabled={direction === 'rtl' ? currentPage >= totalPages : currentPage <= 1}
            >
              <ChevronLeft className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (direction === 'rtl') goPrev(); else goNext();
              }}
              className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-end pr-3 text-white/0 hover:text-white/60 transition-all group"
              disabled={direction === 'rtl' ? currentPage <= 1 : currentPage >= totalPages}
            >
              <ChevronRight className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {uiVisible && (
          <motion.footer
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute bottom-0 left-0 right-0 z-50 glass border-t border-white/5"
          >
            {/* Progress bar */}
            <div
              className="relative h-1 w-full bg-foreground/5 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const page = Math.max(1, Math.ceil(pct * totalPages));
                goToPage(page);
              }}
            >
              <div
                className="h-full bg-primary transition-all duration-200 group-hover:h-1.5"
                style={{ width: `${progress}%` }}
              />
              {/* Drag handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-lg shadow-primary/30 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 7px)` }}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              {/* Prev chapter */}
              <div className="flex items-center gap-2">
                {chapter.prevChapter ? (
                  <Link
                    href={`/series/${chapter.seriesSlug}/chapter/${chapter.prevChapter.number}`}
                    className="flex items-center gap-1.5 rounded-lg bg-foreground/5 px-3 py-2 text-xs font-medium text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ch. {chapter.prevChapter.number}</span>
                    <span className="sm:hidden">Prev</span>
                  </Link>
                ) : (
                  <div className="w-16" />
                )}
              </div>

              {/* Page indicator */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/80">
                  {currentPage}
                  <span className="text-white/30 mx-1">/</span>
                  {totalPages}
                </span>
              </div>

              {/* Next chapter */}
              <div className="flex items-center gap-2">
                {chapter.nextChapter ? (
                  <Link
                    href={`/series/${chapter.seriesSlug}/chapter/${chapter.nextChapter.number}`}
                    className="flex items-center gap-1.5 rounded-lg bg-foreground/5 px-3 py-2 text-xs font-medium text-white/70 hover:bg-foreground/10 hover:text-text-primary transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="hidden sm:inline">Ch. {chapter.nextChapter.number}</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <div className="w-16" />
                )}
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* ── Settings Panel ─────────────────────────────────── */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/40"
              onClick={() => setSettingsOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 z-[70] w-full max-w-[360px] bg-surface border-l border-border overflow-y-auto thin-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface border-b border-border">
                <h2 className="text-lg font-bold text-text-primary">
                  Reader Settings
                </h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-card text-text-muted hover:text-text-primary hover:bg-card-hover transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Reader Mode */}
                <SettingGroup label="Reader Mode" icon={<Monitor className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: 'vertical', label: 'Vertical', icon: <ArrowDownToLine className="h-4 w-4" /> },
                        { value: 'singlePage', label: 'Single Page', icon: <FileImage className="h-4 w-4" /> },
                        { value: 'longStrip', label: 'Long Strip', icon: <Scroll className="h-4 w-4" /> },
                        { value: 'horizontal', label: 'Horizontal', icon: <ArrowRightToLine className="h-4 w-4" /> },
                      ] as { value: ReaderMode; label: string; icon: React.ReactNode }[]
                    ).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMode(option.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all border',
                          mode === option.value
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-card border-border text-text-secondary hover:border-primary/20 hover:bg-card-hover'
                        )}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </SettingGroup>

                {/* Fit Mode */}
                <SettingGroup label="Fit Mode" icon={<Maximize className="h-4 w-4" />}>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'width', label: 'Width' },
                        { value: 'height', label: 'Height' },
                        { value: 'original', label: 'Original' },
                      ] as { value: FitMode; label: string }[]
                    ).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFitMode(option.value)}
                        className={cn(
                          'rounded-xl px-3 py-2.5 text-xs font-medium transition-all border',
                          fitMode === option.value
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-card border-border text-text-secondary hover:border-primary/20 hover:bg-card-hover'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </SettingGroup>

                {/* Reading Direction */}
                <SettingGroup label="Reading Direction" icon={<ArrowRightToLine className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: 'ltr', label: 'Left to Right', icon: <ArrowRightToLine className="h-4 w-4" /> },
                        { value: 'rtl', label: 'Right to Left', icon: <ArrowLeftToLine className="h-4 w-4" /> },
                      ] as { value: ReadingDirection; label: string; icon: React.ReactNode }[]
                    ).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDirection(option.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all border',
                          direction === option.value
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-card border-border text-text-secondary hover:border-primary/20 hover:bg-card-hover'
                        )}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </SettingGroup>

                {/* Image Filters */}
                <SettingGroup label="Image Filters" icon={<Sun className="h-4 w-4" />}>
                  <SliderControl
                    label="Brightness"
                    icon={<Sun className="h-3.5 w-3.5" />}
                    value={brightness}
                    onChange={setBrightness}
                    min={20}
                    max={200}
                    unit="%"
                  />
                  <SliderControl
                    label="Contrast"
                    icon={<Contrast className="h-3.5 w-3.5" />}
                    value={contrast}
                    onChange={setContrast}
                    min={20}
                    max={200}
                    unit="%"
                  />
                  <SliderControl
                    label="Sepia"
                    icon={<Smartphone className="h-3.5 w-3.5" />}
                    value={sepia}
                    onChange={setSepia}
                    min={0}
                    max={100}
                    unit="%"
                  />
                </SettingGroup>

                {/* Zoom */}
                <SettingGroup label="Zoom" icon={<ZoomIn className="h-4 w-4" />}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setZoom(Math.max(50, zoom - 10))}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border text-text-secondary hover:bg-card-hover transition-all"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-sm font-semibold text-text-primary">
                        {zoom}%
                      </span>
                    </div>
                    <button
                      onClick={() => setZoom(Math.min(200, zoom + 10))}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border text-text-secondary hover:bg-card-hover transition-all"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                </SettingGroup>

                {/* Auto-scroll */}
                <SettingGroup label="Auto-scroll" icon={<Play className="h-4 w-4" />}>
                  <ToggleSwitch
                    label="Enable Auto-scroll"
                    enabled={autoScroll}
                    onToggle={toggleAutoScroll}
                  />
                  {autoScroll && (
                    <SliderControl
                      label="Speed"
                      icon={<Gauge className="h-3.5 w-3.5" />}
                      value={autoScrollSpeed}
                      onChange={setAutoScrollSpeed}
                      min={1}
                      max={10}
                      unit="x"
                    />
                  )}
                </SettingGroup>

                {/* Auto Next Chapter */}
                <SettingGroup label="Navigation" icon={<SkipForward className="h-4 w-4" />}>
                  <ToggleSwitch
                    label="Auto Next Chapter"
                    enabled={autoNextChapter}
                    onToggle={toggleAutoNextChapter}
                  />
                </SettingGroup>

                {/* Reset */}
                <button
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-text-secondary hover:bg-card-hover hover:text-text-primary transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset All Filters
                </button>

                {/* Keyboard shortcuts hint */}
                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Keyboard Shortcuts
                  </p>
                  <div className="space-y-2 text-xs text-text-secondary">
                    <ShortcutRow keys={['←', '→']} action="Prev / Next page" />
                    <ShortcutRow keys={['F']} action="Toggle fullscreen" />
                    <ShortcutRow keys={['H']} action="Toggle UI" />
                    <ShortcutRow keys={['Esc']} action="Exit reader" />
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Comments Panel ─────────────────────────────────── */}
      <AnimatePresence>
        {commentsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/40"
              onClick={() => setCommentsOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-surface border-l border-border overflow-y-auto thin-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface border-b border-border">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </h2>
                <button
                  onClick={() => setCommentsOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-card text-text-muted hover:text-text-primary hover:bg-card-hover transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <CommentSection 
                  chapterId={chapter.id} 
                  comments={comments} 
                  currentUserId={currentUserId} 
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SettingGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-muted">{icon}</span>
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SliderControl({
  label,
  icon,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          {icon}
          {label}
        </span>
        <span className="text-xs font-medium text-text-primary">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-card appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30"
      />
    </div>
  );
}

function ToggleSwitch({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <button
        onClick={onToggle}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          enabled ? 'bg-primary' : 'bg-card border border-border'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200',
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

function ShortcutRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-surface border border-border text-[10px] font-mono text-text-muted">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="mx-0.5 text-text-muted">/</span>}
          </span>
        ))}
      </div>
      <span>{action}</span>
    </div>
  );
}
