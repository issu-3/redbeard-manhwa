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
        width: 800,
        height: 1200
      }))
    };

    return (
      <div className={cn("fixed inset-0 z-[100] bg-background", bgClass)}>
        <ChapterReader 
          chapter={mockChapter as any} 
          comments={[]} 
          currentUserId={nativeUserId || undefined}
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
        <div className="w-full h-full overflow-auto thin-scrollbar flex items-center justify-center relative z-10">
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
          
          <button onClick={() => router.back()} className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full z-50">
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
