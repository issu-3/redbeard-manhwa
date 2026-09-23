'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Compass, Loader2, ArrowLeft, Filter, RefreshCcw, WifiOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SeriesCardData } from '@/types';
import { useDebounce } from '@/hooks';
import { searchSeries } from '@/lib/native/api';

const CATEGORIES = [
  { id: 'trending', label: 'Trending', params: { sort: 'popular' } },
  { id: 'latest', label: 'Latest', params: { sort: 'latest' } },
  { id: 'completed', label: 'Completed', params: { status: 'COMPLETED' } },
  { id: 'ongoing', label: 'Ongoing', params: { status: 'ONGOING' } },
];

export function AndroidBrowseView() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  // Search Mode State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Data State
  const [results, setResults] = useState<SeriesCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<'none' | 'network' | 'api'>('none');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setIsLoading(true);
        setErrorState('none');
      }

      const params = new URLSearchParams();
      params.append('limit', '20');

      const currentSkip = isLoadMore ? skip : 0;
      params.append('skip', currentSkip.toString());

      if (isSearchMode && debouncedSearchQuery.trim()) {
        params.append('q', debouncedSearchQuery.trim());
      } else if (!isSearchMode) {
        // Apply category params
        Object.entries(activeCategory.params).forEach(([k, v]) => {
          params.append(k, v as string);
        });
      } else {
        // Search mode but empty query
        setResults([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

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
          setResults(prev => [...prev, ...json.data]);
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
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading && errorState === 'none') {
      fetchResults(true);
    }
  };

  const resetFilters = () => {
    setGenreFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setIsFilterOpen(false);
  };

  const renderContent = () => {
    if (isLoading && results.length === 0) {
      return (
        <div className="grid grid-cols-2 gap-2 px-2 pb-[100px]">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 animate-pulse">
              <div className="w-full aspect-[2/3] bg-neutral-800 rounded-md" />
              <div className="h-3 bg-neutral-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      );
    }

    if (errorState === 'network') {
      return (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <WifiOff className="h-16 w-16 mb-6 text-neutral-600" />
          <h2 className="text-xl font-bold text-white mb-2">You're offline</h2>
          <p className="text-neutral-400 mb-6 text-sm">Check your internet connection and try again.</p>
          <button 
            onClick={() => fetchResults(false)}
            className="flex items-center gap-2 bg-[#ff0000] text-white px-6 py-2.5 rounded-full font-semibold active:opacity-80 transition-opacity"
          >
            <RefreshCcw className="h-4 w-4" /> Retry
          </button>
        </div>
      );
    }

    if (errorState === 'api') {
      return (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <Loader2 className="h-16 w-16 mb-6 text-neutral-600" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to load manga</h2>
          <p className="text-neutral-400 mb-6 text-sm">Something went wrong on our end.</p>
          <button 
            onClick={() => fetchResults(false)}
            className="flex items-center gap-2 bg-[#ff0000] text-white px-6 py-2.5 rounded-full font-semibold active:opacity-80 transition-opacity"
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
      <div className="grid grid-cols-2 gap-2 px-2 pb-[100px]">
        {results.map(item => (
          <div
            key={item.id}
            onClick={() => router.push(`/android-series?slug=${item.slug}`)}
            className="flex flex-col gap-1.5 active:scale-[0.98] transition-transform"
          >
            <div className="relative rounded-md overflow-hidden aspect-[2/3] bg-neutral-900 shadow-sm">
              {item.coverImage ? (
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                  No Cover
                </div>
              )}
              
              {/* Badges Overlay */}
              <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                {item.status === 'COMPLETED' && (
                  <span className="bg-[#ff0000] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm w-fit">
                    Completed
                  </span>
                )}
                {item.averageRating > 0 && (
                  <span className="bg-black/80 backdrop-blur-md text-[#ffca28] text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 w-fit">
                    ★ {item.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            <div className="px-0.5">
              <h2 className="text-gray-100 text-[13px] font-medium line-clamp-2 leading-tight">
                {item.title}
              </h2>
            </div>
          </div>
        ))}
        
        {/* Load More Indicator */}
        {isLoading && hasMore && (
          <div className="col-span-2 flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff0000]" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#121212] text-gray-100 overflow-hidden">
      {/* Top App Bar */}
      <header className="shrink-0 bg-[#121212] z-40 relative">
        <div className="px-4 h-14 flex items-center justify-between">
          {!isSearchMode ? (
            <>
              <h1 className="text-xl font-bold text-white">Browse</h1>
              <div className="flex items-center gap-3 text-neutral-300">
                <button
                  onClick={() => setIsSearchMode(true)}
                  className="p-1 active:bg-neutral-800 rounded-full transition-colors"
                >
                  <Search className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => setIsFilterOpen(true)}
                  className="p-1 active:bg-neutral-800 rounded-full transition-colors relative"
                >
                  <Filter className="h-6 w-6" />
                  {(genreFilter || typeFilter || statusFilter) && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ff0000] rounded-full border border-[#121212]" />
                  )}
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
                className="p-1 -ml-1 text-neutral-300 active:bg-neutral-800 rounded-full"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <input
                type="text"
                autoFocus
                placeholder="Search series, authors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-base text-white placeholder:text-neutral-500 p-0"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="p-1 text-neutral-400 active:bg-neutral-800 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        {!isSearchMode && (
          <div className="flex overflow-x-auto no-scrollbar border-b border-neutral-800/50">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "relative px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
                  activeCategory.id === cat.id
                    ? "text-[#ff0000]"
                    : "text-neutral-400 active:text-neutral-300"
                )}
              >
                {cat.label}
                {activeCategory.id === cat.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff0000] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-2 no-scrollbar"
      >
        {renderContent()}
      </main>

      {/* Filter Bottom Sheet Overlay */}
      {isFilterOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-50 transition-opacity" 
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] rounded-t-2xl z-50 flex flex-col max-h-[85vh] shadow-2xl">
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <button 
                onClick={resetFilters}
                className="text-[#4b7bec] font-medium px-2 py-1 active:bg-neutral-800 rounded"
              >
                Reset
              </button>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="bg-[#b3c7ff] text-blue-900 font-bold px-6 py-1.5 rounded-full active:opacity-80"
              >
                Filter
              </button>
            </div>
            
            {/* Sheet Content */}
            <div className="p-4 overflow-y-auto flex flex-col gap-6">
              
              {/* Type Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Manga Type</label>
                <div className="relative">
                  <select 
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg appearance-none outline-none border border-neutral-700 focus:border-[#4b7bec]"
                  >
                    <option value="">Both</option>
                    <option value="MANGA">Manga</option>
                    <option value="MANHWA">Manhwa</option>
                    <option value="MANHUA">Manhua</option>
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
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg appearance-none outline-none border border-neutral-700 focus:border-[#4b7bec]"
                  >
                    <option value="">Both</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="HIATUS">Hiatus</option>
                    <option value="CANCELLED">Cancelled</option>
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
    </div>
  );
}
