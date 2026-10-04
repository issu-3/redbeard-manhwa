'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  ArrowLeft, Settings, ChevronLeft, ChevronRight, MoreVertical, X, MessageSquare,
  Bookmark, Layout
} from 'lucide-react';
import { useReaderStore, type ReaderMode } from '@/store/reader-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { useAppLibraryStore } from '@/store/app-library-store';
import { saveUserPreferences } from '@/app/actions/preferences';
import { CommentSection } from '@/components/shared/CommentSection';
import { ReaderSettingsSheet } from './ReaderSettingsSheet';
import { SubscribeCard } from '@/components/shared/SubscribeCard';
import { AdsterraAd } from '@/components/ads/AdsterraAd';

// Helper to safely get the slug
function getSafeSlug(c?: { slug?: string | null; number?: number | null } | null) {
  if (!c) return null;
  if (typeof c.slug === 'string' && c.slug.trim()) return c.slug;
  if (c.number != null) return String(c.number);
  return null;
}

const ImageLoader = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 pointer-events-none">
    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#E53935] animate-spin mb-2 shadow-[0_0_15px_rgba(229,57,53,0.15)]"></div>
    <span className="text-white/40 text-[9px] font-bold tracking-widest uppercase">Loading...</span>
  </div>
);

export function ChapterReader({ chapter, comments, currentUserId, userPreferences, defaultReadingMode, youtubeUrl, renderPage, initialPage = 1, adsterraBannerScript }: any) {
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
  const midIndex = Math.max(1, Math.floor((chapter.images?.length || 0) * 0.35));

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
       <div className="w-full flex justify-center mb-8">
         <AdsterraAd placement="BOTTOM" htmlScript={adsterraBannerScript} />
       </div>
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

  if (!mounted) return <div className="h-dvh w-screen bg-black" />;

  return (
    <div className={cn("relative h-dvh w-screen overflow-hidden select-none", bgClass)}>
      
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
                    className={cn("flex flex-col items-center bg-transparent", store.longStripGap ? "py-2" : "py-0")}
                  >
                    {virtualRow.index === 0 && (
                      <div className="w-full flex justify-center pt-16 pb-6 pointer-events-auto shrink-0">
                        <AdsterraAd placement="TOP" htmlScript={adsterraBannerScript} className="w-full max-w-[728px]" />
                      </div>
                    )}
                    {virtualRow.index === midIndex && (
                      <div className="w-full flex justify-center py-6 pointer-events-auto shrink-0">
                        <AdsterraAd placement="MID" htmlScript={adsterraBannerScript} className="w-full max-w-[300px]" />
                      </div>
                    )}
                    {/* Using standard img for webtoon for perfectly seamless stacking without layout shifts when width/height are known */}
                    {/* We can use Next.js Image if we configure it correctly, but simple img is often better for zero-gap webtoons if unoptimized anyway */}
                    {!renderPage && !loadedImages.has(virtualRow.index) && <ImageLoader />}
                    {renderPage ? (
                      renderPage(virtualRow.index)
                    ) : (
                      <img
                        src={img.imageUrl}
                        alt={`${chapter.seriesTitle} Chapter ${chapter.number || ''} Page ${img.pageNumber}`}
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
                        onLoad={() => {
                          setLoadedImages(prev => {
                            const next = new Set(prev);
                            next.add(virtualRow.index);
                            return next;
                          });
                        }}
                        onError={() => {
                          setLoadedImages(prev => {
                            const next = new Set(prev);
                            next.add(virtualRow.index);
                            return next;
                          });
                        }}
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
               <div className="w-full h-full flex flex-col items-center justify-center">
                 {store.currentPage === 1 && (
                   <div className="w-full flex justify-center pt-16 pb-2 pointer-events-auto shrink-0 z-20">
                     <AdsterraAd placement="TOP" htmlScript={adsterraBannerScript} className="w-full max-w-[728px]" />
                   </div>
                 )}
                 {store.currentPage === midIndex && (
                   <div className="w-full flex justify-center py-2 pointer-events-auto shrink-0 z-20">
                     <AdsterraAd placement="MID" htmlScript={adsterraBannerScript} className="w-full max-w-[300px]" />
                   </div>
                 )}
                 <div className="flex-1 w-full overflow-hidden flex items-center justify-center relative">
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
                               <div className="relative w-1/2 h-full flex justify-center items-center">
                                 {!renderPage && !loadedImages.has(store.currentPage) && <ImageLoader />}
                                 {renderPage ? renderPage(store.currentPage) : (
                                   <Image src={chapter.images[store.currentPage].imageUrl} alt="Left" width={800} height={1200} className="w-full h-full object-contain pointer-events-auto" unoptimized onLoad={() => setLoadedImages(prev => new Set(prev).add(store.currentPage))} onError={() => setLoadedImages(prev => new Set(prev).add(store.currentPage))} />
                                 )}
                               </div>
                             )}
                             {chapter.images[store.currentPage - 1] && (
                               <div className="relative w-1/2 h-full flex justify-center items-center">
                                 {!renderPage && !loadedImages.has(store.currentPage - 1) && <ImageLoader />}
                                 {renderPage ? renderPage(store.currentPage - 1) : (
                                   <Image src={chapter.images[store.currentPage - 1].imageUrl} alt="Right" width={800} height={1200} className="w-full h-full object-contain pointer-events-auto" unoptimized priority onLoad={() => setLoadedImages(prev => new Set(prev).add(store.currentPage - 1))} onError={() => setLoadedImages(prev => new Set(prev).add(store.currentPage - 1))} />
                                 )}
                               </div>
                             )}
                           </>
                         ) : (
                           <>
                             {/* Left-to-right: Left side is current page, Right side is next page */}
                             {chapter.images[store.currentPage - 1] && (
                               <div className="relative w-1/2 h-full flex justify-center items-center">
                                 {!renderPage && !loadedImages.has(store.currentPage - 1) && <ImageLoader />}
                                 {renderPage ? renderPage(store.currentPage - 1) : (
                                   <Image src={chapter.images[store.currentPage - 1].imageUrl} alt="Left" width={800} height={1200} className="w-full h-full object-contain pointer-events-auto" unoptimized priority onLoad={() => setLoadedImages(prev => new Set(prev).add(store.currentPage - 1))} onError={() => setLoadedImages(prev => new Set(prev).add(store.currentPage - 1))} />
                                 )}
                               </div>
                             )}
                             {chapter.images[store.currentPage] && (
                               <div className="relative w-1/2 h-full flex justify-center items-center">
                                 {!renderPage && !loadedImages.has(store.currentPage) && <ImageLoader />}
                                 {renderPage ? renderPage(store.currentPage) : (
                                   <Image src={chapter.images[store.currentPage].imageUrl} alt="Right" width={800} height={1200} className="w-full h-full object-contain pointer-events-auto" unoptimized onLoad={() => setLoadedImages(prev => new Set(prev).add(store.currentPage))} onError={() => setLoadedImages(prev => new Set(prev).add(store.currentPage))} />
                                 )}
                               </div>
                             )}
                           </>
                         )}
                       </>
                     ) : (
                       chapter.images[store.currentPage - 1] && (
                         <>
                           {!loadedImages.has(store.currentPage - 1) && <ImageLoader />}
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
                             onLoad={() => {
                               setLoadedImages(prev => {
                                 const next = new Set(prev);
                                 next.add(store.currentPage - 1);
                                 return next;
                               });
                             }}
                             onError={() => {
                               setLoadedImages(prev => {
                                 const next = new Set(prev);
                                 next.add(store.currentPage - 1);
                                 return next;
                               });
                             }}
                           />
                         </>
                       )
                     )}
                     </div>
                   </TransformComponent>
                 )}
               </TransformWrapper>
                 </div>
               </div>
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
            <ReaderSettingsSheet onClose={() => setSettingsOpen(false)} />
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
              className="absolute bottom-0 inset-x-0 z-[70] bg-[#121212] rounded-t-2xl h-[80dvh] flex flex-col pb-safe shadow-2xl"
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
