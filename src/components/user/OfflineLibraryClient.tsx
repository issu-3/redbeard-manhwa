'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDownloadStore, DownloadState } from '@/store/download-store';
import { useAppLibraryStore } from '@/store/app-library-store';
import { deleteLocalChapter, pickAndImportPdf, finalizeImport } from '@/lib/native-import';
import { Capacitor } from '@capacitor/core';
import { Trash2, Download, BookOpen, AlertCircle, FilePlus, X, BookmarkCheck } from 'lucide-react';
import Image from 'next/image';
import { ChapterReader } from '@/components/reader/ChapterReader';
import { useRouter } from 'next/navigation';

export function OfflineLibraryClient() {
  const router = useRouter();
  const { downloads } = useDownloadStore();
  const { savedSeries } = useAppLibraryStore();
  const { hasHydrated } = useAppLibraryStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<{
    tempFilename: string;
    inferredSeries: string;
    inferredChapter: string;
    originalFilename: string;
    fileSize: number;
  } | null>(null);

  const [activeChapter, setActiveChapter] = useState<{ chapterId: string, state: DownloadState } | null>(null);

  // Group by series
  const groupedSeries = useMemo(() => {
    const groups: Record<string, { seriesTitle: string; seriesSlug: string; coverImage?: string; chapters: { chapterId: string; state: DownloadState }[]; isSavedLocally?: boolean }> = {};
    
    // Add downloaded chapters first
    Object.entries(downloads || {}).forEach(([chapterId, state]) => {
      if (!state.metadata) return;
      const { seriesId, seriesTitle, seriesSlug, coverImage } = state.metadata;
      
      if (!groups[seriesId]) {
        groups[seriesId] = {
          seriesTitle,
          seriesSlug,
          coverImage,
          chapters: []
        };
      }
      groups[seriesId].chapters.push({ chapterId, state });
    });

    if (Capacitor.isNativePlatform() && mounted) {
      // Overlay saved local library series
      Object.values(savedSeries || {}).forEach(series => {
        if (!groups[series.seriesId]) {
          groups[series.seriesId] = {
            seriesTitle: series.title,
            seriesSlug: series.slug,
            coverImage: series.cachedCoverUri || series.coverImage || undefined,
            chapters: [],
            isSavedLocally: true
          };
        } else {
          groups[series.seriesId].isSavedLocally = true;
          if (series.cachedCoverUri && !groups[series.seriesId].coverImage?.startsWith('http')) {
             // prefer cached cover over http URL if we already set it, or override if the existing is a URL and we have cached
             groups[series.seriesId].coverImage = series.cachedCoverUri;
          } else if (series.cachedCoverUri) {
             groups[series.seriesId].coverImage = series.cachedCoverUri;
          }
        }
      });
    }

    Object.values(groups).forEach(g => {
      g.chapters.sort((a, b) => {
        const numA = Number(a.state.metadata?.chapterNumber) || 0;
        const numB = Number(b.state.metadata?.chapterNumber) || 0;
        return numB - numA; // Descending
      });
    });

    return Object.values(groups).sort((a, b) => (a.seriesTitle || '').localeCompare(b.seriesTitle || ''));
  }, [downloads, savedSeries, mounted]);

  const handleImportClick = async () => {
    if (!Capacitor.isNativePlatform()) {
      alert('Importing files is only available on native Android apps.');
      return;
    }

    try {
      setIsImporting(true);
      const data = await pickAndImportPdf();
      if (data) {
        setImportData(data);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importData) return;

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const seriesTitle = formData.get('seriesTitle') as string;
      const chapterNumber = formData.get('chapterNumber') as string;
      const seriesSlug = seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const seriesId = `local_series_${seriesSlug}`;

      const storeId = `local_${seriesSlug}_${chapterNumber}`;

      if (downloads[storeId] && downloads[storeId].status === 'COMPLETED') {
        const replace = confirm('Chapter already exists offline. Do you want to replace it?');
        if (!replace) return;
        // Delete old one
        await deleteLocalChapter(storeId);
      }

      await finalizeImport(
        importData.tempFilename,
        seriesId,
        seriesTitle,
        seriesSlug,
        chapterNumber,
        undefined, // no actual chapter ID for local
        importData.originalFilename,
        importData.fileSize
      );

      setImportData(null);
    } catch (err: any) {
      alert('Failed to save import: ' + err.message);
    }
  };

  const handleDelete = async (chapterId: string) => {
    if (confirm('Are you sure you want to delete this downloaded file?')) {
      await deleteLocalChapter(chapterId);
    }
  };

  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);

  const handleSeriesClick = (slug: string, title: string, hasChapters: boolean, isSavedLocally?: boolean) => {
    if (hasChapters) {
      setActiveSeriesId(slug || title);
    } else if (isSavedLocally) {
      router.push(`/series/${slug}`);
    }
  };

  const activeGroup = activeSeriesId 
    ? groupedSeries.find(g => (g.seriesSlug || g.seriesTitle) === activeSeriesId) 
    : null;

  if (activeChapter && activeChapter.state.metadata) {
    const { metadata } = activeChapter.state;
    // Mock chapter data to feed to ChapterReader
    const mockChapter = {
      id: activeChapter.chapterId,
      seriesId: metadata.seriesId,
      seriesTitle: metadata.seriesTitle,
      seriesSlug: metadata.seriesSlug,
      number: Number(metadata.chapterNumber) || null,
      label: String(metadata.chapterNumber),
      slug: activeChapter.chapterId,
      totalPages: 1,
      sourceType: metadata.sourceType || 'IMPORTED',
      images: [], 
    };

    return (
      <div className="fixed inset-0 z-[100] bg-background">
        <div className="absolute top-4 left-4 z-[110]">
          <button onClick={() => setActiveChapter(null)} className="p-3 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition">
            <X className="h-6 w-6" />
          </button>
        </div>
        <ChapterReader 
          chapter={mockChapter as any} 
          comments={[]} 
          currentUserId={undefined}
        />
      </div>
    );
  }

  // Handle SSR hydration mismatch on native platform check
  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-[80px]">
      {!activeSeriesId && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">Library</h1>
            {Capacitor.isNativePlatform() && (
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="flex items-center gap-2 bg-primary px-4 py-2 rounded-xl text-white font-bold hover:bg-primary-hover transition disabled:opacity-50"
              >
                <FilePlus className="h-5 w-5" />
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            )}
          </div>

          {!Capacitor.isNativePlatform() && (
            <div className="flex items-center gap-3 bg-warning/10 text-warning p-4 rounded-xl">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Offline library and import features are only available in the native app.</p>
            </div>
          )}
        </div>
      )}

      {activeSeriesId && activeGroup ? (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveSeriesId(null)} 
            className="text-text-secondary hover:text-text-primary font-bold flex items-center gap-2 transition"
          >
            ← Back to Library
          </button>
          
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border/50">
            <div className="w-28 h-40 bg-card rounded-md overflow-hidden relative shadow-sm shrink-0">
              {activeGroup.coverImage ? (
                <Image src={activeGroup.coverImage} alt={activeGroup.seriesTitle} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary leading-tight mb-2">{activeGroup.seriesTitle}</h2>
              <p className="text-sm font-medium text-text-secondary">{activeGroup.chapters.length} chapters downloaded</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {activeGroup.chapters.map(({ chapterId, state }) => {
              const meta = state.metadata;
              if (!meta) return null;

              return (
                <div key={chapterId} className="flex items-center justify-between bg-card p-4 rounded-xl border border-border hover:border-primary/50 transition-colors">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setActiveChapter({ chapterId, state })}
                  >
                    <h3 className="font-bold text-text-primary mb-1">Chapter {meta.chapterNumber}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${meta.sourceType === 'IMPORTED' ? 'bg-accent/20 text-accent' : 'bg-green-500/20 text-green-500'}`}>
                        {meta.sourceType === 'IMPORTED' ? 'Imported' : 'Downloaded'}
                      </span>
                      {meta.fileSize && <span>{(meta.fileSize / 1024 / 1024).toFixed(2)} MB</span>}
                      <span>• {new Date(state.completedAt || state.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(chapterId)}
                    className="p-3 text-text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors ml-2"
                    title="Delete from device"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {!hasHydrated ? (
            <div className="text-center py-20 text-text-secondary">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm font-medium">Loading library...</p>
            </div>
          ) : groupedSeries.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Your offline library is empty</p>
              <p className="text-sm mt-2">Download chapters or save series to your device.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {groupedSeries.map(group => (
                <div 
                  key={group.seriesTitle} 
                  onClick={() => handleSeriesClick(group.seriesSlug, group.seriesTitle, group.chapters.length > 0, group.isSavedLocally)}
                  className="group cursor-pointer rounded-xl overflow-hidden bg-surface border border-border shadow-sm hover:border-primary transition-all relative"
                >
                  <div className="aspect-[2/3] w-full relative bg-card">
                    {group.coverImage ? (
                      <Image src={group.coverImage} alt={group.seriesTitle} fill className="object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <BookOpen className="h-8 w-8" />
                      </div>
                    )}
                    {group.isSavedLocally && group.chapters.length === 0 && (
                      <div className="absolute top-2 right-2 bg-primary/90 text-white p-1.5 rounded-full shadow-md z-10">
                        <BookmarkCheck className="w-4 h-4 fill-current" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                      <h2 className="text-white font-bold text-sm sm:text-base line-clamp-2 leading-tight">{group.seriesTitle}</h2>
                      <p className="text-xs font-medium text-text-secondary mt-1">
                        {group.chapters.length > 0 ? `${group.chapters.length} chapters` : 'Saved locally'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {importData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              Import Chapter
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              File: <span className="text-text-primary font-mono">{importData.originalFilename}</span>
            </p>
            
            <form onSubmit={handleSaveImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Series Title</label>
                <input 
                  type="text" 
                  name="seriesTitle" 
                  defaultValue={importData.inferredSeries} 
                  required
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Chapter Number</label>
                <input 
                  type="text" 
                  name="chapterNumber" 
                  defaultValue={importData.inferredChapter} 
                  required
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setImportData(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-text-primary font-medium hover:bg-card transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
                >
                  Save Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
