'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Pause, Play, X, Check, Loader2, CloudDownload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SeriesRepository } from '@/lib/sqlite/repository';
import Image from 'next/image';
import { nativeUserId } from '@/components/native/NativeInitializer';
import { Capacitor } from '@capacitor/core';
import { useDownloadStore, DownloadStateStatus } from '@/store/download-store';

interface DownloadItem {
  id: string;
  serverChapterId: string;
  seriesTitle: string;
  title: string;
  chapterNumber: string;
  seriesCover: string | null;
  downloadState: DownloadStateStatus;
  progress?: number;
}

export function AndroidDownloadQueueView({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const downloadsMap = useDownloadStore(state => state.downloads);

  const downloads = Object.entries(downloadsMap)
    .filter(([_, state]) => state.status === 'DOWNLOADING' || state.status === 'QUEUED' || state.status === 'RESOLVING' || state.status === 'VALIDATING')
    .map(([chapterId, state]) => ({
      id: chapterId,
      serverChapterId: chapterId,
      seriesTitle: state.metadata?.seriesTitle || 'Unknown Series',
      title: `Chapter ${state.metadata?.chapterNumber}`,
      chapterNumber: String(state.metadata?.chapterNumber),
      seriesCover: state.metadata?.coverImage || null,
      downloadState: state.status,
      progress: Math.floor((state.progress || 0) * 100)
    }));

  const handlePauseResume = async (item: DownloadItem) => {
    console.log('Pause/resume not fully supported by Capacitor FileTransfer yet');
  };

  const handleCancel = async (item: DownloadItem) => {
    useDownloadStore.getState().markCancelled(item.serverChapterId);
    useDownloadStore.getState().clearDownload(item.serverChapterId);
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0D10] pt-[env(safe-area-inset-top,0px)]">
      {/* App Bar */}
      <div className="flex h-14 items-center gap-4 px-4 border-b border-white/5 bg-[#0B0D10]/95 backdrop-blur-md">
        <button 
          onClick={() => onBack ? onBack() : router.back()}
          className="rounded-full p-2 -ml-2 active:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-[20px] font-bold text-white tracking-tight">Download Queue</h1>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] no-scrollbar">
        {downloads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-neutral-500">
            <CloudDownload className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-lg font-bold text-white">No active downloads</p>
            <p className="mt-2 text-sm">Chapters you download will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {downloads.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 bg-[#1C1C1C] rounded-[14px] border border-white/5 active:scale-[0.98] transition-transform">
                {/* Cover */}
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-neutral-900 shadow-md">
                  {item.seriesCover ? (
                    <Image 
                      src={item.seriesCover} 
                      alt={item.seriesTitle} 
                      fill 
                      className="object-cover"
                      sizes="48px"
                      unoptimized={item.seriesCover.startsWith('file://')}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-neutral-900 text-[10px] text-neutral-600">
                      No img
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col overflow-hidden">
                  <h3 className="truncate font-semibold text-[15px] text-white leading-snug">{item.seriesTitle}</h3>
                  <p className="truncate text-sm text-neutral-400">{item.title}</p>
                  
                  {/* Progress Bar */}
                  {item.downloadState === 'DOWNLOADING' && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                      <div 
                        className="h-full bg-[#E5092F] transition-all duration-300" 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  )}
                  {item.downloadState === 'FAILED' && (
                    <p className="mt-1 text-xs font-bold text-orange-500 uppercase tracking-wide">Failed</p>
                  )}
                  {item.downloadState === 'QUEUED' && (
                    <p className="mt-1 text-xs font-bold text-neutral-500 uppercase tracking-wide">Waiting...</p>
                  )}
                  {item.downloadState === 'RESOLVING' && (
                    <p className="mt-1 text-xs font-bold text-blue-400 uppercase tracking-wide">Resolving...</p>
                  )}
                  {item.downloadState === 'VALIDATING' && (
                    <p className="mt-1 text-xs font-bold text-amber-400 uppercase tracking-wide">Validating...</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button 
                    onClick={() => handlePauseResume(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-800 transition-colors"
                  >
                    {item.downloadState === 'FAILED' || item.downloadState === 'CANCELLED' ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleCancel(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-800 active:text-[#E5092F] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

