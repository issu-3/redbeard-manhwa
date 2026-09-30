'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  ArrowLeft, Settings, ChevronLeft, ChevronRight, Share2, MoreVertical,
  Download, AlertTriangle, Monitor, Smartphone, Scroll, FileImage,
  ArrowRightToLine, ArrowLeftToLine, ArrowDownToLine, Maximize,
  Sun, Contrast, X, Play, SkipForward, RotateCcw, Columns, MessageSquare,
  Bookmark, Layout, Palette, Check
} from 'lucide-react';
import { useReaderStore, type ReaderMode, type FitMode, type ReadingDirection, type BackgroundColor } from '@/store/reader-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import type { ChapterData } from '@/types';
import { Capacitor } from '@capacitor/core';
import { useDownloadStore } from '@/store/download-store';
import { useAppLibraryStore } from '@/store/app-library-store';
import { saveUserPreferences } from '@/app/actions/preferences';
import { CommentSection } from '@/components/shared/CommentSection';
import { SubscribeCard } from '@/components/shared/SubscribeCard';

// Helper to safely get the slug
function getSafeSlug(c?: { slug?: string | null; number?: number | null } | null) {
  if (!c) return null;
  if (typeof c.slug === 'string' && c.slug.trim()) return c.slug;
  if (c.number != null) return String(c.number);
  return null;
}

