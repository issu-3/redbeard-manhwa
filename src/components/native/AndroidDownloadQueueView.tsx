'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Pause, Play, X, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { nativeUserId } from '@/components/native/NativeInitializer';
import { Capacitor } from '@capacitor/core';

interface DownloadItem {
  id: string;
  serverChapterId: string;
  seriesTitle: string;
  title: string;
  chapterNumber: string;
  seriesCover: string | null;
  downloadState: 'PENDING' | 'DOWNLOADING' | 'PAUSED' | 'DOWNLOADED' | 'IDLE';
  progress?: number;
}

export function AndroidDownloadQueueView() {
  const router = useRouter();
  const { data: session } = useSession();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeUserId = Capacitor.isNativePlatform() ? nativeUserId : session?.user?.id;
    if (activeUserId) {
      loadQueue(activeUserId);
      // In a real app, this would subscribe to a Capacitor event listener or native download manager
      const interval = setInterval(() => loadQueue(activeUserId), 3000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  const loadQueue = async (userId: string) => {
    if (!userId) return;
    try {
      const queue = await SeriesRepository.getDownloadQueue(userId);
      
      // Map SQLite chapters to DownloadItem
      const items = queue.map(q => ({
        id: q.id,
        serverChapterId: q.serverChapterId,
        seriesTitle: q.seriesTitle || 'Unknown Series',
        title: q.title || `Chapter ${q.chapterNumber}`,
        chapterNumber: String(q.chapterNumber),
        seriesCover: q.seriesCover,
        downloadState: q.downloadState,
        // Mock progress for DOWNLOADING state
        progress: q.downloadState === 'DOWNLOADING' ? Math.floor(Math.random() * 80) + 10 : 0
      }));
      
      setDownloads(items as DownloadItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async (item: DownloadItem) => {
    const activeUserId = Capacitor.isNativePlatform() ? nativeUserId : session?.user?.id;
    if (!activeUserId) return;
    const newState = item.downloadState === 'PAUSED' ? 'PENDING' : 'PAUSED';
    await SeriesRepository.updateDownloadState(activeUserId, item.serverChapterId, newState);
    await loadQueue(activeUserId);
  };

  const handleCancel = async (item: DownloadItem) => {
    const activeUserId = Capacitor.isNativePlatform() ? nativeUserId : session?.user?.id;
    if (!activeUserId) return;
    await SeriesRepository.updateDownloadState(activeUserId, item.serverChapterId, 'IDLE');
    await loadQueue(activeUserId);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-surface pt-[env(safe-area-inset-top,0px)]">
      {/* App Bar */}
      <div className="flex h-14 items-center gap-4 px-4 border-b border-border-subtle bg-surface/90 backdrop-blur">
        <button 
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-text-primary" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Download queue</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-muted">
            <DownloadCloud className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">No active downloads</p>
            <p className="mt-2 text-sm">Chapters you download will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {downloads.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-white/5">
                {/* Cover */}
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-surface-elevated">
                  {item.seriesCover ? (
                    <Image 
                      src={item.seriesCover} 
                      alt={item.seriesTitle} 
                      fill 
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-surface-elevated text-[10px] text-text-muted">
                      No img
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col overflow-hidden">
                  <h3 className="truncate font-medium text-text-primary">{item.seriesTitle}</h3>
                  <p className="truncate text-sm text-text-muted">{item.title}</p>
                  
                  {/* Progress Bar */}
                  {item.downloadState === 'DOWNLOADING' && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                  )}
                  {item.downloadState === 'PAUSED' && (
                    <p className="mt-1 text-xs font-medium text-orange-500">Paused</p>
                  )}
                  {item.downloadState === 'PENDING' && (
                    <p className="mt-1 text-xs font-medium text-text-muted">Waiting...</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button 
                    onClick={() => handlePauseResume(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-white/10 active:bg-white/20 transition-colors"
                  >
                    {item.downloadState === 'PAUSED' ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleCancel(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-white/10 hover:text-red-500 active:bg-white/20 transition-colors"
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

// Ensure icon is defined since I used it in empty state
import { DownloadCloud } from 'lucide-react';
