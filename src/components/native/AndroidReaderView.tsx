'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Settings, MoreVertical, Loader2, ChevronLeft, ChevronRight, Share2, Sun, Contrast, Monitor, Smartphone, Scroll, FileImage, ArrowRightToLine, ArrowLeftToLine, ArrowDownToLine, Maximize, Columns, X, Bookmark, Layout, Palette, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDownloadStore } from '@/store/download-store';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { Capacitor } from '@capacitor/core';
import { Document, Page, pdfjs } from 'react-pdf';
import { nativeUserId } from '@/components/native/NativeInitializer';
import JSZip from 'jszip';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useReaderStore } from '@/store/reader-store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export function AndroidReaderView({
  seriesSlug,
  chapterSlug,
  chapterId,
  seriesId
}: {
  seriesSlug: string,
  chapterSlug: string,
  chapterId: string,
  seriesId: string
}) {
  const router = useRouter();
  const { getDownloadState } = useDownloadStore();
  const store = useReaderStore();

  const [showUI, setShowUI] = useState(!store.isUIHidden);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // CBZ State
  const [isCbz, setIsCbz] = useState(false);
  const [cbzImages, setCbzImages] = useState<{url: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const state = getDownloadState(chapterId);
      if (state.status === 'COMPLETED' && state.localUri) {
        const filename = state.metadata?.filename?.toLowerCase() || '';
        const isZip = filename.endsWith('.cbz') || filename.endsWith('.zip');
        setIsCbz(isZip);

        if (Capacitor.isNativePlatform()) {
          const convertedUrl = Capacitor.convertFileSrc(state.localUri);
          setLocalUrl(convertedUrl);
          if (isZip) {
            await loadCbz(convertedUrl);
          }
        } else {
          setLocalUrl(state.localUri);
          if (isZip) {
            await loadCbz(state.localUri);
          }
        }
      } else {
        console.warn('Chapter is not downloaded. Android Offline Reader requires downloaded file.');
      }
      setLoading(false);
    };
    init();
    
    // Cleanup object urls
    return () => {
      cbzImages.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [chapterId, getDownloadState]);

  const loadCbz = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const zip = await JSZip.loadAsync(blob);
      const images: {url: string}[] = [];
      
      const entries = Object.values(zip.files).filter(f => !f.dir && f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i));
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      
      for (const entry of entries) {
        const fileBlob = await entry.async('blob');
        images.push({ url: URL.createObjectURL(fileBlob) });
      }
      
      setCbzImages(images);
      setNumPages(images.length);
    } catch (e) {
      console.error('CBZ load error:', e);
      alert('Failed to read CBZ file.');
    }
  };

  // Track scrolling in longStrip mode natively using IntersectionObserver
  const pageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (store.mode !== 'longStrip' || !isCbz || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let bestIndex = -1;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            bestIndex = Number((entry.target as HTMLImageElement).dataset.index);
          }
        });
        if (bestIndex !== -1 && store.currentPage !== bestIndex + 1) {
          store.setCurrentPage(bestIndex + 1);
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [store.mode, isCbz, numPages, cbzImages.length]);

  const goToPage = useCallback((pageNumber: number) => {
    if (!numPages || pageNumber < 1 || pageNumber > numPages) return;
    
    if (store.mode === 'longStrip' && isCbz) {
      const el = pageRefs.current[pageNumber - 1];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    store.setCurrentPage(pageNumber);
  }, [numPages, store.mode, isCbz]);

  const goNext = useCallback(() => {
    const jump = store.mode === 'doublePage' && isCbz ? 2 : 1;
    if (store.currentPage + jump - 1 < numPages) {
      goToPage(store.currentPage + jump);
    }
  }, [store.currentPage, numPages, store.mode, isCbz, goToPage]);

  const goPrev = useCallback(() => {
    const jump = store.mode === 'doublePage' && isCbz ? 2 : 1;
    if (store.currentPage > jump) {
      goToPage(store.currentPage - jump);
    }
  }, [store.currentPage, numPages, store.mode, isCbz, goToPage]);

  // Tap Zones
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
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
      store.setUIHidden(!showUI);
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
  }, [settingsOpen, store.mode, store.direction, goNext, goPrev, showUI, store]);

  // Save Progress to SQLite
  useEffect(() => {
    const activeUserId = nativeUserId || 'guest';
    if (!activeUserId || !numPages) return;

    const saveProgress = async () => {
      await SeriesRepository.saveReadState(activeUserId, seriesId, chapterId, true);
    };

    const timer = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timer);
  }, [store.currentPage, numPages, chapterId, seriesId]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!localUrl) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-black text-white px-4 text-center">
        <p className="mb-4">This chapter is not downloaded.</p>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-[#1C1C1C] font-bold px-6 py-2"
        >
          Go Back
        </button>
      </div>
    );
  }

  const bgClass = store.backgroundColor === 'white' ? 'bg-white text-black' : 
                  store.backgroundColor === 'gray' ? 'bg-[#1C1C1E] text-white' : 
                  'bg-black text-white';

  return (
    <div className={cn("relative w-full h-full overflow-hidden select-none", bgClass)}>
      
      {/* Brightness Overlay (Below UI) */}
      <div 
        className="pointer-events-none absolute inset-0 z-[40]"
        style={{ backgroundColor: `rgba(0, 0, 0, ${1 - (store.brightness / 100)})` }}
      />

      {/* --- UI LAYER (Pointer events none on wrapper, auto on children) --- */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <AnimatePresence>
          {showUI && (
            <>
              {/* Top Bar */}
              <motion.header
                initial={{ y: '-100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute top-0 inset-x-0 bg-[#0F1115]/90 backdrop-blur-xl border-b border-white/5 pt-safe pointer-events-auto"
              >
                <div className="flex h-14 items-center px-4 justify-between">
                  <button onClick={() => router.back()} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <div className="flex-1 px-4 flex flex-col items-center overflow-hidden">
                    <h1 className="text-white font-bold text-[15px] truncate w-full text-center tracking-wide">{seriesSlug}</h1>
                    <span className="text-[#E53935] text-[11px] font-semibold tracking-wider uppercase truncate w-full text-center">{chapterSlug}</span>
                  </div>
                  <div className="flex items-center gap-1 -mr-2">
                    <button className="p-2 text-white hover:bg-[#E53935]/20 hover:text-[#E53935] rounded-full transition-colors">
                      <Bookmark className="w-5 h-5" />
                    </button>
                    <button onClick={() => setSettingsOpen(true)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                      <Settings className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.header>

              {/* Bottom Bar / Page Indicator */}
              {store.showPageNumber && (
                <motion.footer
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0F1115] to-transparent pb-safe pointer-events-none"
                >
                  <div className="px-4 pb-6 pt-12 flex items-center justify-center">
                    <div className="bg-[#1A1D24]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-white/90 text-[11px] font-bold tracking-widest uppercase shadow-xl pointer-events-auto">
                      {store.currentPage} / {numPages}
                    </div>
                  </div>
                </motion.footer>
              )}

              {/* Vertical Page/Chapter Navigator */}
              <motion.div
                initial={{ opacity: 0, x: store.verticalNavigatorPosition === 'right' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: store.verticalNavigatorPosition === 'right' ? 20 : -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 pointer-events-auto",
                  store.verticalNavigatorPosition === 'right' ? "right-4" : "left-4"
                )}
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
                    max={numPages}
                    value={numPages - store.currentPage + 1}
                    onChange={(e) => {
                      const val = numPages - parseInt(e.target.value) + 1;
                      goToPage(val);
                    }}
                    className="w-full h-full appearance-none bg-transparent cursor-pointer outline-none slider-vertical"
                    style={{ writingMode: 'vertical-rl', direction: 'rtl', WebkitAppearance: 'slider-vertical' }}
                  />
                </div>

                <button 
                  onClick={() => goToPage(numPages)} 
                  className="w-10 h-10 rounded-full bg-[#1A1D24]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all hover:bg-[#E53935]"
                >
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODAL LAYER --- */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[200]">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setSettingsOpen(false)} 
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 bg-[#0F1115] rounded-t-[32px] flex flex-col pb-safe shadow-2xl overflow-hidden border-t border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 flex justify-between items-center border-b border-white/5 shrink-0 bg-[#1A1D24]/50">
                <h3 className="font-bold text-xl text-white tracking-tight">Reader Settings</h3>
                <button onClick={() => setSettingsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[75vh] thin-scrollbar">
                
                {/* Reading Mode */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#E53935]">
                    <Layout className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-widest">Reading Mode</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { store.setMode('longStrip'); if(store.longStripGap) store.toggleLongStripGap(); }} className={cn("py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border", store.mode === 'longStrip' && !store.longStripGap ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "bg-[#1A1D24] border-transparent text-white/70 hover:bg-white/5")}>
                      <Scroll className="w-6 h-6" />
                      <span className="text-xs font-semibold">Long Strip</span>
                    </button>
                    <button onClick={() => { store.setMode('longStrip'); if(!store.longStripGap) store.toggleLongStripGap(); }} className={cn("py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border", store.mode === 'longStrip' && store.longStripGap ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "bg-[#1A1D24] border-transparent text-white/70 hover:bg-white/5")}>
                      <Scroll className="w-6 h-6 border-dashed border-2 rounded-sm" />
                      <span className="text-xs font-semibold">Strip (Gaps)</span>
                    </button>
                    <button onClick={() => { store.setMode('singlePage'); store.setDirection('ltr'); }} className={cn("py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border", store.mode === 'singlePage' && store.direction === 'ltr' ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "bg-[#1A1D24] border-transparent text-white/70 hover:bg-white/5")}>
                      <ArrowRightToLine className="w-6 h-6" />
                      <span className="text-xs font-semibold">Paged (L→R)</span>
                    </button>
                    <button onClick={() => { store.setMode('singlePage'); store.setDirection('rtl'); }} className={cn("py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border", store.mode === 'singlePage' && store.direction === 'rtl' ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "bg-[#1A1D24] border-transparent text-white/70 hover:bg-white/5")}>
                      <ArrowLeftToLine className="w-6 h-6" />
                      <span className="text-xs font-semibold">Paged (R→L)</span>
                    </button>
                    <button onClick={() => store.setMode('vertical')} className={cn("py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border", store.mode === 'vertical' ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "bg-[#1A1D24] border-transparent text-white/70 hover:bg-white/5")}>
                      <ArrowDownToLine className="w-6 h-6" />
                      <span className="text-xs font-semibold">Paged Vertical</span>
                    </button>
                    {isCbz && (
                      <button onClick={() => store.setMode('doublePage')} className={cn("py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border", store.mode === 'doublePage' ? "bg-[#E53935]/10 border-[#E53935] text-[#E53935]" : "bg-[#1A1D24] border-transparent text-white/70 hover:bg-white/5")}>
                        <Columns className="w-6 h-6" />
                        <span className="text-xs font-semibold">Double Page</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* General Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#E53935]">
                    <Settings className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-widest">General</h4>
                  </div>
                  
                  <div className="space-y-4 bg-[#1A1D24] p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white/90">Show Page Number</span>
                      <button onClick={() => store.toggleShowPageNumber()} className={cn("w-12 h-6 rounded-full transition-colors relative", store.showPageNumber ? "bg-[#E53935]" : "bg-white/10")}>
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.showPageNumber ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      <span className="text-sm font-medium text-white/90">Navigator Position</span>
                      <div className="flex gap-2">
                        <button onClick={() => store.setVerticalNavigatorPosition('left')} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border", store.verticalNavigatorPosition === 'left' ? "bg-[#E53935] text-white border-transparent" : "bg-transparent text-white/50 border-white/10 hover:bg-white/5")}>Left</button>
                        <button onClick={() => store.setVerticalNavigatorPosition('right')} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border", store.verticalNavigatorPosition === 'right' ? "bg-[#E53935] text-white border-transparent" : "bg-transparent text-white/50 border-white/10 hover:bg-white/5")}>Right</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Filters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#E53935]">
                    <Palette className="w-5 h-5" />
                    <h4 className="font-bold text-sm uppercase tracking-widest">Custom Filter</h4>
                  </div>
                  
                  <div className="space-y-6 bg-[#1A1D24] p-4 rounded-2xl">
                    {/* Brightness */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white/90">Brightness</span>
                        <span className="text-xs font-bold text-white/50">{Math.round(store.brightness * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sun className="w-4 h-4 text-white/30" />
                        <input 
                          type="range" min="0" max="1" step="0.05" 
                          value={store.brightness} 
                          onChange={(e) => store.setBrightness(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#E53935] outline-none"
                        />
                        <Sun className="w-5 h-5 text-white/90" />
                      </div>
                    </div>
                    
                    {/* Color Filters */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      <span className="text-sm font-medium text-white/90">Color Overlay</span>
                      <div className="flex gap-2">
                        {['transparent', '#F5E6C8', '#E8F5E9', '#E3F2FD', '#FCE4EC'].map(color => (
                          <button 
                            key={color}
                            onClick={() => store.setColorFilter(color)}
                            className={cn("w-10 h-10 rounded-full border-2 transition-transform", store.colorFilter === color ? "border-[#E53935] scale-110" : "border-transparent hover:scale-105")}
                            style={{ backgroundColor: color === 'transparent' ? '#333' : color }}
                          >
                            {color === 'transparent' && <span className="text-[10px] text-white/50 block mt-2">None</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Toggles */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-sm font-medium text-white/90">Grayscale</span>
                      <button onClick={() => store.toggleGrayscale()} className={cn("w-12 h-6 rounded-full transition-colors relative", store.grayscale ? "bg-[#E53935]" : "bg-white/10")}>
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.grayscale ? "left-7" : "left-1")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white/90">Invert Colors</span>
                      <button onClick={() => store.toggleInverted()} className={cn("w-12 h-6 rounded-full transition-colors relative", store.inverted ? "bg-[#E53935]" : "bg-white/10")}>
                        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", store.inverted ? "left-7" : "left-1")} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MANGA SCROLL LAYER --- */}
      <div 
        className="relative w-full h-full z-10 overflow-hidden"
        style={{
          filter: `contrast(${store.contrast}%) sepia(${store.sepia}%) ${store.grayscale ? 'grayscale(100%)' : ''} ${store.inverted ? 'invert(100%)' : ''}`
        }}
        onClick={handleContainerClick}
      >
        {/* Color Filter Overlay */}
        {store.colorFilter !== 'transparent' && (
          <div 
            className="absolute inset-0 z-20 pointer-events-none mix-blend-multiply" 
            style={{ backgroundColor: store.colorFilter, opacity: 0.3 }} 
          />
        )}

        {!isCbz ? (
          /* PDF Rendering (Currently simple react-pdf, can enhance later) */
          <div className="w-full h-full overflow-auto thin-scrollbar flex items-center justify-center">
            <Document
              file={localUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-[#E53935] w-8 h-8"/></div>}
            >
              <Page
                pageNumber={store.currentPage}
                width={typeof window !== 'undefined' ? window.innerWidth : undefined}
                className="flex items-center justify-center min-h-[100dvh]"
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
          </div>
        ) : (
          /* CBZ Rendering */
          <>
            {/* Webtoon / Long Strip */}
            {store.mode === 'longStrip' && (
              <div ref={scrollRef} className="h-full w-full overflow-y-auto overflow-x-hidden thin-scrollbar bg-[#0F1115]" style={{ scrollBehavior: 'smooth' }}>
                <div 
                  className={cn("w-full mx-auto pb-safe", store.longStripGap ? "py-4 space-y-4" : "")}
                >
                  {cbzImages.map((img, i) => (
                    <div key={i} className="w-full flex justify-center">
                      <img
                        ref={(el) => { pageRefs.current[i] = el; }}
                        data-index={i}
                        src={img.url}
                        alt={`Page ${i + 1}`}
                        className={cn(
                          "block m-0 p-0",
                          store.fitMode === 'original' 
                            ? "w-auto object-none"
                            : store.fitMode === 'width' 
                              ? "w-full h-auto"
                              : "w-full max-w-[56rem] h-auto"
                        )}
                        loading={i <= 3 ? 'eager' : 'lazy'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paged Modes */}
            {(store.mode === 'singlePage' || store.mode === 'vertical' || store.mode === 'horizontal' || store.mode === 'doublePage') && (
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={3}
                centerOnInit
                doubleClick={{ step: 0.5, disabled: !store.doubleTapZoom }}
                pinch={{ step: 5 }}
                panning={{ disabled: false }}
                wheel={{ disabled: true }}
              >
                {({ state }) => (
                  <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                    <div className="flex w-full h-full items-center justify-center">
                    {store.mode === 'doublePage' ? (
                      <>
                        {store.direction === 'rtl' ? (
                          <>
                            {cbzImages[store.currentPage] && (
                               <img src={cbzImages[store.currentPage].url} alt="Left" className="w-1/2 h-full object-contain pointer-events-none" />
                            )}
                            {cbzImages[store.currentPage - 1] && (
                               <img src={cbzImages[store.currentPage - 1].url} alt="Right" className="w-1/2 h-full object-contain pointer-events-none" />
                            )}
                          </>
                        ) : (
                          <>
                            {cbzImages[store.currentPage - 1] && (
                               <img src={cbzImages[store.currentPage - 1].url} alt="Left" className="w-1/2 h-full object-contain pointer-events-none" />
                            )}
                            {cbzImages[store.currentPage] && (
                               <img src={cbzImages[store.currentPage].url} alt="Right" className="w-1/2 h-full object-contain pointer-events-none" />
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      cbzImages[store.currentPage - 1] && (
                        <img
                          src={cbzImages[store.currentPage - 1].url}
                          alt={`Page ${store.currentPage}`}
                          className={cn(
                            "max-w-full max-h-[100dvh] pointer-events-none object-contain",
                            store.fitMode === 'width' && "w-full h-auto",
                            store.fitMode === 'height' && "h-full w-auto",
                            store.fitMode === 'smart' && "w-auto h-[100dvh]",
                            store.cropBorders && "scale-105"
                          )}
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
    </div>
  );
}
