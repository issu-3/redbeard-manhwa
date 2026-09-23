'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Compass, Loader2, ArrowLeft, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SeriesCardData } from '@/types';
import { useDebounce } from '@/hooks';

const CATEGORIES = [
  { id: 'trending', label: 'Trending', params: { sort: 'popular' } },
  { id: 'latest', label: 'Latest', params: { sort: 'latest' } },
  { id: 'completed', label: 'Completed', params: { status: 'COMPLETED' } },
  { id: 'ongoing', label: 'Ongoing', params: { status: 'ONGOING' } },
  { id: 'new-releases', label: 'New Releases', params: { sort: 'newest' } },
];

export function AndroidBrowseView() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  // Search Mode State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Data State
  const [results, setResults] = useState<SeriesCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async (isLoadMore = false) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append('limit', '20');

      let currentSkip = isLoadMore ? skip : 0;
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

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();

      if (json.success) {
        if (isLoadMore) {
          setResults(prev => [...prev, ...json.data]);
        } else {
          setResults(json.data);
          // Scroll to top when changing category or new search
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        }
        setHasMore(json.data.length === 20);
        setSkip(currentSkip + 20);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, isSearchMode, debouncedSearchQuery, skip]);

  // Initial load & dependencies change
  useEffect(() => {
    setSkip(0);
    fetchResults(false);
  }, [activeCategory, isSearchMode, debouncedSearchQuery]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading) {
      fetchResults(true);
    }
  };

  const renderContent = () => {
    if (isLoading && results.length === 0) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (results.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Compass className="h-12 w-12 mb-4 opacity-20" />
          <p>{isSearchMode ? 'No results found' : 'Nothing to show here'}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 px-1.5 pb-[100px]">
        {results.map(item => (
          <div
            key={item.id}
            onClick={() => router.push(`/android-series?slug=${item.slug}`)}
            className="relative rounded-[4px] overflow-hidden aspect-[2/3] bg-card active:scale-[0.98] transition-transform shadow-md"
          >
            {item.coverImage ? (
              <Image
                src={item.coverImage}
                alt={item.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card text-text-muted text-xs">
                No Cover
              </div>
            )}

            <div className="absolute top-1 left-1 flex gap-1">
              {item.averageRating > 0 && (
                <div className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 shadow-sm">
                  ⭐ {item.averageRating.toFixed(1)}
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1.5 pt-8">
              <h2 className="text-white text-[11px] font-semibold line-clamp-2 leading-tight drop-shadow-md">
                {item.title}
              </h2>
            </div>
          </div>
        ))}
        {isLoading && hasMore && (
          <div className="col-span-2 sm:col-span-3 flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Top App Bar */}
      <header className="shrink-0 bg-background/95 backdrop-blur z-40">
        <div className="px-4 h-14 flex items-center justify-between">
          {!isSearchMode ? (
            <>
              <h1 className="text-xl font-bold">Browse</h1>
              <div className="flex items-center gap-2 text-text-primary">
                <button
                  onClick={() => setIsSearchMode(true)}
                  className="p-2 hover:bg-surface rounded-full transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
                <button className="p-2 hover:bg-surface rounded-full transition-colors">
                  <Filter className="h-5 w-5" />
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
                className="p-1 -ml-1 text-text-primary"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <input
                type="text"
                autoFocus
                placeholder="Search series, authors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-base"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-text-muted">
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category Tabs - only show when not in search mode */}
        {!isSearchMode && (
          <div className="flex overflow-x-auto no-scrollbar border-b border-border-subtle bg-background">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "relative px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors",
                  activeCategory.id === cat.id
                    ? "text-primary"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {cat.label}
                {activeCategory.id === cat.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
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
        className="flex-1 overflow-y-auto pt-2"
      >
        {renderContent()}
      </main>
    </div>
  );
}
