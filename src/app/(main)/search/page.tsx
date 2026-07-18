'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, X, TrendingUp, SlidersHorizontal } from 'lucide-react';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { GenreCard } from '@/components/shared/GenreCard';
import { useDebounce } from '@/hooks';
import { GENRES, SORT_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';
import type { SeriesCardData } from '@/types';

const TRENDING_SEARCHES = [
  'Solo Leveling', 'Tower of God', 'Omniscient Reader', 'Return of the Mount Hua Sect',
  'The Beginning After the End', 'Nano Machine', 'Eleceed', 'Lookism',
];
const SAMPLE_RESULTS: SeriesCardData[] = [
  { id: 's1', title: 'Solo Leveling: Ragnarok', slug: 'solo-leveling-ragnarok', coverImage: 'https://picsum.photos/seed/cover1/300/450', type: 'MANHWA', status: 'ONGOING', averageRating: 9.5, totalViews: 12500000, totalBookmarks: 890000, chapterCount: 156, genres: [{ name: 'Action', slug: 'action' }, { name: 'Fantasy', slug: 'fantasy' }], updatedAt: new Date().toISOString() },
  { id: 's2', title: 'Solo Leveling', slug: 'solo-leveling', coverImage: 'https://picsum.photos/seed/cover2/300/450', type: 'MANHWA', status: 'COMPLETED', averageRating: 9.4, totalViews: 45000000, totalBookmarks: 2100000, chapterCount: 200, genres: [{ name: 'Action', slug: 'action' }, { name: 'Fantasy', slug: 'fantasy' }], updatedAt: new Date().toISOString() },
  { id: 's3', title: 'Tower of God', slug: 'tower-of-god', coverImage: 'https://picsum.photos/seed/cover3/300/450', type: 'MANHWA', status: 'ONGOING', averageRating: 9.2, totalViews: 28000000, totalBookmarks: 1500000, chapterCount: 580, genres: [{ name: 'Action', slug: 'action' }, { name: 'Adventure', slug: 'adventure' }], updatedAt: new Date().toISOString() },
  { id: 's4', title: 'Omniscient Reader\'s Viewpoint', slug: 'omniscient-readers-viewpoint', coverImage: 'https://picsum.photos/seed/cover4/300/450', type: 'MANHWA', status: 'ONGOING', averageRating: 9.6, totalViews: 18000000, totalBookmarks: 1200000, chapterCount: 178, genres: [{ name: 'Action', slug: 'action' }, { name: 'Isekai', slug: 'isekai' }], updatedAt: new Date().toISOString() },
  { id: 's5', title: 'The Beginning After the End', slug: 'the-beginning-after-the-end', coverImage: 'https://picsum.photos/seed/cover5/300/450', type: 'MANHWA', status: 'ONGOING', averageRating: 9.3, totalViews: 15000000, totalBookmarks: 980000, chapterCount: 204, genres: [{ name: 'Action', slug: 'action' }, { name: 'Fantasy', slug: 'fantasy' }], updatedAt: new Date().toISOString() },
  { id: 's6', title: 'Nano Machine', slug: 'nano-machine', coverImage: 'https://picsum.photos/seed/cover6/300/450', type: 'MANHWA', status: 'ONGOING', averageRating: 8.9, totalViews: 9800000, totalBookmarks: 560000, chapterCount: 190, genres: [{ name: 'Action', slug: 'action' }, { name: 'Martial Arts', slug: 'martial-arts' }], updatedAt: new Date().toISOString() },
];
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SeriesCardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('redbeard-recent-searches');
      if (stored) setTimeout(() => setRecentSearches(JSON.parse(stored)), 0);
    }
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTimeout(() => setResults([]), 0);
      return;
    }
    setTimeout(() => setIsSearching(true), 0);
    const timer = setTimeout(() => {
      const filtered = SAMPLE_RESULTS.filter((s) =>
        s.title.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
      setResults(filtered.length > 0 ? filtered : SAMPLE_RESULTS.slice(0, 3));
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedQuery]);

  const addRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('redbeard-recent-searches', JSON.stringify(updated));
  };

  const handleSearch = (term: string) => {
    setQuery(term);
    addRecentSearch(term);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('redbeard-recent-searches');
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-screen px-4 pb-16 pt-8 md:px-8 lg:px-16 xl:px-20">
      {/* Search header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl"
      >
        <h1
          className="mb-6 text-center text-3xl font-bold text-text-primary md:text-4xl"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Search
        </h1>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) addRecentSearch(query.trim());
            }}
            placeholder="Search manhwa, manga, authors..."
            className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-24 text-base text-text-primary placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-text-muted hover:text-text-secondary">
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg p-2 transition-colors ${showFilters ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-5"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-secondary">Genre</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => (
                      <button
                        key={g.slug}
                        onClick={() => setSelectedGenres((prev) =>
                          prev.includes(g.slug) ? prev.filter((s) => s !== g.slug) : [...prev, g.slug]
                        )}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          selectedGenres.includes(g.slug)
                            ? 'bg-primary text-white'
                            : 'bg-surface text-text-secondary hover:bg-card-hover'
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-text-secondary">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="">All</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-text-secondary">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                      {SORT_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content area */}
      <div className="mx-auto mt-10 max-w-6xl">
        {!hasQuery ? (
          <div className="space-y-10">
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                    <Clock className="h-5 w-5 text-text-muted" />
                    Recent Searches
                  </h2>
                  <button onClick={clearRecentSearches} className="text-sm text-text-muted hover:text-primary">
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Trending searches */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending Searches
              </h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {TRENDING_SEARCHES.map((term, i) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/30 hover:bg-card-hover"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm text-text-primary">{term}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Browse genres */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-text-primary">Browse by Genre</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {GENRES.slice(0, 10).map((genre, i) => (
                  <GenreCard key={genre.slug} genre={genre} variant="compact" index={i} />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div>
            {/* Results */}
            {isSearching ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="skeleton aspect-[3/4] rounded-2xl" />
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-text-muted">
                  {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {results.map((series, i) => (
                    <SeriesCard key={series.id} series={series} index={i} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
