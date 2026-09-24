'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, HardDrive, Trash2, Folder, CloudDownload, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useDownloadStore } from '@/store/download-store';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { nativeUserId } from '@/components/native/NativeInitializer';
import { AndroidDownloadQueueView } from './AndroidDownloadQueueView';

type ScreenState = 'main' | 'downloadQueue' | 'downloadedList';

export function AndroidStorageView({ onBack }: { onBack: () => void }) {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('main');

  const [stats, setStats] = useState<{
    totalCount: number;
    totalMB: number;
    failedCount: number;
    seriesStats: { seriesId: string; title: string; count: number; mb: number }[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);

  useEffect(() => {
    const onBackPress = (e: Event) => {
      if (showClearConfirm) {
        e.preventDefault();
        setShowClearConfirm(false);
      } else if (showCacheConfirm) {
        e.preventDefault();
        setShowCacheConfirm(false);
      }
    };
    document.addEventListener('hardwareBackPress', onBackPress);
    return () => document.removeEventListener('hardwareBackPress', onBackPress);
  }, [showClearConfirm, showCacheConfirm]);

  const calculateStorage = useCallback(async () => {
    try {
      setLoading(true);
      let files: any[] = [];
      try {
        const result = await Filesystem.readdir({
          path: 'RedbeardDownloads',
          directory: Directory.Data
        });
        files = result.files;
      } catch (e) {
        // Directory might not exist
      }

      let totalSize = 0;
      const fileSizes: Record<string, number> = {};
      for (const f of files) {
        // files[i].size is in bytes
        const size = f.size || 0;
        totalSize += size;
        fileSizes[f.name] = size;
      }

      const store = useDownloadStore.getState();
      const allDownloads = Object.values(store.downloads);
      const completed = allDownloads.filter(d => d.status === 'COMPLETED');
      const failed = allDownloads.filter(d => d.status === 'FAILED');

      const seriesMap = new Map<string, { title: string; count: number; bytes: number }>();

      for (const dl of completed) {
        if (!dl.metadata) continue;
        const { seriesId, seriesTitle, filename } = dl.metadata;
        const size = fileSizes[filename] || 0;

        if (!seriesMap.has(seriesId)) {
          seriesMap.set(seriesId, { title: seriesTitle, count: 0, bytes: 0 });
        }
        const entry = seriesMap.get(seriesId)!;
        entry.count += 1;
        entry.bytes += size;
      }

      setStats({
        totalCount: completed.length,
        totalMB: Number((totalSize / (1024 * 1024)).toFixed(1)),
        failedCount: failed.length,
        seriesStats: Array.from(seriesMap.entries()).map(([id, val]) => ({
          seriesId: id,
          title: val.title,
          count: val.count,
          mb: Number((val.bytes / (1024 * 1024)).toFixed(1))
        })).sort((a, b) => b.mb - a.mb)
      });
    } catch (e) {
      console.error('Storage calc error:', e);
      setStats({ totalCount: 0, totalMB: 0, failedCount: 0, seriesStats: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentScreen === 'main') {
      calculateStorage();
    }
  }, [currentScreen, calculateStorage]);

  const handleClearAllDownloads = async () => {
    const userId = nativeUserId || 'guest';
    const store = useDownloadStore.getState();
    const allDownloads = Object.values(store.downloads).filter(d => d.status === 'COMPLETED');

    for (const dl of allDownloads) {
      if (!dl.metadata) continue;
      const { chapterId, filename } = dl.metadata;
      try {
        await Filesystem.deleteFile({
          path: `RedbeardDownloads/${filename}`,
          directory: Directory.Data
        });
      } catch (e) {}
      store.clearDownload(chapterId!);
      await SeriesRepository.updateDownloadState(userId, String(chapterId), 'IDLE');
    }
    
    setShowClearConfirm(false);
    await calculateStorage();
  };

  const handleClearCache = async () => {
    // Clear image cache or fetch cache, but keep downloads and library intact
    // We can just wipe out caches if there are any specific folders.
    // Assuming there might be a Capacitor cache directory to clear
    try {
      const cacheContents = await Filesystem.readdir({
        path: '',
        directory: Directory.Cache
      });
      for (const f of cacheContents.files) {
        if (f.type === 'directory') {
          await Filesystem.rmdir({ path: f.name, directory: Directory.Cache, recursive: true });
        } else {
          await Filesystem.deleteFile({ path: f.name, directory: Directory.Cache });
        }
      }
    } catch (e) {}
    setShowCacheConfirm(false);
  };

  if (currentScreen === 'downloadQueue') {
    return <AndroidDownloadQueueView onBack={() => setCurrentScreen('main')} />;
  }

  if (currentScreen === 'downloadedList') {
    return <DownloadedChaptersListView onBack={() => setCurrentScreen('main')} onDeleted={calculateStorage} seriesStats={stats?.seriesStats || []} />;
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0D10] pt-[env(safe-area-inset-top,0px)] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="flex h-14 items-center gap-4 px-4 border-b border-white/5 bg-[#0B0D10]/95 backdrop-blur-md">
        <button onClick={onBack} className="rounded-full p-2 -ml-2 active:bg-neutral-800 transition-colors">
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-[20px] font-bold text-white tracking-tight">Storage</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* SUMMARY CARD */}
        <div className="rounded-2xl border border-white/5 bg-[#141517] p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#1C1D20] flex items-center justify-center">
                <CloudDownload className="h-4 w-4 text-neutral-400" />
              </div>
              <span className="text-white font-semibold">Downloaded Chapters</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">{stats ? stats.totalCount : '...'} chapters</div>
              <div className="text-xs text-neutral-500 font-medium">{stats ? stats.totalMB : '...'} MB</div>
            </div>
          </div>
          <div className="h-[1px] w-full bg-white/5" />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#1C1D20] flex items-center justify-center">
                <HardDrive className="h-4 w-4 text-neutral-400" />
              </div>
              <span className="text-white font-semibold">Storage Used</span>
            </div>
            <span className="text-lg font-bold text-white">{stats ? stats.totalMB : '...'} MB</span>
          </div>
          <div className="h-[1px] w-full bg-white/5" />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#1C1D20] flex items-center justify-center">
                <Folder className="h-4 w-4 text-neutral-400" />
              </div>
              <span className="text-white font-semibold">Location</span>
            </div>
            <span className="text-sm font-bold text-neutral-400">Internal Storage</span>
          </div>
        </div>

        {/* DOWNLOADS */}
        <div>
          <h2 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 ml-1">Downloads</h2>
          <div className="rounded-2xl border border-white/5 bg-[#141517] shadow-lg overflow-hidden flex flex-col">
            <MoreItem 
              label="Downloaded Chapters" 
              onClick={() => setCurrentScreen('downloadedList')} 
              icon={<Folder className="h-[20px] w-[20px]" />}
            />
            <div className="h-[1px] w-full bg-white/5 ml-14" />
            <MoreItem 
              label="Download Queue" 
              onClick={() => setCurrentScreen('downloadQueue')}
              icon={<CloudDownload className="h-[20px] w-[20px]" />}
            />
            {stats && stats.failedCount > 0 && (
              <>
                <div className="h-[1px] w-full bg-white/5 ml-14" />
                <div className="flex items-center justify-between p-4 bg-[#141517]">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-500">
                       <AlertTriangle className="h-5 w-5" />
                     </div>
                     <span className="text-white font-semibold">Failed Downloads</span>
                  </div>
                  <span className="text-sm font-bold text-red-500">{stats.failedCount}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* STORAGE MANAGEMENT */}
        <div>
          <h2 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 ml-1">Storage Management</h2>
          <div className="rounded-2xl border border-white/5 bg-[#141517] shadow-lg overflow-hidden flex flex-col">
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-between p-4 hover:bg-[#1A1C1F] active:bg-[#1C1D20] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white leading-tight">Clear Downloaded Chapters</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Keeps library and progress intact</div>
                </div>
              </div>
            </button>
            <div className="h-[1px] w-full bg-white/5 ml-14" />
            <button 
              onClick={() => setShowCacheConfirm(true)}
              className="flex items-center justify-between p-4 hover:bg-[#1A1C1F] active:bg-[#1C1D20] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[#1C1D20] flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-neutral-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white leading-tight">Clear Cache</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Free up temporary space</div>
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modals */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="bg-[#141517] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Delete all downloads?</h3>
            <p className="text-neutral-400 text-sm mb-6">This will remove all downloaded chapter files from your device. Your library, bookmarks, and reading progress will not be affected.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1C1D20] active:bg-neutral-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearAllDownloads}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#E5092F] active:bg-[#E5092F]/80"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {showCacheConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="bg-[#141517] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Clear cache?</h3>
            <p className="text-neutral-400 text-sm mb-6">This will clear temporary data like cover images. Downloads, library, and progress will not be affected.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCacheConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1C1D20] active:bg-neutral-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearCache}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#E5092F] active:bg-[#E5092F]/80"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadedChaptersListView({ onBack, onDeleted, seriesStats }: { onBack: () => void, onDeleted: () => void, seriesStats: any[] }) {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  if (selectedSeriesId) {
    return <DownloadedSeriesDetailView seriesId={selectedSeriesId} onBack={() => { setSelectedSeriesId(null); onDeleted(); }} />;
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0D10] pt-[env(safe-area-inset-top,0px)]">
      <header className="flex h-14 items-center gap-4 px-4 border-b border-white/5 bg-[#0B0D10]/95 backdrop-blur-md">
        <button onClick={onBack} className="rounded-full p-2 -ml-2 active:bg-neutral-800 transition-colors">
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-[20px] font-bold text-white tracking-tight">Downloaded Series</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {seriesStats.length === 0 ? (
          <div className="text-center text-neutral-500 py-10">
            <Folder className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-white">No downloaded series</p>
          </div>
        ) : (
          seriesStats.map(s => (
            <button
              key={s.seriesId}
              onClick={() => setSelectedSeriesId(s.seriesId)}
              className="w-full text-left bg-[#141517] border border-white/5 rounded-2xl p-4 flex items-center justify-between active:bg-[#1A1C1F] transition-colors"
            >
              <div>
                <h3 className="font-bold text-white leading-tight mb-1">{s.title}</h3>
                <p className="text-xs text-neutral-400 font-medium">{s.count} chapters • {s.mb} MB</p>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-500" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DownloadedSeriesDetailView({ seriesId, onBack }: { seriesId: string, onBack: () => void }) {
  const [chapters, setChapters] = useState<{ chapterId: string; title: string; number: string | number; size: number; filename: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChapters = useCallback(async () => {
    const store = useDownloadStore.getState();
    const allDownloads = Object.values(store.downloads).filter(d => d.status === 'COMPLETED' && d.metadata?.seriesId === seriesId);
    
    try {
      const result = await Filesystem.readdir({ path: 'RedbeardDownloads', directory: Directory.Data });
      const fileSizes: Record<string, number> = {};
      for (const f of result.files) fileSizes[f.name] = f.size || 0;

      const items = allDownloads.map(d => ({
        chapterId: String(d.metadata?.chapterId || d.metadata?.chapterNumber), // fallback if chapterId missing
        title: `Chapter ${d.metadata?.chapterNumber}`,
        number: d.metadata?.chapterNumber || 0,
        filename: d.metadata?.filename || '',
        size: fileSizes[d.metadata?.filename || ''] || 0
      })).sort((a, b) => Number(b.number) - Number(a.number));

      setChapters(items);
    } catch(e) {
       console.error(e);
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const handleDelete = async (chapter: any) => {
    const userId = nativeUserId || 'guest';
    const store = useDownloadStore.getState();
    
    try {
      await Filesystem.deleteFile({ path: `RedbeardDownloads/${chapter.filename}`, directory: Directory.Data });
    } catch(e) {}
    
    // Find exact state object to get actual chapterId used in store (which is serverChapterId)
    const dlState = Object.entries(store.downloads).find(([k, v]) => v.metadata?.filename === chapter.filename);
    if (dlState) {
       store.clearDownload(dlState[0]);
       await SeriesRepository.updateDownloadState(userId, dlState[0], 'IDLE');
    }
    
    await loadChapters();
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0D10] pt-[env(safe-area-inset-top,0px)]">
      <header className="flex h-14 items-center gap-4 px-4 border-b border-white/5 bg-[#0B0D10]/95 backdrop-blur-md">
        <button onClick={onBack} className="rounded-full p-2 -ml-2 active:bg-neutral-800 transition-colors">
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <h1 className="text-[20px] font-bold text-white tracking-tight truncate pr-4">Chapters</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chapters.map(c => (
          <div key={c.filename} className="bg-[#141517] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
             <div>
               <h3 className="font-bold text-white">{c.title}</h3>
               <p className="text-xs text-neutral-400 mt-0.5">{(c.size / (1024 * 1024)).toFixed(1)} MB</p>
             </div>
             <button 
               onClick={() => handleDelete(c)}
               className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center active:bg-red-500/20 active:text-red-500 transition-colors"
             >
               <Trash2 className="h-4 w-4 text-neutral-400" />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoreItem({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center justify-between p-4 hover:bg-[#1A1C1F] active:bg-[#1C1D20] transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-neutral-400 group-active:text-[#E5092F] transition-colors flex items-center justify-center h-10 w-10 rounded-full bg-[#1C1D20] group-active:bg-[#E5092F]/10">{icon}</div>
        <span className="font-semibold text-[16px] text-white group-active:text-[#E5092F] transition-colors">{label}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-neutral-600 group-active:text-[#E5092F] transition-colors" />
    </button>
  );
}
