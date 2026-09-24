'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDownloadStore, DownloadState } from '@/store/download-store';
import { useAppLibraryStore } from '@/store/app-library-store';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Search, Filter, MoreVertical, Download, ArrowLeft, CheckCircle2, Circle, List, Grid, LayoutGrid, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { STATUS_OPTIONS } from '@/lib/constants';

type FilterState = {
  status: string;
  downloads: string;
  genres: string[];
};

const DEFAULT_FILTERS: FilterState = {
  status: 'All',
  downloads: 'All',
  genres: [],
};

type SortOption = 'added_desc' | 'updated_desc' | 'title_asc' | 'title_desc';
type DisplayOption = 'grid' | 'compact' | 'list';

export function AndroidLibraryView() {
  const router = useRouter();
  const { downloads } = useDownloadStore();
  const { savedSeries, hasHydrated, activeUserId, hydrateLibrary, removeFromLibrary } = useAppLibraryStore();
  const [mounted, setMounted] = useState(false);

  // Search State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter State
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTERS);
  const [tempFilterState, setTempFilterState] = useState<FilterState>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<Set<string>>(new Set());

  // Sort & Display
  const [sortOption, setSortOption] = useState<SortOption>('added_desc');
  const [displayOption, setDisplayOption] = useState<DisplayOption>('grid');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);

  useEffect(() => {
    const onBackPress = (e: Event) => {
      if (isFilterOpen) {
        e.preventDefault();
        setIsFilterOpen(false);
      } else if (isSortOpen) {
        e.preventDefault();
        setIsSortOpen(false);
      } else if (isDisplayOpen) {
        e.preventDefault();
        setIsDisplayOpen(false);
      } else if (isMenuOpen) {
        e.preventDefault();
        setIsMenuOpen(false);
      } else if (isSelectionMode) {
        e.preventDefault();
        setIsSelectionMode(false);
        setSelectedSeriesIds(new Set());
      } else if (isSearchMode) {
        e.preventDefault();
        setIsSearchMode(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('hardwareBackPress', onBackPress);
    return () => document.removeEventListener('hardwareBackPress', onBackPress);
  }, [isFilterOpen, isSortOpen, isDisplayOpen, isMenuOpen, isSelectionMode, isSearchMode]);

  useEffect(() => {
    setMounted(true);
    if (Capacitor.isNativePlatform()) {
      Preferences.get({ key: 'android_library_filter' }).then(({ value }) => {
        if (value) {
          try {
            const saved = JSON.parse(value);
            setFilterState(saved);
            setTempFilterState(saved);
          } catch (e) {}
        }
      });
      Preferences.get({ key: 'android_library_sort' }).then(({ value }) => {
        if (value) setSortOption(value as SortOption);
      });
      Preferences.get({ key: 'android_library_display' }).then(({ value }) => {
        if (value) setDisplayOption(value as DisplayOption);
      });
    }
  }, []);

  const handleSortChange = (opt: SortOption) => {
    setSortOption(opt);
    setIsSortOpen(false);
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'android_library_sort', value: opt });
    }
  };

  const handleDisplayChange = (opt: DisplayOption) => {
    setDisplayOption(opt);
    setIsDisplayOpen(false);
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'android_library_display', value: opt });
    }
  };

  const handleRefresh = async () => {
    if (activeUserId) {
      await hydrateLibrary(activeUserId);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedSeriesIds.size === 0) return;
    const confirm = window.confirm(`Are you sure you want to remove ${selectedSeriesIds.size} series from your library?`);
    if (confirm) {
      for (const id of Array.from(selectedSeriesIds)) {
        await removeFromLibrary(id);
      }
      setSelectedSeriesIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedSeriesIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSeriesIds(newSet);
  };

  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    Object.values(savedSeries || {}).forEach(series => {
      if (series.genres && Array.isArray(series.genres)) {
        series.genres.forEach((g: any) => {
          if (typeof g === 'string') genresSet.add(g);
          else if (g && g.name) genresSet.add(g.name);
        });
      }
    });
    return Array.from(genresSet).sort();
  }, [savedSeries]);

  const libraryItems = useMemo(() => {
    const items: Record<string, {
      seriesId: string;
      title: string;
      slug: string;
      coverImage?: string;
      downloadedCount: number;
      unreadCount: number;
      status?: string | null;
      genres?: string[];
      addedAt: number;
      updatedAt: number;
    }> = {};

    if (Capacitor.isNativePlatform() && mounted) {
      Object.values(savedSeries || {}).forEach(series => {
        let genresArray: string[] = [];
        if (Array.isArray(series.genres)) {
          genresArray = series.genres.map((g: any) => g.name || g);
        }

        items[series.seriesId] = {
          seriesId: series.seriesId,
          title: series.title,
          slug: series.slug,
          coverImage: series.cachedCoverUri || series.coverImage || undefined,
          downloadedCount: 0,
          unreadCount: 0,
          status: series.status || null,
          genres: genresArray,
          addedAt: series.addedAt || 0,
          updatedAt: series.updatedAt || 0,
        };
      });
    }

    Object.entries(downloads || {}).forEach(([chapterId, state]) => {
      if (!state.metadata) return;
      const { seriesId, seriesTitle, seriesSlug, coverImage } = state.metadata;

      if (!items[seriesId]) {
        items[seriesId] = {
          seriesId,
          title: seriesTitle,
          slug: seriesSlug,
          coverImage,
          downloadedCount: 0,
          unreadCount: 0,
          status: null,
          genres: [],
          addedAt: 0,
          updatedAt: 0,
        };
      }

      if (state.status === 'COMPLETED') {
        items[seriesId].downloadedCount++;
      }
    });

    let filtered = Object.values(items);

    if (isSearchMode && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.title.toLowerCase().includes(q));
    }

    // Apply Filter State
    if (filterState.status !== 'All') {
      filtered = filtered.filter(i => i.status === filterState.status);
    }

    if (filterState.downloads === 'Downloaded') {
      filtered = filtered.filter(i => i.downloadedCount > 0);
    } else if (filterState.downloads === 'Not Downloaded') {
      filtered = filtered.filter(i => i.downloadedCount === 0);
    }

    if (filterState.genres.length > 0) {
      filtered = filtered.filter(i => 
        i.genres && filterState.genres.every(g => i.genres!.includes(g))
      );
    }

    return filtered.sort((a, b) => {
      if (sortOption === 'added_desc') return b.addedAt - a.addedAt;
      if (sortOption === 'updated_desc') return b.updatedAt - a.updatedAt;
      if (sortOption === 'title_desc') return b.title.localeCompare(a.title);
      return a.title.localeCompare(b.title); // title_asc default
    });
  }, [downloads, savedSeries, mounted, isSearchMode, searchQuery, filterState, sortOption]);

  if (!mounted) return null;

  const isFilterActive = filterState.status !== 'All' || filterState.downloads !== 'All' || filterState.genres.length > 0;

  return (
    <div className="h-full w-full bg-[#0B0D10] text-gray-100 overflow-hidden relative">
      {/* Top App Bar */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-[#0B0D10]/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] border-b border-white/5">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          {!isSearchMode && !isSelectionMode ? (
            <>
              <h1 className="text-[22px] font-black tracking-tight leading-none uppercase text-white">
                Library
              </h1>
              <div className="flex items-center gap-4 text-white">
                <button onClick={() => setIsSearchMode(true)} className="active:opacity-70 transition-opacity p-1">
                  <Search className="h-[22px] w-[22px]" />
                </button>
                <button onClick={() => { setTempFilterState(filterState); setIsFilterOpen(true); }} className="active:opacity-70 transition-opacity p-1 relative">
                  <Filter className="h-[22px] w-[22px]" />
                  {isFilterActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-[#E5092F] rounded-full border border-[#0B0D10]" />
                  )}
                </button>
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="active:opacity-70 transition-opacity p-1 -mr-2">
                    <MoreVertical className="h-[22px] w-[22px]" />
                  </button>
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#1c1c1c] border border-neutral-800 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                        <button onClick={() => { setIsMenuOpen(false); setIsSelectionMode(true); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-800 active:bg-neutral-800 transition-colors">Select</button>
                        <button onClick={() => { setIsMenuOpen(false); setIsSortOpen(true); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-800 active:bg-neutral-800 transition-colors">Sort</button>
                        <button onClick={() => { setIsMenuOpen(false); setIsDisplayOpen(true); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-800 active:bg-neutral-800 transition-colors">Display</button>
                        <button onClick={() => { setIsMenuOpen(false); handleRefresh(); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-800 active:bg-neutral-800 transition-colors text-[#E5092F]">Refresh</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : isSelectionMode ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedSeriesIds(new Set());
                  }}
                  className="p-2 -ml-2 text-neutral-300 active:bg-neutral-800 rounded-full"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <span className="text-lg font-bold text-white">{selectedSeriesIds.size} Selected</span>
              </div>
              <div className="flex items-center gap-4 text-white">
                <button 
                  onClick={() => {
                    if (selectedSeriesIds.size === libraryItems.length) {
                      setSelectedSeriesIds(new Set());
                    } else {
                      setSelectedSeriesIds(new Set(libraryItems.map(i => i.seriesId)));
                    }
                  }}
                  className="active:opacity-70 transition-opacity text-sm font-bold uppercase tracking-wider"
                >
                  {selectedSeriesIds.size === libraryItems.length ? 'None' : 'All'}
                </button>
                <button 
                  onClick={handleRemoveSelected}
                  disabled={selectedSeriesIds.size === 0}
                  className={cn("active:opacity-70 transition-opacity p-1 -mr-2", selectedSeriesIds.size > 0 ? "text-[#E5092F]" : "text-neutral-600")}
                >
                  <Trash2 className="h-[22px] w-[22px]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center w-full gap-3">
              <button
                onClick={() => {
                  setIsSearchMode(false);
                  setSearchQuery('');
                }}
                className="p-2 -ml-2 text-neutral-300 active:bg-neutral-800 rounded-full"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex-1 flex items-center bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 shadow-inner">
                <Search className="h-4 w-4 text-neutral-500 mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search library..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white placeholder:text-neutral-500 p-0"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 -mr-1 text-neutral-400 active:text-white rounded-full ml-1">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="h-full overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] no-scrollbar">
        {!hasHydrated ? (
          <div className="flex justify-center py-32">
            <div className="animate-spin w-8 h-8 border-4 border-[#E5092F] border-t-transparent rounded-full" />
          </div>
        ) : libraryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
            <div className="w-16 h-16 mb-6 rounded-full bg-neutral-900 flex items-center justify-center">
              <Search className="h-8 w-8 text-neutral-600" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isSearchMode 
                ? 'No series match your search.' 
                : isFilterActive
                  ? 'No series match your filters.'
                  : 'Your library is empty'}
            </h2>
            <p className="text-neutral-500 text-sm mb-6">
              Browse for new series to add them to your library.
            </p>
            {isFilterActive && (
              <button
                onClick={() => {
                  setFilterState(DEFAULT_FILTERS);
                  setTempFilterState(DEFAULT_FILTERS);
                  if (Capacitor.isNativePlatform()) {
                    Preferences.set({ key: 'android_library_filter', value: JSON.stringify(DEFAULT_FILTERS) });
                  }
                }}
                className="px-6 py-2.5 bg-[#E5092F] rounded-full text-sm font-bold text-white active:opacity-80 transition-opacity shadow-[0_4px_14px_rgba(229,9,47,0.3)]"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className={cn(
            "grid gap-[14px] px-4 pt-4",
            displayOption === 'grid' ? "grid-cols-2" : 
            displayOption === 'compact' ? "grid-cols-3" : 
            "grid-cols-1"
          )}>
            {libraryItems.map(item => {
              const isSelected = selectedSeriesIds.has(item.seriesId);
              
              if (displayOption === 'list') {
                return (
                  <div
                    key={item.seriesId}
                    onClick={(e) => {
                      if (isSelectionMode) toggleSelection(item.seriesId, e);
                      else router.push(`/android-series?slug=${item.slug}`);
                    }}
                    className={cn(
                      "flex gap-3 p-2.5 rounded-[14px] bg-[#1C1C1C] active:scale-[0.98] transition-transform border border-white/5 relative",
                      isSelected && "ring-2 ring-[#E5092F] bg-[#E5092F]/10"
                    )}
                  >
                    {isSelectionMode && (
                      <div className="pr-2 flex items-center">
                        {isSelected ? <CheckCircle2 className="h-6 w-6 text-[#E5092F]" /> : <Circle className="h-6 w-6 text-neutral-600" />}
                      </div>
                    )}
                    <div className="relative w-16 h-[6.5rem] rounded-lg flex-shrink-0 overflow-hidden bg-neutral-900 shadow-md">
                      {item.coverImage ? (
                        <Image src={item.coverImage} alt={item.title} fill sizes="20vw" className="object-cover" unoptimized={item.coverImage.startsWith('file://')} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">No Cover</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h2 className="text-[15px] font-semibold line-clamp-2 leading-snug text-white mb-1.5">{item.title}</h2>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.genres?.slice(0, 2).map((genre, idx) => (
                          <span key={idx} className="text-[9px] font-medium px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-400">
                            {genre}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                        {item.unreadCount > 0 && <span className="text-[#E5092F]">{item.unreadCount} Unread</span>}
                        {item.downloadedCount > 0 && <span className="flex items-center gap-1 text-white"><Download className="w-3 h-3" /> {item.downloadedCount}</span>}
                      </div>
                    </div>
                  </div>
                );
              }

              // Grid / Compact
              return (
                <div
                  key={item.seriesId}
                  onClick={(e) => {
                    if (isSelectionMode) toggleSelection(item.seriesId, e);
                    else router.push(`/android-series?slug=${item.slug}`);
                  }}
                  className="flex flex-col gap-2 active:scale-[0.98] transition-transform relative"
                >
                  <div className={cn(
                    "relative rounded-[14px] overflow-hidden aspect-[4/5] bg-[#1C1C1C] shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-white/5",
                    isSelected && "ring-2 ring-[#E5092F]"
                  )}>
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2 z-10">
                        {isSelected ? (
                          <div className="bg-background rounded-full"><CheckCircle2 className="h-6 w-6 text-[#E5092F]" /></div>
                        ) : (
                          <div className="bg-black/50 rounded-full backdrop-blur-sm"><Circle className="h-6 w-6 text-white/80" /></div>
                        )}
                      </div>
                    )}

                    {item.coverImage ? (
                      <Image
                        src={item.coverImage}
                        alt={item.title}
                        fill
                        sizes="50vw"
                        className="object-cover"
                        unoptimized={item.coverImage.startsWith('file://')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500 text-xs">
                        No Cover
                      </div>
                    )}

                    {/* Top Right Badges */}
                    <div className="absolute top-0 right-0 flex flex-col items-end gap-[1px]">
                      {item.unreadCount > 0 && (
                        <div className="bg-[#E5092F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm">
                          {item.unreadCount} NEW
                        </div>
                      )}
                      {item.downloadedCount > 0 && (
                        <div className="bg-black/70 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm">
                          <Download className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    {/* Selection Overlay */}
                    {isSelected && <div className="absolute inset-0 bg-[#E5092F]/20 pointer-events-none" />}
                  </div>
                  
                  {/* Title and Genres Below Cover (Like Browse) */}
                  <div className="flex flex-col gap-1 px-0.5">
                    <h2 className={cn("text-white font-semibold line-clamp-1 leading-snug", displayOption === 'compact' ? "text-[13px]" : "text-[15px]")}>
                      {item.title}
                    </h2>
                    {displayOption === 'grid' && item.genres && item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.genres.slice(0, 2).map((genre, idx) => (
                          <span 
                            key={idx} 
                            className="text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-neutral-700 text-neutral-400"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Sheet Filter */}
      {isFilterOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[100] transition-opacity" 
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] rounded-t-2xl z-[100] flex flex-col max-h-[85dvh] shadow-2xl">
            {/* Sheet Header - Sticky */}
            <div className="shrink-0 flex items-center justify-between p-4 border-b border-neutral-800 bg-[#1c1c1c] rounded-t-2xl z-10">
              <button 
                onClick={() => setTempFilterState(DEFAULT_FILTERS)}
                className="text-neutral-400 font-medium px-2 py-1 active:bg-neutral-800 rounded transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={() => {
                  setFilterState(tempFilterState);
                  setIsFilterOpen(false);
                  if (Capacitor.isNativePlatform()) {
                    Preferences.set({ key: 'android_library_filter', value: JSON.stringify(tempFilterState) });
                  }
                }}
                className="bg-[#E5092F] text-white font-bold px-6 py-1.5 rounded-full active:opacity-80 transition-opacity"
              >
                Apply
              </button>
            </div>
            
            {/* Sheet Content - Scrollable */}
            <div className="p-4 overflow-y-auto flex flex-col gap-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
              {/* STATUS */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setTempFilterState(prev => ({ ...prev, status: 'All' }))}
                    className={cn("px-4 py-2 rounded-full text-[13px] font-bold border transition-colors", tempFilterState.status === 'All' ? "bg-white text-black border-white" : "border-neutral-700 text-neutral-400 hover:bg-neutral-800")}
                  >
                    All
                  </button>
                  {STATUS_OPTIONS.map(opt => (
                    <button 
                      key={opt.value}
                      onClick={() => setTempFilterState(prev => ({ ...prev, status: opt.value }))}
                      className={cn("px-4 py-2 rounded-full text-[13px] font-bold border transition-colors", tempFilterState.status === opt.value ? "bg-white text-black border-white" : "border-neutral-700 text-neutral-400 hover:bg-neutral-800")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DOWNLOADS */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Downloads</label>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Downloaded', 'Not Downloaded'].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setTempFilterState(prev => ({ ...prev, downloads: opt }))}
                      className={cn("px-4 py-2 rounded-full text-[13px] font-bold border transition-colors", tempFilterState.downloads === opt ? "bg-white text-black border-white" : "border-neutral-700 text-neutral-400 hover:bg-neutral-800")}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* GENRES */}
              {availableGenres.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {availableGenres.map(g => (
                      <button 
                        key={g}
                        onClick={() => setTempFilterState(prev => ({ 
                          ...prev, 
                          genres: prev.genres.includes(g) 
                            ? prev.genres.filter(x => x !== g)
                            : [...prev.genres, g]
                        }))}
                        className={cn("px-4 py-2 rounded-full text-[13px] font-bold border transition-colors", tempFilterState.genres.includes(g) ? "bg-white text-black border-white" : "border-neutral-700 text-neutral-400 hover:bg-neutral-800")}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sort Bottom Sheet */}
      {isSortOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[100]" onClick={() => setIsSortOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] rounded-t-2xl z-[100] flex flex-col pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
            <div className="p-4 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-white">Sort By</h2>
            </div>
            <div className="flex flex-col py-2">
              {[
                { id: 'added_desc', label: 'Recently Added' },
                { id: 'updated_desc', label: 'Recently Updated' },
                { id: 'title_asc', label: 'Title (A to Z)' },
                { id: 'title_desc', label: 'Title (Z to A)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSortChange(opt.id as SortOption)}
                  className="flex items-center gap-3 px-6 py-4 active:bg-neutral-800 transition-colors text-left"
                >
                  <div className="flex-1 text-[15px] font-medium text-white">{opt.label}</div>
                  {sortOption === opt.id && <CheckCircle2 className="h-5 w-5 text-[#E5092F]" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Display Bottom Sheet */}
      {isDisplayOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[100]" onClick={() => setIsDisplayOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] rounded-t-2xl z-[100] flex flex-col pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
            <div className="p-4 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-white">Display Mode</h2>
            </div>
            <div className="flex flex-col py-2">
              {[
                { id: 'grid', label: 'Comfortable Grid', icon: <LayoutGrid className="h-5 w-5" /> },
                { id: 'compact', label: 'Compact Grid', icon: <Grid className="h-5 w-5" /> },
                { id: 'list', label: 'List View', icon: <List className="h-5 w-5" /> },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleDisplayChange(opt.id as DisplayOption)}
                  className="flex items-center gap-4 px-6 py-4 active:bg-neutral-800 transition-colors text-left"
                >
                  <div className="text-neutral-500">{opt.icon}</div>
                  <div className="flex-1 text-[15px] font-medium text-white">{opt.label}</div>
                  {displayOption === opt.id && <CheckCircle2 className="h-5 w-5 text-[#E5092F]" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
