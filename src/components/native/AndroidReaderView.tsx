'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDownloadStore } from '@/store/download-store';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { Capacitor } from '@capacitor/core';
import { Document, Page, pdfjs } from 'react-pdf';
import { nativeUserId } from '@/components/native/NativeInitializer';
import JSZip from 'jszip';
import { useReaderStore } from '@/store/reader-store';
import { cn } from '@/lib/utils';
import { ChapterReader } from '@/components/reader/ChapterReader';

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
  const [initialPage, setInitialPage] = useState<number>(1);

  // CBZ State
  const [isCbz, setIsCbz] = useState(false);
  const [cbzImages, setCbzImages] = useState<{url: string, width: number, height: number}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const activeUserId = nativeUserId || 'guest';
      
      // Fetch reading progress
      try {
        const page = await SeriesRepository.getReadingProgress(activeUserId, seriesId, chapterId);
        if (page > 1) {
          setInitialPage(page);
        }
      } catch (e) {
        console.error('Failed to load reading progress', e);
      }

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
        // Try Online Reader Fallback
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redbeard.store';
          const res = await fetch(`${API_BASE_URL}/api/chapter/${chapterId}/online-info`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.fileType === 'CBZ') {
              setIsCbz(true);
              const images = data.pages.map((p: any) => ({
                url: `${API_BASE_URL}/api/chapter/${chapterId}/page/${p.index}`,
                width: 800,
                height: 1200
              }));
              setCbzImages(images);
              setNumPages(images.length);
              setLocalUrl('ONLINE_MODE'); // Prevent missing file error
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Online fallback failed:', e);
        }

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
      const images: {url: string, width: number, height: number}[] = [];
      
      const entries = Object.values(zip.files).filter(f => {
        if (f.dir) return false;
        if (!f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) return false;
        if (f.name.includes('__MACOSX')) return false;
        if (f.name.split('/').pop()?.startsWith('._')) return false;
        if (f.name.toLowerCase().includes('thumb')) return false;
        return true;
      });
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      
      for (const entry of entries) {
        const fileBlob = await entry.async('blob');
        const imgUrl = URL.createObjectURL(fileBlob);
        
        const dims = await new Promise<{width: number, height: number, valid: boolean}>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height, valid: true });
          img.onerror = () => resolve({ width: 0, height: 0, valid: false });
          img.src = imgUrl;
        });
        
        if (dims.valid && dims.width > 300 && dims.height > 300) {
          images.push({ url: imgUrl, width: dims.width, height: dims.height });
        } else {
          URL.revokeObjectURL(imgUrl);
        }
      }
      
      setCbzImages(images);
      setNumPages(images.length);
    } catch (e) {
      console.error('CBZ load error:', e);
      alert('Failed to read CBZ file.');
    }
  };

  // Handle Hardware Back Button natively
  useEffect(() => {
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      window.history.back();
    };
    document.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      document.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, []);

  // Save Progress to SQLite
  useEffect(() => {
    const activeUserId = nativeUserId || 'guest';
    if (!activeUserId || !numPages) return;

    const saveProgress = async () => {
      // Save current page (bookmark)
      await SeriesRepository.saveReadingProgress(activeUserId, seriesId, chapterId, store.currentPage);
      
      // Mark chapter as read if at the end (or near the end)
      if (store.currentPage >= numPages - 1 && numPages > 0) {
        await SeriesRepository.saveReadState(activeUserId, seriesId, chapterId, true);
      }
    };

    const timer = setTimeout(saveProgress, 500);
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
          onClick={() => window.history.back()}
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

  if (isCbz && cbzImages.length > 0) {
    const mockChapter = {
      id: chapterId,
      seriesId: seriesId,
      seriesTitle: seriesSlug,
      seriesSlug: seriesSlug,
      number: null,
      label: chapterSlug,
      title: chapterSlug,
      slug: chapterSlug,
      totalPages: cbzImages.length,
      sourceType: 'DOWNLOADED',
      images: cbzImages.map((img) => ({
        imageUrl: img.url,
        width: img.width,
        height: img.height
      }))
    };

    return (
      <div className={cn("fixed inset-0 z-[100] bg-background", bgClass)}>
        <ChapterReader 
          chapter={mockChapter as any} 
          comments={[]} 
          currentUserId={nativeUserId || undefined}
          initialPage={initialPage}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden select-none", bgClass)}>
      {/* Brightness Overlay (Below UI) */}
      <div 
        className="pointer-events-none absolute inset-0 z-[40]"
        style={{ backgroundColor: `rgba(0, 0, 0, ${1 - (store.brightness / 100)})` }}
      />
      
      {/* PDF Rendering */}
      {!isCbz && (
        <div className={cn("fixed inset-0 z-[100] bg-background", bgClass)}>
          <Document
            file={localUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-[#E53935] w-8 h-8"/></div>}
          >
            {numPages > 0 && (
              <ChapterReader 
                chapter={{
                  id: chapterId,
                  seriesId: seriesId,
                  seriesTitle: seriesSlug,
                  seriesSlug: seriesSlug,
                  number: null,
                  label: chapterSlug,
                  title: chapterSlug,
                  slug: chapterSlug,
                  totalPages: numPages,
                  sourceType: 'PDF',
                  images: Array.from({ length: numPages }).map((_, i) => ({
                    imageUrl: `pdf_page_${i + 1}`,
                    width: 800,
                    height: 1200
                  }))
                } as any} 
                comments={[]} 
                currentUserId={nativeUserId || undefined}
                initialPage={initialPage}
                renderPage={(index: number) => (
                  <Page
                    pageNumber={index + 1}
                    width={typeof window !== 'undefined' ? window.innerWidth : 800}
                    className="flex items-center justify-center pointer-events-auto m-0 p-0"
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                )}
              />
            )}
          </Document>
        </div>
      )}
    </div>
  );
}
