'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Share2, MoreVertical, Download, Bookmark, Play, Check, 
  ChevronDown, ChevronUp, Filter, List, RefreshCcw, FileText, Tags, ExternalLink, X, BookOpen, Trash2, FileUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAppLibraryStore } from '@/store/app-library-store';
import { useDownloadStore } from '@/store/download-store';
import { Capacitor } from '@capacitor/core';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { nativeUserId } from '@/components/native/NativeInitializer';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';

type SortOption = 'chapterNumber_desc' | 'chapterNumber_asc' | 'uploadDate_desc' | 'uploadDate_asc';
type DisplayMode = 'compact' | 'comfortable';

export function AndroidSeriesView({ series, chapters, onRefresh, isRefreshing }: { series: any, chapters: any[], onRefresh: () => void, isRefreshing: boolean }) {
  const router = useRouter();
  const { savedSeries, addToLibrary, removeFromLibrary, saveChaptersToLibrary, activeUserId } = useAppLibraryStore();
  const { downloads, queueDownload } = useDownloadStore();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [localChapters, setLocalChapters] = useState<Record<string, any>>({});
  
  // Preferences state
  const [sortOption, setSortOption] = useState<SortOption>('chapterNumber_desc');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('comfortable');
  
  // Filter state
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterDownloaded, setFilterDownloaded] = useState(false);

  // Notes & Categories state from SQLite
  const [notes, setNotes] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Modals / Sheets state
  const [activeSheet, setActiveSheet] = useState<'filter' | 'sort' | 'display' | 'more' | 'notes' | 'categories' | 'chapterMenu' | null>(null);

  useEffect(() => {
    const onBackPress = (e: Event) => {
      if (activeSheet) {
        e.preventDefault();
        setActiveSheet(null);
      }
    };
    document.addEventListener('hardwareBackPress', onBackPress);
    return () => document.removeEventListener('hardwareBackPress', onBackPress);
  }, [activeSheet]);

  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftCategories, setDraftCategories] = useState('');

  // Check if series is in library by either exact ID match or slug match (to handle legacy ghost IDs)
  const savedSeriesEntry = savedSeries[series.id] || Object.values(savedSeries).find((s: any) => s.slug === series.slug);
  const inLibrary = !!savedSeriesEntry;
  const localSeriesId = savedSeriesEntry ? savedSeriesEntry.seriesId : series.id;

  // Load preferences
  useEffect(() => {
    const loadPrefs = async () => {
      const { value: sortVal } = await Preferences.get({ key: 'series_sort_option' });
      if (sortVal) setSortOption(sortVal as SortOption);
      
      const { value: dispVal } = await Preferences.get({ key: 'series_display_mode' });
      if (dispVal) setDisplayMode(dispVal as DisplayMode);
    };
    loadPrefs();
  }, []);

  const saveSortOption = async (val: SortOption) => {
    setSortOption(val);
    await Preferences.set({ key: 'series_sort_option', value: val });
  };

  const saveDisplayMode = async (val: DisplayMode) => {
    setDisplayMode(val);
    await Preferences.set({ key: 'series_display_mode', value: val });
  };

  // Fetch SQLite data (read states, notes, categories)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const fetchLocalData = async () => {
        const userId = nativeUserId || activeUserId;
        if (!userId) return;
        
        // Chapters
        const sqliteChapters = await SeriesRepository.getChapters(userId, localSeriesId);
        const chapterMap: Record<string, any> = {};
        sqliteChapters.forEach(c => {
          chapterMap[c.serverChapterId] = c;
        });
        setLocalChapters(chapterMap);
        
        // Series Metadata (Notes, Categories)
        const localSeries = await SeriesRepository.getSeries(userId, localSeriesId);
        if (localSeries) {
          setNotes(localSeries.notes || '');
          setCategories(localSeries.categories || []);
        }
      };
      fetchLocalData();
    }
  }, [localSeriesId, activeUserId]);

  const handleToggleLibrary = () => {
    if (inLibrary) {
      removeFromLibrary(localSeriesId);
    } else {
      addToLibrary({
        seriesId: localSeriesId,
        title: series.title,
        slug: series.slug,
        coverImage: series.coverImage,
        author: series.authors?.[0]?.name,
        artist: series.artists?.[0]?.name,
        description: series.synopsis || series.description,
        status: series.status,
        genres: series.genres,
      });
      if (chapters && chapters.length > 0) {
        saveChaptersToLibrary(localSeriesId, chapters);
      }
    }
  };

  const handleDownload = async (chapter: any) => {
    const chapterLabel = chapter.label || chapter.number?.toString() || chapter.title || '1';

    // Immediately show queued status in UI
    queueDownload(chapter.id, {
      seriesId: series.id,
      seriesTitle: series.title,
      seriesSlug: series.slug,
      chapterNumber: chapterLabel,
      chapterId: chapter.id,
      filename: `chapter_${chapterLabel}_${chapter.id}`,
      coverImage: series.coverImage,
      sourceType: chapter.sourceType,
    });

    // Always hit our backend API to let the backend resolve any Terabox or protected links
    const downloadUrl = `/api/chapter/${chapter.id}/download`;

    import('@/lib/native-download').then(({ processDownloadQueue }) => {
      processDownloadQueue(chapter.id, downloadUrl, series.id, series.title, series.slug, chapterLabel);
    });
  };
  const handleOpenWebsite = async () => {
    const url = `https://redbeard.store/series/${series.slug}`;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleImportLocalPdf = async (chapter: any) => {
    const chapterLabel = chapter.label || chapter.number?.toString() || chapter.title || '1';
    
    const onReplaceConfirm = () => new Promise<boolean>((resolve) => {
      if (window.confirm("Replace downloaded PDF?")) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    const onSuccess = () => {
      setActiveSheet(null);
      router.push(`/android-reader?seriesSlug=${series.slug}&chapterSlug=${chapter.slug}&id=${chapter.id}&seriesId=${series.id}`);
    };

    const onError = (msg: string) => {
      alert(msg);
      setActiveSheet(null);
    };

    import('@/lib/native-download').then(({ importLocalPdf }) => {
      importLocalPdf(
        chapter.id,
        series.id,
        series.title,
        series.slug,
        chapterLabel,
        onReplaceConfirm,
        onSuccess,
        onError
      );
    });
  };
  
  const handleShare = async () => {
    const url = `https://redbeard.store/series/${series.slug}`;
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title: series.title,
        text: `Check out ${series.title} on REDBEARD!`,
        url: url,
        dialogTitle: 'Share Series',
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
    setActiveSheet(null);
  };

  const handleSaveNotes = async () => {
    setNotes(draftNotes);
    if (Capacitor.isNativePlatform()) {
      const userId = nativeUserId || activeUserId;
      if (userId) {
        await SeriesRepository.updateNotes(userId, series.id, draftNotes);
      }
    }
    setActiveSheet(null);
  };

  const handleSaveCategories = async () => {
    const cats = draftCategories.split(',').map(c => c.trim()).filter(c => c.length > 0);
    setCategories(cats);
    if (Capacitor.isNativePlatform()) {
      const userId = nativeUserId || activeUserId;
      if (userId) {
        await SeriesRepository.updateCategories(userId, series.id, cats);
      }
    }
    setActiveSheet(null);
  };

  const uniqueChapters = useMemo(() => {
    const map = new Map();
    for (const ch of chapters) {
      if (!map.has(ch.id)) {
        map.set(ch.id, ch);
      }
    }
    return Array.from(map.values());
  }, [chapters]);

  // Merge state & Filter & Sort
  const processedChapters = useMemo(() => {
    let result = uniqueChapters.map(ch => {
      const local = localChapters[ch.id];
      const dl = downloads[ch.id];
      return {
        ...ch,
        isRead: local?.isRead === 1 || local?.isRead === true,
        readAt: local?.readAt,
        downloadState: dl?.status || 'NONE'
      };
    });

    if (filterUnread) {
      result = result.filter(ch => !ch.isRead);
    }
    if (filterDownloaded) {
      result = result.filter(ch => ch.downloadState === 'COMPLETED');
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'chapterNumber_desc': return b.number - a.number;
        case 'chapterNumber_asc': return a.number - b.number;
        case 'uploadDate_desc': return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'uploadDate_asc': return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        default: return 0;
      }
    });

    return result;
  }, [uniqueChapters, localChapters, downloads, filterUnread, filterDownloaded, sortOption]);

  const firstChapterToRead = processedChapters.length > 0 ? processedChapters[processedChapters.length - 1] : null;
  
  // Determine if there is reading progress for resume button
  let resumeChapter = null;
  let lastReadAt = 0;
  for (const ch of uniqueChapters) {
      const local = localChapters[ch.id];
      if (local && local.readAt && local.readAt > lastReadAt) {
          lastReadAt = local.readAt;
          resumeChapter = ch;
      }
  }

  // Render Bottom Sheet Overlay
  const renderBottomSheet = () => {
    if (!activeSheet) return null;

    return (
      <>
        <div 
          className="fixed inset-0 bg-black/60 z-[100] transition-opacity" 
          onClick={() => setActiveSheet(null)}
        />
        <div className="fixed bottom-0 left-0 right-0 bg-[#1C1C1C] rounded-t-2xl z-[100] flex flex-col max-h-[85dvh] shadow-2xl overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-neutral-800 bg-[#1C1C1C] z-10">
            <h3 className="font-bold text-white capitalize">{activeSheet}</h3>
            <button onClick={() => setActiveSheet(null)} className="p-1 active:bg-neutral-800 rounded-full text-neutral-400">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex flex-col gap-4">
            {activeSheet === 'filter' && (
              <div className="flex flex-col gap-4">
                <label className="flex items-center justify-between p-2 rounded hover:bg-neutral-800 active:bg-neutral-800">
                  <span className="text-white">Unread</span>
                  <input type="checkbox" checked={filterUnread} onChange={e => setFilterUnread(e.target.checked)} className="w-5 h-5 accent-[#E5092F]" />
                </label>
                <label className="flex items-center justify-between p-2 rounded hover:bg-neutral-800 active:bg-neutral-800">
                  <span className="text-white">Downloaded</span>
                  <input type="checkbox" checked={filterDownloaded} onChange={e => setFilterDownloaded(e.target.checked)} className="w-5 h-5 accent-[#E5092F]" />
                </label>
              </div>
            )}

            {activeSheet === 'sort' && (
              <div className="flex flex-col gap-2">
                {[
                  { id: 'chapterNumber_desc', label: 'Chapter number (Newest first)' },
                  { id: 'chapterNumber_asc', label: 'Chapter number (Oldest first)' },
                  { id: 'uploadDate_desc', label: 'Upload date (Newest first)' },
                  { id: 'uploadDate_asc', label: 'Upload date (Oldest first)' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-800 active:bg-neutral-800">
                    <input 
                      type="radio" 
                      name="sort"
                      checked={sortOption === opt.id}
                      onChange={() => saveSortOption(opt.id as SortOption)}
                      className="w-5 h-5 accent-[#E5092F]"
                    />
                    <span className="text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {activeSheet === 'display' && (
              <div className="flex flex-col gap-2">
                {[
                  { id: 'comfortable', label: 'Comfortable (Default)' },
                  { id: 'compact', label: 'Compact' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-800 active:bg-neutral-800">
                    <input 
                      type="radio" 
                      name="display"
                      checked={displayMode === opt.id}
                      onChange={() => saveDisplayMode(opt.id as DisplayMode)}
                      className="w-5 h-5 accent-[#E5092F]"
                    />
                    <span className="text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {activeSheet === 'more' && (
              <div className="flex flex-col gap-1">
                <button onClick={() => { setActiveSheet(null); onRefresh(); }} className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left">
                  <RefreshCcw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                  <span>Refresh</span>
                </button>
                <button onClick={handleShare} className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left">
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
                <button onClick={() => { setDraftNotes(notes); setActiveSheet('notes'); }} className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left">
                  <FileText className="h-5 w-5" />
                  <span>Notes</span>
                </button>
                <button onClick={() => { setDraftCategories(categories.join(', ')); setActiveSheet('categories'); }} className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left">
                  <Tags className="h-5 w-5" />
                  <span>Edit Categories</span>
                </button>
              </div>
            )}

            {activeSheet === 'notes' && (
              <div className="flex flex-col gap-4">
                <textarea 
                  value={draftNotes} 
                  onChange={e => setDraftNotes(e.target.value)} 
                  placeholder="Add notes for this series..."
                  className="w-full h-32 bg-neutral-900 text-white p-3 rounded outline-none border border-neutral-700 focus:border-[#E5092F] resize-none"
                />
                <button onClick={handleSaveNotes} className="bg-[#E5092F] text-white py-3 rounded font-bold">Save Notes</button>
              </div>
            )}
            
            {activeSheet === 'categories' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-neutral-400">Enter categories separated by commas.</p>
                <input 
                  type="text"
                  value={draftCategories} 
                  onChange={e => setDraftCategories(e.target.value)} 
                  placeholder="e.g. Action, Reading, Favorites"
                  className="w-full bg-neutral-900 text-white p-3 rounded outline-none border border-neutral-700 focus:border-[#E5092F]"
                />
                <button onClick={handleSaveCategories} className="bg-[#E5092F] text-white py-3 rounded font-bold">Save Categories</button>
              </div>
            )}

            {activeSheet === 'chapterMenu' && selectedChapter && (
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => {
                    setActiveSheet(null);
                    router.push(`/android-reader?seriesSlug=${series.slug}&chapterSlug=${selectedChapter.slug}&id=${selectedChapter.id}&seriesId=${series.id}`);
                  }}
                  className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left"
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Read Chapter</span>
                </button>
                {selectedChapter.downloadState === 'COMPLETED' ? (
                  <button 
                    onClick={() => {
                      import('@/lib/native-download').then(({ deleteDownloadedChapter }) => {
                        deleteDownloadedChapter(selectedChapter.id).then(() => {
                          setActiveSheet(null);
                        });
                      });
                    }}
                    className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Delete Downloaded File</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setActiveSheet(null);
                      handleDownload(selectedChapter);
                    }}
                    className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Chapter</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    handleImportLocalPdf(selectedChapter);
                  }}
                  className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left"
                >
                  <FileUp className="h-5 w-5" />
                  <span>Import Local PDF</span>
                </button>
                <button 
                  onClick={async () => {
                    setActiveSheet(null);
                    const url = `https://redbeard.store/series/${series.slug}/chapter/${selectedChapter.slug}`;
                    if (Capacitor.isNativePlatform()) {
                      await Share.share({
                        title: selectedChapter.label || `Chapter ${selectedChapter.number}`,
                        text: `Check out ${selectedChapter.label || `Chapter ${selectedChapter.number}`} of ${series.title} on REDBEARD!`,
                        url: url,
                        dialogTitle: 'Share Chapter',
                      });
                    } else {
                      navigator.clipboard.writeText(url);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="flex items-center gap-4 p-3 rounded hover:bg-neutral-800 active:bg-neutral-800 text-white w-full text-left"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share Chapter</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0B0D10] text-gray-100 relative overflow-hidden">
      {/* ── App Bar ────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-transparent flex items-center justify-between px-2 py-[env(safe-area-inset-top,0px)] transition-colors duration-300">
        <div className="px-2 py-3 flex items-center justify-between w-full">
        <button
          onClick={() => router.back()}
          className="p-2 bg-black/40 backdrop-blur rounded-full text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveSheet('more')} className="p-2 bg-black/40 backdrop-blur rounded-full text-white">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
        </div>
      </header>

      {/* ── Scrollable Content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        {/* ── Hero Banner ────────────────────────────────────── */}
        <div className="relative pt-[25%] pb-4 px-4 w-full shrink-0 flex flex-col items-center">
          <div className="absolute inset-0 overflow-hidden bg-black">
            <Image
              src={series.bannerImage || series.coverImage || ''}
              alt={series.title}
              fill
              className="object-cover blur-[50px] opacity-40 scale-150"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D10]/20 via-[#0B0D10]/80 to-[#0B0D10]" />
          </div>
          
          <div className="relative z-10 w-32 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl shadow-black ring-1 ring-white/10 mb-5">
            {series.coverImage && (
              <Image
                src={series.coverImage}
                alt={series.title}
                fill
                className="object-cover"
              />
            )}
          </div>
          <h1 className="relative z-10 text-[24px] font-black tracking-tight leading-tight text-white text-center drop-shadow-md max-w-[95%] mb-1.5">
            {series.title}
          </h1>
          <p className="relative z-10 text-[13px] font-medium text-neutral-400 text-center mb-4 drop-shadow">
            {series.authors?.[0]?.name || 'Unknown Author'}
          </p>
          <div className="relative z-10 flex items-center justify-center gap-2">
            <span className="text-[10px] tracking-wider uppercase font-bold bg-white/10 backdrop-blur-md px-2.5 py-1 rounded text-white">{series.status || 'UNKNOWN'}</span>
            <span className="text-[10px] tracking-wider uppercase font-bold bg-[#E5092F]/20 backdrop-blur-md px-2.5 py-1 rounded text-[#E5092F]">{series.type || 'MANGA'}</span>
          </div>
        </div>

      {/* ── Action Buttons ──────────────────────────────────── */}
      <div className="px-4 py-2 mt-2 flex gap-3 relative z-10">
        <button
          onClick={handleToggleLibrary}
          className={cn(
            "flex-1 py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95",
            inLibrary 
              ? "bg-[#1C1C1C] text-[#E5092F] ring-1 ring-[#1C1C1C]" 
              : "bg-[#E5092F] text-white"
          )}
        >
          <Bookmark className="h-5 w-5" fill={inLibrary ? "currentColor" : "none"} />
          <span className="text-[13px] font-bold tracking-wide">{inLibrary ? 'In Library' : 'Add to Library'}</span>
        </button>

        <button
          onClick={handleOpenWebsite}
          className="flex-1 bg-[#1C1C1C] text-white py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 ring-1 ring-white/5"
        >
          <ExternalLink className="h-5 w-5" />
          <span className="text-[13px] font-bold tracking-wide">Website</span>
        </button>
      </div>

      {/* ── Info & Description ──────────────────────────────── */}
      <div className="px-4 py-4 relative z-10">
        <div className="flex flex-wrap gap-1.5 mb-5">
          {series.genres?.map((g: any) => (
            <span key={g.slug || g.name} className="px-3 py-1 bg-white/5 text-neutral-300 text-[11px] font-semibold rounded-full border border-white/5">
              {g.name}
            </span>
          ))}
        </div>

        <div
          className="relative text-[13px] text-neutral-300 leading-relaxed font-medium"
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        >
          <div className={cn(
            "transition-all duration-300",
            !isDescriptionExpanded && "line-clamp-3"
          )}>
            {series.synopsis || series.description || 'No description available.'}
          </div>
          {!isDescriptionExpanded && (
            <div className="absolute bottom-0 right-0 bg-gradient-to-l from-[#0B0D10] via-[#0B0D10] to-transparent pl-12 pt-1 text-[#E5092F] font-bold cursor-pointer">
              More
            </div>
          )}
        </div>
      </div>

      {/* ── Chapters ────────────────────────────────────────── */}
      <div className="mt-4">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-[#0B0D10] border-b border-neutral-900 py-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-[15px] font-bold text-white">
              {processedChapters.length} {processedChapters.length === 1 ? 'Chapter' : 'Chapters'}
            </h2>
          </div>
          <div className="flex items-center gap-4 px-4 text-neutral-400">
            <button onClick={() => setActiveSheet('filter')} className={cn("flex items-center gap-1.5 p-1", (filterUnread || filterDownloaded) && "text-[#E5092F]")}>
              <Filter className="h-5 w-5" />
            </button>
            <button onClick={() => setActiveSheet('sort')} className="flex items-center gap-1.5 p-1">
              <List className="h-5 w-5" />
            </button>
            <button onClick={() => setActiveSheet('display')} className="flex items-center gap-1.5 p-1">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          {processedChapters.map(ch => (
            <div
              key={ch.id}
              onClick={() => router.push(`/android-reader?seriesSlug=${series.slug}&chapterSlug=${ch.slug}&id=${ch.id}&seriesId=${series.id}`)}
              className={cn(
                "flex items-center justify-between px-4 border-b border-neutral-900 active:bg-neutral-900 transition-colors",
                displayMode === 'compact' ? "py-2" : "py-3.5",
                ch.isRead ? "opacity-50" : ""
              )}
            >
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    displayMode === 'compact' ? "text-sm font-medium" : "text-[15px] font-semibold",
                    ch.isRead ? "text-neutral-500" : "text-neutral-200"
                  )}>
                    {ch.label || `Chapter ${ch.number}`}
                  </span>
                  {/* NEW Badge if chapter is less than 7 days old */}
                  {!ch.isRead && ch.publishedAt && (new Date().getTime() - new Date(ch.publishedAt).getTime() < 7 * 24 * 60 * 60 * 1000) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E5092F] text-white">NEW</span>
                  )}
                </div>
                {displayMode === 'comfortable' && ch.publishedAt && (
                  <span className="text-xs text-neutral-500">
                    {new Date(ch.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {ch.downloadState === 'COMPLETED' ? (
                  <div className="p-2 text-neutral-500"><Check className="h-5 w-5" /></div>
                ) : ch.downloadState === 'DOWNLOADING' || ch.downloadState === 'QUEUED' ? (
                  <div className="p-2"><div className="w-5 h-5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(ch);
                    }}
                    className="p-2 text-neutral-500 active:text-neutral-300"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChapter(ch);
                    setActiveSheet('chapterMenu');
                  }}
                  className="p-2 -mr-2 text-neutral-500 active:text-neutral-300"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          {processedChapters.length === 0 && (
            <div className="py-12 text-center text-neutral-500">
              No chapters found matching criteria.
            </div>
          )}
        </div>
      </div>
      </main>
      
      {/* Floating Resume / Start Button */}
      {firstChapterToRead && (
        <div className="fixed bottom-4 right-4 z-40">
          <button 
            onClick={() => {
              const target = resumeChapter || firstChapterToRead;
              router.push(`/android-reader?seriesSlug=${series.slug}&chapterSlug=${target.slug}&id=${target.id}&seriesId=${series.id}`);
            }}
            className="bg-[#E5092F] text-white px-6 py-4 rounded-full font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
          >
            <Play className="h-5 w-5" fill="currentColor" />
            {resumeChapter ? 'Resume' : 'Start'}
          </button>
        </div>
      )}

      {renderBottomSheet()}
    </div>
  );
}