export function ChapterReader({ chapter, comments, currentUserId, userPreferences, defaultReadingMode, youtubeUrl, renderPage, initialPage = 1 }: any) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Bookmark state
  const isSaved = useAppLibraryStore((state) => state.isSaved(chapter.seriesId));
  const addToLibrary = useAppLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useAppLibraryStore((state) => state.removeFromLibrary);

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      const savedSeriesEntry = useAppLibraryStore.getState().savedSeries[chapter.seriesId] || Object.values(useAppLibraryStore.getState().savedSeries).find((s: any) => s.slug === chapter.seriesSlug);
      if (savedSeriesEntry) {
        await removeFromLibrary(savedSeriesEntry.seriesId);
      }
    } else {
      await addToLibrary({
        seriesId: chapter.seriesId,
        title: chapter.seriesTitle,
        slug: chapter.seriesSlug,
        coverImage: null,
      });
    }
  };
  const isInitializedRef = useRef(false);

  // Zustand Store
  const store = useReaderStore();
  
  // UI State
  const [showUI, setShowUI] = useState(!store.isUIHidden);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'display' | 'reading' | 'navigation' | 'advanced'>('display');
  const [showSeekbar, setShowSeekbar] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Auto-hide UI
  useEffect(() => {
    if (showUI && store.autoHideControls) {
      const timer = setTimeout(() => {
        if (!settingsOpen && !commentsOpen) {
          setShowUI(false);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showUI, settingsOpen, commentsOpen, store.autoHideControls]);
  
  // Slugs
  const nextSlug = getSafeSlug(chapter.nextChapter);
  const prevSlug = getSafeSlug(chapter.prevChapter);

  // Initialize
  useEffect(() => {
    store.setTotalPages(chapter.images.length);
    store.setCurrentPage(initialPage);

    if (!isInitializedRef.current) {
      if (userPreferences && Object.keys(userPreferences).length > 0) {
        if (userPreferences.mode) store.setMode(userPreferences.mode);
        if (userPreferences.direction) store.setDirection(userPreferences.direction);
        if (userPreferences.fitMode) store.setFitMode(userPreferences.fitMode);
        if (userPreferences.backgroundColor) store.setBackgroundColor(userPreferences.backgroundColor);
        if (userPreferences.brightness !== undefined) store.setBrightness(userPreferences.brightness);
        if (userPreferences.contrast !== undefined) store.setContrast(userPreferences.contrast);
        if (userPreferences.sepia !== undefined) store.setSepia(userPreferences.sepia);
        if (userPreferences.grayscale !== undefined && userPreferences.grayscale !== store.grayscale) store.toggleGrayscale();
        if (userPreferences.autoNextChapter !== undefined && userPreferences.autoNextChapter !== store.autoNextChapter) store.toggleAutoNextChapter();
      } else if (defaultReadingMode && !localStorage.getItem('redbeard-reader-preferences')) {
         store.setMode(defaultReadingMode as ReaderMode);
      }
      
      // Tracking
      fetch('/api/tracking/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapter.id, seriesId: chapter.seriesId, userId: currentUserId })
      }).catch(err => console.error('Failed to track view:', err));

      isInitializedRef.current = true;
    }
    setMounted(true);
  }, []);

  // Container Resize Observer for accurate virtualization
  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [store.mode]);

  // Sync back to server
  useEffect(() => {
    if (!isInitializedRef.current || !currentUserId) return;
    const timeout = setTimeout(() => {
      saveUserPreferences({
        mode: store.mode,
        direction: store.direction,
        fitMode: store.fitMode,
        backgroundColor: store.backgroundColor,
        brightness: store.brightness,
        contrast: store.contrast,
        sepia: store.sepia,
        grayscale: store.grayscale,
        autoNextChapter: store.autoNextChapter,
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [store.mode, store.direction, store.fitMode, store.backgroundColor, store.brightness, store.contrast, store.sepia, store.grayscale, store.autoNextChapter, currentUserId]);

  // Virtualizer for Webtoon mode
  const rowVirtualizer = useVirtualizer({
    count: chapter.images.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => {
      const img = chapter.images[i];
      if (!img.width || !img.height || !containerWidth) return 600;
      if (store.fitMode === 'original') return img.height;
      
      const renderWidth = store.fitMode === 'width' 
        ? containerWidth 
        : Math.min(containerWidth, 896); // 56rem = 896px max-width in the css
        
      return (renderWidth * img.height) / img.width;
    },
    overscan: 3,
  });

  // Track virtual items to update currentPage
  useEffect(() => {
    if (store.mode !== 'longStrip') return;
    const items = rowVirtualizer.getVirtualItems();
    if (items.length > 0) {
      // Find the item that is most prominent in the viewport
      const topItem = items[0];
      store.setCurrentPage(topItem.index + 1);
    }
  }, [rowVirtualizer.getVirtualItems(), store.mode]);

  // Navigation
  const goToPage = useCallback((page: number) => {
    const maxPage = store.mode !== 'longStrip' ? chapter.images.length + 1 : chapter.images.length;
    const p = Math.max(1, Math.min(page, maxPage));
    store.setCurrentPage(p);
    if (store.mode === 'longStrip' && p <= chapter.images.length) {
      rowVirtualizer.scrollToIndex(p - 1, { align: 'start' });
    }
  }, [chapter.images.length, store.mode, rowVirtualizer]);

  const goNext = useCallback(() => {
    const jump = store.mode === 'doublePage' && store.currentPage < chapter.images.length ? 2 : 1;
    const maxPage = store.mode !== 'longStrip' ? chapter.images.length + 1 : chapter.images.length;
    
    if (store.currentPage + jump <= maxPage) {
      goToPage(store.currentPage + jump);
    } else if (store.autoNextChapter && nextSlug) {
      router.push(`/series/${chapter.seriesSlug}/chapter/${nextSlug}`);
    }
  }, [store.currentPage, chapter.images.length, store.autoNextChapter, nextSlug, chapter.seriesSlug, router, goToPage, store.mode]);

  const goPrev = useCallback(() => {
    const jump = store.mode === 'doublePage' && store.currentPage <= chapter.images.length ? 2 : 1;
    if (store.currentPage > jump) {
      goToPage(store.currentPage - jump);
    } else if (prevSlug) {
      router.push(`/series/${chapter.seriesSlug}/chapter/${prevSlug}`);
    } else {
      goToPage(1);
    }
  }, [store.currentPage, prevSlug, chapter.seriesSlug, router, goToPage, store.mode]);

  // Keyboard Shortcuts
  useKeyboardShortcuts([
    {
      key: 'ArrowRight',
      handler: () => (store.direction === 'rtl' ? goPrev() : goNext()),
      enabled: store.mode !== 'longStrip' && store.mode !== 'vertical',
    },
    {
      key: 'ArrowLeft',
      handler: () => (store.direction === 'rtl' ? goNext() : goPrev()),
      enabled: store.mode !== 'longStrip' && store.mode !== 'vertical',
    },
    {
      key: 'VolumeUp',
      handler: () => store.volumeNavigation && goPrev(),
      enabled: true,
    },
    {
      key: 'VolumeDown',
      handler: () => store.volumeNavigation && goNext(),
      enabled: true,
    },
    { key: 'f', handler: () => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen() },
    { key: ' ', handler: goNext },
  ]);

  // Tap Zones
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // If settings are open, don't do anything here, settings backdrop handles it
    if (settingsOpen) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const isCenter = (x > w * 0.33 && x < w * 0.66) && (y > h * 0.33 && y < h * 0.66);
    const isLeft = x <= w * 0.33;
    const isRight = x >= w * 0.66;
    const isTop = y <= h * 0.33;
    const isBottom = y >= h * 0.66;

    if (isCenter) {
      setShowUI(prev => !prev);
      return;
    }

    if (store.mode === 'singlePage' || store.mode === 'doublePage') {
      if (store.direction === 'rtl') {
        if (isLeft) goNext();
        else if (isRight) goPrev();
      } else {
        if (isLeft) goPrev();
        else if (isRight) goNext();
      }
    } else if (store.mode === 'vertical') {
      if (isTop) goPrev();
      else if (isBottom) goNext();
    }
  }, [settingsOpen, store.mode, store.direction, goNext, goPrev]);

  // CSS Filter
  const contentFilterStyle = useMemo(() => ({
    filter: `contrast(${store.contrast}%) sepia(${store.sepia}%) ${store.grayscale ? 'grayscale(100%)' : ''} ${store.inverted ? 'invert(100%)' : ''}`,
  }), [store.contrast, store.sepia, store.grayscale, store.inverted]);

  // Background
  const bgClass = {
    'black': 'bg-[#000000]',
    'white': 'bg-[#FFFFFF]',
    'gray': 'bg-[#1e1e1e]',
  }[store.backgroundColor] || 'bg-black';

  const endOfChapterView = (
    <div className="py-24 text-center w-full h-full flex flex-col items-center justify-center pointer-events-auto z-10 relative bg-[#0F1115]">
       <div className="max-w-[900px] w-full mx-auto px-4 mb-12">
         <SubscribeCard youtubeUrl={youtubeUrl || null} />
       </div>
       <h2 className="text-white text-2xl font-black uppercase tracking-wider mb-2">Chapter Complete</h2>
       <p className="text-white/50 text-sm mb-8 font-medium">What would you like to read next?</p>
       
       <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md px-4">
         {prevSlug && (
           <button 
             onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof window !== 'undefined' && window.location.pathname.includes('android-reader')) {
                  window.location.href = `/android-reader/index.html?seriesSlug=${chapter.seriesSlug}&chapterSlug=${prevSlug}&id=${chapter.prevChapter?.id}&seriesId=${chapter.seriesId}`;
                } else {
                  router.push(`/series/${chapter.seriesSlug}/chapter/${prevSlug}`); 
                }
              }}
             className="w-full sm:w-auto bg-white/10 text-white px-6 py-3 rounded-full font-bold hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             <ChevronLeft className="w-5 h-5" /> Prev
           </button>
         )}
         
         <button 
           onClick={(e) => { 
              e.stopPropagation(); 
              if (typeof window !== 'undefined' && window.location.pathname.includes('android-reader')) {
                window.history.back();
              } else {
                router.push(`/series/${chapter.seriesSlug}`);
              }
            }}
           className="w-full sm:w-auto bg-white/10 text-white px-6 py-3 rounded-full font-bold hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
         >
           <Layout className="w-5 h-5" /> Series
         </button>

         {nextSlug ? (
           <button 
             onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof window !== 'undefined' && window.location.pathname.includes('android-reader')) {
                  window.location.href = `/android-reader/index.html?seriesSlug=${chapter.seriesSlug}&chapterSlug=${nextSlug}&id=${chapter.nextChapter?.id}&seriesId=${chapter.seriesId}`;
                } else {
                  router.push(`/series/${chapter.seriesSlug}/chapter/${nextSlug}`); 
                }
              }}
             className="w-full sm:w-auto bg-[#E53935] text-white px-8 py-3 rounded-full font-bold hover:bg-[#E53935]/90 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             Next <ChevronRight className="w-5 h-5" />
           </button>
         ) : (
            <div className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/10 flex items-center justify-center">
              <span className="text-white/30 text-xs font-bold uppercase tracking-wider">Latest Chapter</span>
            </div>
         )}
       </div>
    </div>
  );

  if (!mounted) return <div className="h-screen w-screen bg-black" />;

  return (
    <div className={cn("relative h-screen w-screen overflow-hidden select-none", bgClass)}>
      
      {/* --- OVERLAYS --- */}
      {/* Brightness Overlay (Darkens everything below it, pointer-events-none) */}
      <div 
        className="pointer-events-none fixed inset-0 z-[40]" 
        style={{ backgroundColor: `rgba(0, 0, 0, ${1 - (store.brightness / 100)})` }} 
      />

      {/* Color Filter Overlay */}
      {store.colorFilter !== 'transparent' && (
        <div 
          className="absolute inset-0 z-20 pointer-events-none mix-blend-multiply" 
          style={{ backgroundColor: store.colorFilter, opacity: 0.3 }} 
        />
      )}

      {/* --- CONTENT AREA --- */}
      <div 
        ref={containerRef}
        className="absolute inset-0 z-10 flex items-center justify-center"
        onClick={handleContainerClick}
        style={contentFilterStyle}
      >
        {/* Webtoon / Long Strip */}
        {store.mode === 'longStrip' && (
          <div ref={scrollRef} className="h-full w-full overflow-y-auto overflow-x-hidden thin-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            <div 
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
              className={cn("w-full mx-auto", store.longStripGap ? "py-4" : "")}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const img = chapter.images[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={cn("flex justify-center bg-transparent", store.longStripGap ? "py-2" : "py-0")}
                  >
                    {/* Using standard img for webtoon for perfectly seamless stacking without layout shifts when width/height are known */}
                    {/* We can use Next.js Image if we configure it correctly, but simple img is often better for zero-gap webtoons if unoptimized anyway */}
                    {renderPage ? (
                      renderPage(virtualRow.index)
                    ) : (
                      <img
                        src={img.imageUrl}
                        alt={`Page ${img.pageNumber}`}
                        width={img.width || 800}
                        height={img.height || 1200}
                        className={cn(
                          "block m-0 p-0 h-auto", // Zero gap guarantee
                          store.fitMode === 'original' 
                            ? "w-auto object-none"
                            : store.fitMode === 'width'
                              ? "w-full max-w-full"
                              : "w-full max-w-[56rem]"
                        )}
                        loading={virtualRow.index <= 3 ? 'eager' : 'lazy'}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* End of Chapter */}
            {endOfChapterView}
          </div>
        )}

        {/* Paged Modes (Single / Vertical / Double) */}
        {(store.mode === 'singlePage' || store.mode === 'vertical' || store.mode === 'horizontal' || store.mode === 'doublePage') && (
           <>
             {store.currentPage > chapter.images.length ? (
               endOfChapterView
             ) : (
               <TransformWrapper
                 initialScale={1}
                 minScale={1}
                 maxScale={3}
                 centerOnInit
                 doubleClick={{ step: 0.5, disabled: !store.doubleTapZoom }}
                 pinch={{ step: 5 }}
                 panning={{ disabled: false }} // When scaled = 1, panning is prevented by bounds usually
                 wheel={{ disabled: true }}
               >
                 {({ state }) => (
                   <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                     <div className="flex w-full h-full items-center justify-center pointer-events-none">
                     {store.mode === 'doublePage' ? (
                       <>
                         {/* For Double Page, we show 2 images side-by-side. Need to handle direction. */}
                         {store.direction === 'rtl' ? (
                           <>
                             {/* Right-to-left: Right side is current page, Left side is next page */}
                             {chapter.images[store.currentPage] && (
                               renderPage ? renderPage(store.currentPage) : (
                                 <Image src={chapter.images[store.currentPage].imageUrl} alt="Left" width={800} height={1200} className="w-1/2 h-full object-contain pointer-events-auto" unoptimized />
                               )
                             )}
                             {chapter.images[store.currentPage - 1] && (
                               renderPage ? renderPage(store.currentPage - 1) : (
                                 <Image src={chapter.images[store.currentPage - 1].imageUrl} alt="Right" width={800} height={1200} className="w-1/2 h-full object-contain pointer-events-auto" unoptimized priority />
                               )
                             )}
                           </>
                         ) : (
                           <>
                             {/* Left-to-right: Left side is current page, Right side is next page */}
                             {chapter.images[store.currentPage - 1] && (
                               renderPage ? renderPage(store.currentPage - 1) : (
                                 <Image src={chapter.images[store.currentPage - 1].imageUrl} alt="Left" width={800} height={1200} className="w-1/2 h-full object-contain pointer-events-auto" unoptimized priority />
                               )
                             )}
                             {chapter.images[store.currentPage] && (
                               renderPage ? renderPage(store.currentPage) : (
                                 <Image src={chapter.images[store.currentPage].imageUrl} alt="Right" width={800} height={1200} className="w-1/2 h-full object-contain pointer-events-auto" unoptimized />
                               )
                             )}
                           </>
                         )}
                       </>
                     ) : (
                       chapter.images[store.currentPage - 1] && (
                         <Image
                           src={chapter.images[store.currentPage - 1].imageUrl}
                           alt={`Page ${store.currentPage}`}
                           width={chapter.images[store.currentPage - 1].width || 800}
                           height={chapter.images[store.currentPage - 1].height || 1200}
                           className={cn(
                             "max-w-full max-h-screen pointer-events-auto",
                             store.fitMode === 'width' && "w-full h-auto",
                             store.fitMode === 'height' && "h-full w-auto",
                             store.fitMode === 'smart' && "w-auto h-screen object-contain",
                             store.cropBorders && "scale-105"
                           )}
                           priority
                           unoptimized
                         />
                       )
                     )}
                     </div>
                   </TransformComponent>
                 )}
               </TransformWrapper>
             )}
           </>
        )}
      </div>

      {/* --- UI LAYER (Bars, Settings, Seekbar) --- */}
      <AnimatePresence>
        {showUI && (
          <>
            {/* Top Bar */}
            <motion.header
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute top-0 inset-x-0 z-50 bg-[#0F1115]/90 backdrop-blur-xl border-b border-white/5 pt-safe"
            >
              <div className="flex h-14 items-center px-4 justify-between">
                <button 
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.location.pathname.includes('android-reader')) {
                      window.history.back();
                    } else {
                      router.push(`/series/${chapter.seriesSlug}`);
                    }
                  }} 
                  className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex-1 px-4 flex flex-col items-center overflow-hidden">
                  <h1 className="text-white font-bold text-[15px] truncate w-full text-center tracking-wide">{chapter.seriesTitle}</h1>
                  <span className="text-[#E53935] text-[11px] font-semibold tracking-wider uppercase truncate w-full text-center">Chapter {chapter.number || ''} {chapter.title ? `- ${chapter.title}` : ''}</span>
                </div>
                <div className="flex items-center gap-1 -mr-2">
                  <button 
                    onClick={handleBookmarkToggle} 
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      isSaved ? "text-[#E53935] hover:bg-[#E53935]/20" : "text-white hover:bg-[#E53935]/20 hover:text-[#E53935]"
                    )}
                  >
                    <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => setCommentsOpen(true)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors relative">
                    <MessageSquare className="w-5 h-5" />
                    {comments?.length > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-[#E53935] rounded-full" />
                    )}
                  </button>
                  <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors hidden sm:flex">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.header>

            {/* Bottom Bar Controls */}
            <motion.footer
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 z-50 bg-gradient-to-t from-[#0F1115] via-[#0F1115]/90 to-transparent pb-safe pointer-events-none"
            >
              <div className="px-4 pb-4 pt-12 flex flex-col items-center justify-center gap-4">
                {store.showPageNumber && (
                  <div className="bg-[#1A1D24]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-white/90 text-[11px] font-bold tracking-widest uppercase shadow-xl pointer-events-auto">
                    {store.currentPage} / {chapter.images?.length || 0}
                  </div>
                )}
                
                <div className="flex items-center justify-between w-full max-w-sm bg-[#1A1D24]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 text-white pointer-events-auto shadow-2xl">
                  <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 hover:text-[#E53935] transition-all">
                    <ChevronLeft className="w-6 h-6" />
                    <span className="text-[10px] font-semibold">Previous</span>
                  </button>
                  
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (typeof window !== 'undefined' && window.location.pathname.includes('android-reader')) {
                        window.history.back();
                      } else {
                        router.push(`/series/${chapter.seriesSlug}`);
                      }
                    }} 
                    className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 hover:text-[#E53935] transition-all"
                  >
                    <Layout className="w-6 h-6" />
                    <span className="text-[10px] font-semibold">Chapters</span>
                  </button>
                  
                  <button onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }} className="flex flex-col items-center gap-1 text-[#E53935] hover:opacity-80 transition-all">
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-semibold">Settings</span>
                  </button>
                  
                  <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 hover:text-[#E53935] transition-all">
                    <ChevronRight className="w-6 h-6" />
                    <span className="text-[10px] font-semibold">Next</span>
                  </button>
                </div>
              </div>
            </motion.footer>

            {/* Vertical Page/Chapter Navigator */}
            <motion.div
              initial={{ opacity: 0, x: store.verticalNavigatorPosition === 'right' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: store.verticalNavigatorPosition === 'right' ? 20 : -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3",
                store.verticalNavigatorPosition === 'right' ? "right-4" : "left-4"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => goToPage(1)} 
                className="w-10 h-10 rounded-full bg-[#1A1D24]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all hover:bg-[#E53935]"
              >
                <ChevronLeft className="w-5 h-5 rotate-90" />
              </button>
              
              <div 
                className="relative w-10 bg-[#1A1D24]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl py-4 flex justify-center transition-all"
                style={{ height: `${store.navigatorHeight}vh`, maxHeight: '400px' }}
              >
                <input
                  type="range"
                  min={1}
                  max={chapter.images.length}
                  value={chapter.images.length - store.currentPage + 1}
                  onChange={(e) => {
                    const val = chapter.images.length - parseInt(e.target.value) + 1;
                    goToPage(val);
                  }}
                  className="w-full h-full appearance-none bg-transparent cursor-pointer outline-none slider-vertical"
                  style={{ writingMode: 'vertical-rl', direction: 'rtl', WebkitAppearance: 'slider-vertical' }}
                />
              </div>

              <button 
                onClick={() => goToPage(chapter.images.length)} 
                className="w-10 h-10 rounded-full bg-[#1A1D24]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all hover:bg-[#E53935]"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- QUICK SETTINGS BOTTOM SHEET --- */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm" 
              onClick={() => setSettingsOpen(false)} 
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 z-[70] bg-[#0F1115] rounded-t-[32px] flex flex-col pb-safe shadow-2xl overflow-hidden border-t border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 flex justify-between items-center border-b border-white/5 shrink-0 bg-[#1A1D24]/50">
                <h3 className="font-bold text-xl text-white tracking-tight">Reader Settings</h3>
                <button onClick={() => setSettingsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh] thin-scrollbar">
                
                {/* Tabs */}
                <div className="flex bg-[#1A1D24] p-1 rounded-2xl shrink-0">
                  {[
                    { id: 'display', icon: <Monitor className="w-4 h-4" />, label: 'Display' },
                    { id: 'reading', icon: <Scroll className="w-4 h-4" />, label: 'Reading' },
                    { id: 'navigation', icon: <Smartphone className="w-4 h-4" />, label: 'Navigation' },
                    { id: 'advanced', icon: <Settings className="w-4 h-4" />, label: 'Advanced' }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveSettingsTab(tab.id as any)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
                        activeSettingsTab === tab.id ? "bg-[#0F1115] text-[#E53935]" : "text-white/50 hover:text-white"
                      )}
                    >
                      {tab.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="pt-2 pb-8">
                  {activeSettingsTab === 'display' && (
                    <div className="space-y-6">
                      {/* Brightness */}
                      <div className="space-y-3 bg-[#1A1D24] p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-white/90">Brightness</span>
                          <span className="text-xs font-bold text-white/50">{Math.round(store.brightness)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Sun className="w-4 h-4 text-white/30" />
                          <input 
                            type="range" min="10" max="100" step="1" 
                            value={store.brightness} 
                            onChange={(e) => store.setBrightness(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#E53935] outline-none"
                          />
                          <Sun className="w-5 h-5 text-white/90" />
                        </div>
                      </div>

                      {/* Background */}
                      <div className="space-y-3 bg-[#1A1D24] p-4 rounded-2xl border border-white/5">
                        <span className="text-sm font-medium text-white/90 block">Background</span>
                        <div className="flex gap-4">
                          <button onClick={() => store.setBackgroundColor('white')} className="flex flex-col items-center gap-2">
                            <div className={cn("w-10 h-10 rounded-full bg-white border-2", store.backgroundColor === 'white' ? "border-[#E53935]" : "border-transparent")} />
                            <span className="text-[10px] text-white/50 font-medium">White</span>
                          </button>
                          <button onClick={() => store.setBackgroundColor('gray')} className="flex flex-col items-center gap-2">
                            <div className={cn("w-10 h-10 rounded-full bg-[#1e1e1e] border-2", store.backgroundColor === 'gray' ? "border-[#E53935]" : "border-transparent")} />
                            <span className="text-[10px] text-white/50 font-medium">Dark</span>
                          </button>
                          <button onClick={() => store.setBackgroundColor('black')} className="flex flex-col items-center gap-2">
                            <div className={cn("w-10 h-10 rounded-full bg-black border-2 border-white/10", store.backgroundColor === 'black' ? "border-[#E53935]" : "")} />
                            <span className="text-[10px] text-white/50 font-medium">Pure Black</span>
                          </button>
                        </div>
                      </div>

                      {/* Image Fit */}
                      <div className="space-y-3 bg-[#1A1D24] p-4 rounded-2xl border border-white/5">
                        <span className="text-sm font-medium text-white/90 block">Image Fit</span>
                        <div className="flex gap-2">
                          <button onClick={() => store.setFitMode('width')} className={cn("flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border", store.fitMode === 'width' ? "border-[#E53935] text-[#E53935] bg-[#E53935]/10" : "border-white/10 text-white/50")}>
                            <Maximize className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Fit Width</span>
                          </button>
                          <button onClick={() => store.setFitMode('height')} className={cn("flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border", store.fitMode === 'height' ? "border-[#E53935] text-[#E53935] bg-[#E53935]/10" : "border-white/10 text-white/50")}>
                            <FileImage className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Fit Height</span>
                          </button>
                          <button onClick={() => store.setFitMode('smart')} className={cn("flex-1 py-3 rounded-xl flex flex-col items-center gap-1 border", store.fitMode === 'smart' ? "border-[#E53935] text-[#E53935] bg-[#E53935]/10" : "border-white/10 text-white/50")}>
                            <Sun className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Smart Fit</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Toggles */}
                      <div className="space-y-1 bg-[#1A1D24] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Show Page Number</span>
                          <button onClick={() => store.toggleShowPageNumber()} className={cn("w-12 h-6 rounded-full transition-colors relative", store.showPageNumber ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.showPageNumber ? "left-7" : "left-1")} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Keep Screen On</span>
                          <button onClick={() => store.setKeepScreenOn(!store.keepScreenOn)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.keepScreenOn ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.keepScreenOn ? "left-7" : "left-1")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'reading' && (
                    <div className="space-y-6">
                      <div className="space-y-3 bg-[#1A1D24] p-4 rounded-2xl border border-white/5">
                        <span className="text-sm font-medium text-white/90 block">Reading Mode</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => store.setMode('vertical')} className={cn("py-3 px-4 rounded-xl flex flex-col items-center gap-2 border transition-all", store.mode === 'vertical' ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "border-white/10 text-white/70 hover:bg-white/5")}>
                            <ArrowDownToLine className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Vertical</span>
                          </button>
                          <button onClick={() => { store.setMode('singlePage'); store.setDirection('ltr'); }} className={cn("py-3 px-4 rounded-xl flex flex-col items-center gap-2 border transition-all", store.mode === 'singlePage' && store.direction === 'ltr' ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "border-white/10 text-white/70 hover:bg-white/5")}>
                            <ArrowRightToLine className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Horizontal</span>
                          </button>
                          <button onClick={() => { store.setMode('longStrip'); store.setLongStripGap(false); }} className={cn("py-3 px-4 rounded-xl flex flex-col items-center gap-2 border transition-all", store.mode === 'longStrip' && !store.longStripGap ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "border-white/10 text-white/70 hover:bg-white/5")}>
                            <Scroll className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Webtoon</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 bg-[#1A1D24] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Double Tap to Zoom</span>
                          <button onClick={() => store.toggleDoubleTapZoom()} className={cn("w-12 h-6 rounded-full transition-colors relative", store.doubleTapZoom ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.doubleTapZoom ? "left-7" : "left-1")} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Remember Zoom</span>
                          <button onClick={() => store.setRememberZoom(!store.rememberZoom)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.rememberZoom ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.rememberZoom ? "left-7" : "left-1")} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Auto-Hide Controls</span>
                          <button onClick={() => store.setAutoHideControls(!store.autoHideControls)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.autoHideControls ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.autoHideControls ? "left-7" : "left-1")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'navigation' && (
                    <div className="space-y-6">
                      <div className="space-y-1 bg-[#1A1D24] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Volume Buttons to Navigate</span>
                          <button onClick={() => store.setVolumeNavigation(!store.volumeNavigation)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.volumeNavigation ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.volumeNavigation ? "left-7" : "left-1")} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Swipe to Change Chapter</span>
                          <button onClick={() => store.setSwipeNavigation(!store.swipeNavigation)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.swipeNavigation ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.swipeNavigation ? "left-7" : "left-1")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'advanced' && (
                    <div className="space-y-6">
                      <div className="space-y-1 bg-[#1A1D24] rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Preload Next Pages</span>
                          <button onClick={() => store.setPreloadNextPages(!store.preloadNextPages)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.preloadNextPages ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.preloadNextPages ? "left-7" : "left-1")} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Fullscreen Reader</span>
                          <button onClick={() => store.toggleFullscreen()} className={cn("w-12 h-6 rounded-full transition-colors relative", store.isFullscreen ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.isFullscreen ? "left-7" : "left-1")} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4">
                          <span className="text-sm font-medium text-white/90">Immersive Mode</span>
                          <button onClick={() => store.setImmersiveMode(!store.immersiveMode)} className={cn("w-12 h-6 rounded-full transition-colors relative", store.immersiveMode ? "bg-[#E53935]" : "bg-white/10")}>
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.immersiveMode ? "left-7" : "left-1")} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- COMMENTS BOTTOM SHEET --- */}
      <AnimatePresence>
        {commentsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] bg-black/50" 
              onClick={() => setCommentsOpen(false)} 
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 z-[70] bg-[#121212] rounded-t-2xl h-[80vh] flex flex-col pb-safe shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 flex justify-between items-center border-b border-white/10 text-white shrink-0">
                <h3 className="font-bold text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Comments</h3>
                <button onClick={() => setCommentsOpen(false)} className="p-2"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto thin-scrollbar bg-black/20">
                <CommentSection chapterId={chapter.id} comments={comments || []} currentUserId={currentUserId} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
