'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings, MoreVertical, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDownloadStore } from '@/store/download-store';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { Capacitor } from '@capacitor/core';
import { Document, Page, pdfjs } from 'react-pdf';
import { nativeUserId } from '@/components/native/NativeInitializer';

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

  const [showUI, setShowUI] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const state = getDownloadState(chapterId);
      if (state.status === 'COMPLETED' && state.localUri) {
        if (Capacitor.isNativePlatform()) {
          const convertedUrl = Capacitor.convertFileSrc(state.localUri);
          setLocalUrl(convertedUrl);
        } else {
          setLocalUrl(state.localUri); // For web testing, if it's a blob url
        }
      } else {
        // Fallback for online reading? For now, we only implement offline PDF as requested.
        console.warn('Chapter is not downloaded. Android Offline Reader requires downloaded PDF.');
      }
      setLoading(false);
    };
    init();
  }, [chapterId, getDownloadState]);

  // Save Progress to SQLite
  useEffect(() => {
    // If not on native, or if we somehow don't have an ID, do nothing.
    // On native, nativeUserId will be either the device guest ID or the authenticated user ID.
    const activeUserId = nativeUserId || 'guest';

    if (!activeUserId || !numPages) return;

    const saveProgress = async () => {
      await SeriesRepository.saveReadState(activeUserId, seriesId, chapterId, true);
    };

    // Save progress periodically or on page change
    const timer = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timer);
  }, [pageNumber, numPages, chapterId, seriesId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleTap = (e: React.MouseEvent) => {
    const width = window.innerWidth;
    const x = e.clientX;

    if (x < width * 0.3) {
      // Left side - previous page
      setPageNumber(prev => Math.max(prev - 1, 1));
    } else if (x > width * 0.7) {
      // Right side - next page
      setPageNumber(prev => numPages ? Math.min(prev + 1, numPages) : prev + 1);
    } else {
      // Center - toggle UI
      setShowUI(!showUI);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!localUrl) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white px-4 text-center">
        <p className="mb-4">This chapter is not downloaded.</p>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-surface px-6 py-2"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden select-none">

      {/* ── Top App Bar ────────────────────────────────────────── */}
      <div
        className={`absolute top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-black/80 px-2 transition-transform duration-300 pt-[env(safe-area-inset-top,0px)] ${showUI ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <button
          onClick={() => router.back()}
          className="p-2 text-white active:bg-white/20 rounded-full"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">{chapterSlug}</span>
          <span className="text-xs text-gray-400">{pageNumber} / {numPages || '?'}</span>
        </div>
        <div className="flex items-center">
          <button className="p-2 text-white active:bg-white/20 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
          <button className="p-2 text-white active:bg-white/20 rounded-full">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Reader Canvas ────────────────────────────────────── */}
      <div
        className="h-full w-full overflow-y-auto"
        onClick={handleTap}
      >
        <Document
          file={localUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          }
          error={
            <div className="flex h-full w-full items-center justify-center">
              Failed to load PDF.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={typeof window !== 'undefined' ? window.innerWidth : undefined}
            className="flex items-center justify-center min-h-screen"
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </div>

      {/* ── Bottom Info Bar ──────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-black/80 px-4 py-2 transition-transform duration-300 pb-[env(safe-area-inset-bottom,0px)] ${showUI ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <span className="text-xs font-medium text-gray-400">
          Page {pageNumber} of {numPages || '?'}
        </span>
      </div>

    </div>
  );
}
