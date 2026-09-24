'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Compass, Loader2, ArrowLeft, Filter, RefreshCcw, WifiOff, X, Grid, MoreVertical, Heart, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SeriesCardData } from '@/types';
import { useDebounce } from '@/hooks';
import { searchSeries } from '@/lib/native/api';
import { TYPE_OPTIONS } from '@/lib/content-types';
import { STATUS_OPTIONS } from '@/lib/constants';
import { Preferences } from '@capacitor/preferences';

const CATEGORIES = [
  { id: 'trending', label: 'Trending', params: { sort: 'popular' } },
  { id: 'latest', label: 'Latest', params: { sort: 'latest' } },
  { id: 'completed', label: 'Completed', params: { status: 'COMPLETED' } },
  { id: 'ongoing', label: 'Ongoing', params: { status: 'ONGOING' } },
];

export function AndroidBrowseView() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  // Display Mode & Menus
  const [displayMode, setDisplayMode] = useState<'2-col' | '3-col'>('2-col');
  const [isGridMenuOpen, setIsGridMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    Preferences.get({ key: 'browse_display_mode' }).then(({ value }) => {
      if (value === '3-col') setDisplayMode('3-col');
    });
  }, []);

  const changeDisplayMode = async (mode: '2-col' | '3-col') => {
    setDisplayMode(mode);
    setIsGridMenuOpen(false);
    await Preferences.set({ key: 'browse_display_mode', value: mode });
  };

  // Search Mode State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Filter State (Applied)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Draft Filter State
  const [draftCategory, setDraftCategory] = useState(CATEGORIES[0]);
  const [draftGenre, setDraftGenre] = useState('');
  const [draftType, setDraftType] = useState('');
  const [draftStatus, setDraftStatus] = useState('');

  // Genres Data
  const [genres, setGenres] = useState<{name: string, slug: string}[]>([]);

  useEffect(() => {
    const onBackPress = (e: Event) => {
      if (isFilterOpen) {
        e.preventDefault();
        setIsFilterOpen(false);
      } else if (isMoreMenuOpen) {
        e.preventDefault();
        setIsMoreMenuOpen(false);
      } else if (isGridMenuOpen) {
        e.preventDefault();
        setIsGridMenuOpen(false);
      } else if (isSearchMode) {
        e.preventDefault();
        setIsSearchMode(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('hardwareBackPress', onBackPress);
    return () => document.removeEventListener('hardwareBackPress', onBackPress);
  }, [isFilterOpen, isMoreMenuOpen, isGridMenuOpen, isSearchMode]);

  useEffect(() => {
    import('@/lib/native/api').then(({ nativeFetch }) => {
      nativeFetch('/api/genres')
        .then(res => res.json())
        .then(json => {
          if (json.success) setGenres(json.data);
        })
        .catch(console.error);
    });
  }, []);

  const openFilter = () => {
    setDraftCategory(activeCategory);
    setDraftGenre(genreFilter);
    setDraftType(typeFilter);
    setDraftStatus(statusFilter);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setActiveCategory(draftCategory);
    setGenreFilter(draftGenre);
    setTypeFilter(draftType);
    setStatusFilter(draftStatus);
    setIsFilterOpen(false);
  };

  // Data State
  const [results, setResults] = useState<SeriesCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [errorState, setErrorState] = useState<'none' | 'network' | 'api'>('none');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
        setErrorState('none');
      }

      const params = new URLSearchParams();
      params.append('limit', '20');

      const currentSkip = isLoadMore ? skip : 0;
      params.append('skip', currentSkip.toString());

      if (isSearchMode && debouncedSearchQuery.trim()) {
        params.append('q', debouncedSearchQuery.trim());
      } else if (isSearchMode && !debouncedSearchQuery.trim()) {
        // Search mode but empty query
        setResults([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      // Category base params
      const categoryParams = { ...activeCategory.params };

      // Overrides
      if (statusFilter) {
         delete (categoryParams as any).status; // user dropdown overrides category status
      }

      // Apply category params
      Object.entries(categoryParams).forEach(([k, v]) => {
        params.append(k, v as string);
      });

      // Apply Filters
      if (genreFilter) params.append('genre', genreFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await searchSeries(params);
      
      if (!res.ok) {
        throw new Error('API Error');
      }

      const json = await res.json();

      if (json.success) {
        if (isLoadMore) {
          setResults(prev => {
            const merged = [...prev, ...json.data];
            return Array.from(new Map(merged.map(item => [item.id, item])).values());
          });
        } else {
          setResults(json.data);
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        }
        setHasMore(json.data.length === 20);
        setSkip(currentSkip + 20);
      } else {
        throw new Error('API Error');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Network failure') {
        setErrorState('network');
      } else {
        setErrorState('api');
      }
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [activeCategory, isSearchMode, debouncedSearchQuery, skip, genreFilter, typeFilter, statusFilter]);

  // Initial load & dependencies change
  useEffect(() => {
    setSkip(0);
    setHasMore(true);
    fetchResults(false);
  }, [activeCategory, isSearchMode, debouncedSearchQuery, genreFilter, typeFilter, statusFilter]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading && !isFetchingMore && errorState === 'none') {
      fetchResults(true);
    }
  };

  const resetFilters = () => {
    setDraftCategory(CATEGORIES[0]);
    setDraftGenre('');
    setDraftType('');
    setDraftStatus('');
    
    setActiveCategory(CATEGORIES[0]);
    setGenreFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setSearchQuery('');
    setIsSearchMode(false);
    setIsFilterOpen(false);
  };

  const renderContent = () => {
    if (isLoading && results.length === 0) {
      return (
        <div className="grid grid-cols-2 gap-[14px] px-4 pb-[100px]">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="w-full aspect-[4/5] bg-neutral-900 rounded-[14px]" />
              <div className="flex flex-col gap-1 px-1 mt-1">
                <div className="h-4 bg-neutral-900 rounded w-full" />
                <div className="flex gap-1 mt-1">
                  <div className="h-3 bg-neutral-900 rounded w-12" />
                  <div className="h-3 bg-neutral-900 rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (errorState === 'network' && results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <WifiOff className="h-16 w-16 mb-6 text-neutral-600" />
          <h2 className="text-xl font-bold text-white mb-2">You're offline</h2>
          <p className="text-neutral-400 mb-6 text-sm">Check your internet connection and try again.</p>
          <button 
            onClick={() => fetchResults(false)}
            className="flex items-center gap-2 bg-[#E5092F] text-white px-6 py-2.5 rounded-full font-semibold active:opacity-80 transition-opacity"
          >
            <RefreshCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      );
    }

    if (errorState === 'api' && results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <Loader2 className="h-16 w-16 mb-6 text-neutral-600" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to load manga</h2>
          <p className="text-neutral-400 mb-6 text-sm">Something went wrong on our end.</p>
          <button 
            onClick={() => fetchResults(false)}
            className="flex items-center gap-2 bg-[#E5092F] text-white px-6 py-2.5 rounded-full font-semibold active:opacity-80 transition-opacity"
          >
            <RefreshCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      );
    }

    if (results.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <Compass className="h-16 w-16 mb-6 text-neutral-600" />
          <h2 className="text-xl font-bold text-white mb-2">No manga found</h2>
          <p className="text-neutral-400 text-sm">Try another category or adjust your filters.</p>
        </div>
      );
    }

    return (
      <div className={cn(
        "grid px-4 pb-[env(safe-area-inset-bottom,0px)]",
        displayMode === '3-col' ? "grid-cols-3 gap-2" : "grid-cols-2 gap-[14px]"
      )}>
        {results.map(item => (
          <div
            key={item.id}
            onClick={() => router.push(`/android-series?slug=${item.slug}`)}
            className="flex flex-col gap-2 active:scale-[0.98] transition-transform"
          >
            <div className="relative rounded-[14px] overflow-hidden aspect-[4/5] bg-[#1C1C1C] shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-white/5">
              {item.coverImage ? (
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  fill
                  sizes={displayMode === '3-col' ? "33vw" : "50vw"}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                  No Cover
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 px-0.5">
              <div className="flex items-start justify-between gap-1">
                <h2 className={cn(
                  "text-white font-semibold line-clamp-1 leading-snug",
                  displayMode === '3-col' ? "text-[12px]" : "text-[15px]"
                )}>
                  {item.title}
                </h2>
                {displayMode === '2-col' && (
                  <button 
                    onClick={(e) => e.stopPropagation()} 
                    className="text-white/80 p-0.5 active:bg-white/10 rounded-full transition-colors mt-0.5"
                  >
                    <MoreVertical className="h-4 w-4 shrink-0" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {item.genres?.slice(0, displayMode === '3-col' ? 1 : 3).map((genre, idx) => (
                  <span 
                    key={idx} 
                    className={cn(
                      "font-medium rounded-full border truncate",
                      displayMode === '3-col' ? "text-[9px] px-1.5 py-[1px] max-w-full" : "text-[10px] px-2.5 py-0.5",
                      idx === 0 ? "text-[#E5092F] border-[#E5092F]/50" : "text-neutral-400 border-neutral-700"
                    )}
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {/* Load More Indicator */}
        {isFetchingMore && hasMore && errorState === 'none' && (
          <div className="col-span-2 flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-[#E5092F]" />
          </div>
        )}

        {/* Pagination Error State */}
        {errorState !== 'none' && results.length > 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-6 gap-2">
            <span className="text-sm text-neutral-400">
              {errorState === 'network' ? 'Connection lost' : 'Failed to load more'}
            </span>
            <button 
              onClick={() => fetchResults(true)}
              className="flex items-center gap-2 bg-neutral-800 text-white px-4 py-2 rounded-full text-xs font-medium active:bg-neutral-700"
            >
              <RefreshCcw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* End of results indicator */}
        {!isFetchingMore && !isLoading && !hasMore && results.length > 0 && (
          <div className="col-span-2 flex justify-center py-8">
            <span className="text-xs text-neutral-500 font-semibold tracking-widest uppercase">
              No more series
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-[#0B0D10] text-gray-100 overflow-hidden relative">
      {/* Top App Bar - Fixed and Polished */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-[#0B0D10]/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          {!isSearchMode ? (
            <>
              <div className="flex items-center gap-4">
                <button onClick={() => router.push('/library')} className="text-white active:opacity-70 transition-opacity">
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex items-center">
                  <span className="text-[22px] font-black tracking-tight leading-none uppercase">
                    <span className="text-[#E5092F]">RED</span><span className="text-white">BEARD</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-white">
                <button onClick={() => setIsSearchMode(true)} className="active:opacity-70 transition-opacity p-1">
                  <Search className="h-[22px] w-[22px]" />
                </button>
                <button onClick={() => setIsGridMenuOpen(true)} className="active:opacity-70 transition-opacity p-1">
                  <Grid className="h-[22px] w-[22px]" />
                </button>
                <button onClick={() => setIsMoreMenuOpen(true)} className="active:opacity-70 transition-opacity p-1 -mr-2">
                  <MoreVertical className="h-[22px] w-[22px]" />
                </button>
              </div>
            </>
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
                  placeholder="Search manga, manhwa..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white placeholder:text-neutral-500 p-0"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="p-1 -mr-1 text-neutral-400 active:text-white rounded-full ml-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Filter Tabs */}
        {!isSearchMode && (
          <div className="px-4 pb-3 flex items-center gap-2.5 mt-2">
            <button 
              onClick={() => setActiveCategory(CATEGORIES.find(c => c.id === 'trending') || CATEGORIES[0])}
              className={cn(
                "px-5 py-2 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 relative",
                activeCategory.id === 'trending' ? "bg-[#E5092F] text-white shadow-[0_4px_14px_rgba(229,9,47,0.3)] border border-[#E5092F]" : "bg-transparent text-neutral-400 border border-neutral-800"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", activeCategory.id === 'trending' ? "fill-white" : "")} /> Popular
            </button>
            <button 
              onClick={() => setActiveCategory(CATEGORIES.find(c => c.id === 'latest') || CATEGORIES[1])}
              className={cn(
                "px-5 py-2 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 relative",
                activeCategory.id === 'latest' ? "bg-[#E5092F] text-white shadow-[0_4px_14px_rgba(229,9,47,0.3)] border border-[#E5092F]" : "bg-transparent text-neutral-400 border border-neutral-800"
              )}
            >
              <Clock className={cn("h-3.5 w-3.5", activeCategory.id === 'latest' ? "fill-white" : "")} /> Latest
            </button>
            <button 
              onClick={openFilter}
              className="px-5 py-2 rounded-full text-[13px] font-bold transition-all bg-transparent text-neutral-400 border border-neutral-800 flex items-center justify-center gap-1.5 relative"
            >
              <Filter className="h-3.5 w-3.5" /> Filter
              {(genreFilter || typeFilter || statusFilter) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E5092F] rounded-full border border-[#0B0D10]" />
              )}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto pt-[calc(7.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] no-scrollbar"
      >
        <div className="pt-2">
          {renderContent()}
        </div>
      </main>

      {/* Filter Bottom Sheet Overlay */}
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
                onClick={resetFilters}
                className="text-neutral-400 font-medium px-2 py-1 active:bg-neutral-800 rounded transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={applyFilters}
                className="bg-[#E5092F] text-white font-bold px-6 py-1.5 rounded-full active:opacity-80 transition-opacity"
              >
                Apply
              </button>
            </div>
            
            {/* Sheet Content - Scrollable */}
            <div className="p-4 overflow-y-auto flex flex-col gap-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
              
              {/* Category / Sort */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Sort / Category</label>
                <div className="flex flex-col gap-1">
                  {CATEGORIES.map(cat => (
                    <label key={cat.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/50 active:bg-neutral-800">
                      <input 
                        type="radio" 
                        name="category" 
                        checked={draftCategory.id === cat.id}
                        onChange={() => setDraftCategory(cat)}
                        className="w-4 h-4 accent-[#E5092F] bg-transparent border-neutral-600"
                      />
                      <span className="text-sm font-medium text-white">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Genres Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Genre</label>
                <div className="relative">
                  <select 
                    value={draftGenre}
                    onChange={e => setDraftGenre(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg appearance-none outline-none border border-neutral-700 focus:border-[#E5092F]"
                  >
                    <option value="">All Genres</option>
                    {genres.map(g => (
                      <option key={g.slug} value={g.slug}>{g.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Manga Type</label>
                <div className="relative">
                  <select 
                    value={draftType}
                    onChange={e => setDraftType(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg appearance-none outline-none border border-neutral-700 focus:border-[#E5092F]"
                  >
                    <option value="">Both / All</option>
                    {TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Manga Status</label>
                <div className="relative">
                  <select 
                    value={draftStatus}
                    onChange={e => setDraftStatus(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg appearance-none outline-none border border-neutral-700 focus:border-[#E5092F]"
                  >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    ▼
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
      {/* Grid Display Menu */}
      {isGridMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGridMenuOpen(false)} />
          <div className="relative bg-[#0B0D10] rounded-t-[24px] border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)] overflow-hidden">
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full" />
            </div>
            
            <div className="px-6 pb-6">
              <h2 className="text-xl font-bold text-white mb-6">Display Layout</h2>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => changeDisplayMode('2-col')}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                    displayMode === '2-col' ? "bg-white/10 border-[#E5092F] text-white" : "bg-[#1C1C1C] border-white/5 text-neutral-400"
                  )}
                >
                  <span className="font-bold">2 Columns</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-6 rounded bg-current opacity-80" />
                    <div className="w-4 h-6 rounded bg-current opacity-80" />
                  </div>
                </button>
                
                <button
                  onClick={() => changeDisplayMode('3-col')}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                    displayMode === '3-col' ? "bg-white/10 border-[#E5092F] text-white" : "bg-[#1C1C1C] border-white/5 text-neutral-400"
                  )}
                >
                  <span className="font-bold">3 Columns</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-5 rounded bg-current opacity-80" />
                    <div className="w-3 h-5 rounded bg-current opacity-80" />
                    <div className="w-3 h-5 rounded bg-current opacity-80" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* More Options Menu */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMoreMenuOpen(false)} />
          <div className="relative bg-[#0B0D10] rounded-t-[24px] border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] overflow-hidden">
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full" />
            </div>
            
            <div className="px-6 py-2">
              <h2 className="text-xl font-bold text-white mb-4">Options</h2>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    fetchResults(false);
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#1C1C1C] border border-white/5 text-white active:bg-white/5 transition-all"
                >
                  <RefreshCcw className="h-5 w-5 text-neutral-400" />
                  <span className="font-bold">Refresh Content</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
