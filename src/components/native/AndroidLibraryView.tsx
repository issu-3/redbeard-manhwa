'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDownloadStore, DownloadState } from '@/store/download-store';
import { useAppLibraryStore } from '@/store/app-library-store';
import { Capacitor } from '@capacitor/core';
import { Search, Filter, MoreVertical, Download, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AndroidLibraryView() {
  const router = useRouter();
  const { downloads } = useDownloadStore();
  const { savedSeries, hasHydrated } = useAppLibraryStore();
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Default');

  // Search State
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const libraryItems = useMemo(() => {
    const items: Record<string, {
      seriesId: string;
      title: string;
      slug: string;
      coverImage?: string;
      downloadedCount: number;
      unreadCount: number;
    }> = {};

    if (Capacitor.isNativePlatform() && mounted) {
      Object.values(savedSeries || {}).forEach(series => {
        items[series.seriesId] = {
          seriesId: series.seriesId,
          title: series.title,
          slug: series.slug,
          coverImage: series.cachedCoverUri || series.coverImage || undefined,
          downloadedCount: 0,
          unreadCount: 0,
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

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [downloads, savedSeries, mounted, isSearchMode, searchQuery]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-[100px]">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        {!isSearchMode ? (
          <>
            <h1 className="text-xl font-bold tracking-tight">Library</h1>
            <div className="flex items-center gap-2 text-text-primary">
              <button onClick={() => setIsSearchMode(true)} className="p-2 hover:bg-surface rounded-full transition-colors"><Search className="h-5 w-5" /></button>
              <button className="p-2 hover:bg-surface rounded-full transition-colors"><Filter className="h-5 w-5" /></button>
              <button className="p-2 hover:bg-surface rounded-full transition-colors"><MoreVertical className="h-5 w-5" /></button>
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
              placeholder="Search library..."
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
      </header>

      {/* Categories (Tabs) - hide during search */}
      {!isSearchMode && (
        <div className="flex overflow-x-auto no-scrollbar border-b border-border-subtle bg-background">
          {['Default', 'Reading', 'Completed'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "relative px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors",
                activeCategory === cat
                  ? "text-primary"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {cat}
              {activeCategory === cat && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <main className="flex-1 px-2 pt-2">
        {!hasHydrated ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : libraryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <p>{isSearchMode ? 'No results found in library' : 'Your library is empty'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {libraryItems.map(item => (
              <div
                key={item.seriesId}
                onClick={() => router.push(`/android-series?slug=${item.slug}`)}
                className="relative rounded-[4px] overflow-hidden aspect-[2/3] bg-card active:scale-[0.98] transition-transform shadow-md"
              >
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={item.title}
                    fill
                    className="object-cover"
                    unoptimized={item.coverImage.startsWith('file://')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-card text-text-muted text-xs">
                    No Cover
                  </div>
                )}

                {/* Badges Container (Top Right) */}
                <div className="absolute top-0 right-0 flex flex-col items-end">
                  {item.unreadCount > 0 && (
                    <div className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md shadow-sm">
                      {item.unreadCount}
                    </div>
                  )}
                  {item.downloadedCount > 0 && (
                    <div className="bg-surface/90 backdrop-blur text-text-primary text-[10px] font-bold px-1 py-0.5 rounded-bl-md shadow-sm mt-[1px]">
                      <Download className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Bottom Gradient Title */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1.5 pt-8">
                  <h2 className="text-white text-[11px] font-semibold line-clamp-2 leading-tight drop-shadow-md">
                    {item.title}
                  </h2>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
