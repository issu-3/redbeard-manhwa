'use client';

import { useEffect, useState } from 'react';
import { AndroidSeriesView } from '@/components/native/AndroidSeriesView';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { Loader2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { nativeFetch } from '@/lib/native/api';

export function AndroidSeriesClientWrapper({ slug }: { slug: string }) {
  const [series, setSeries] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    let hasCachedData = false;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const { useAppLibraryStore } = await import('@/store/app-library-store');
      const { LocalLibraryRepository } = await import('@/lib/local-library');
      const store = useAppLibraryStore.getState();
      const activeUserId = store.activeUserId;

      // 1. OFFLINE FIRST: Try to load from local SQLite cache
      if (activeUserId && !isRefresh) {
        try {
          const localSeries = await LocalLibraryRepository.getSeriesBySlug(activeUserId, slug);
          if (localSeries) {
            const localChapters = await LocalLibraryRepository.getChapters(activeUserId, localSeries.seriesId);
            setSeries({
              id: localSeries.seriesId,
              title: localSeries.title,
              slug: localSeries.slug,
              coverImage: localSeries.coverImage,
              status: localSeries.status,
              author: localSeries.author,
              artist: localSeries.artist,
              description: localSeries.description,
              genres: localSeries.genres,
            });
            setChapters(localChapters);
            setLoading(false); // We have local data, UI can render immediately
            hasCachedData = true;
          }
        } catch (e) {
          console.error('[OFFLINE_CACHE] Failed to load local data', e);
        }
      }

      // 2. FETCH LATEST FROM API
      const res = await nativeFetch(`/api/series/${slug}`);
      if (!res.ok) {
        if (!hasCachedData) setErrorStatus(res.status); // Only show error if no local data
        throw res;
      }
      const json = await res.json();
      
      const seriesData = json.data;
      setSeries(seriesData);
      setChapters(seriesData?.chapters || []);
      setErrorStatus(null);

      // 3. UPDATE LOCAL CACHE if it's in the library
      if (activeUserId && seriesData?.id) {
        const inLibrary = store.isSaved(seriesData.id);
        if (inLibrary) {
          await store.updateLibrarySeries(seriesData.id, {
            title: seriesData.title,
            coverImage: seriesData.coverImage,
            status: seriesData.status,
            author: seriesData.author,
            artist: seriesData.artist,
            description: seriesData.description,
            genres: seriesData.genres,
          });
          if (seriesData.chapters && seriesData.chapters.length > 0) {
            await store.saveChaptersToLibrary(seriesData.id, seriesData.chapters);
          }
        }
      }

    } catch (err: any) {
      console.error(err);
      if (!hasCachedData) { // Only set error status if we don't have cached data
        if (err instanceof Response) {
          setErrorStatus(err.status);
        } else {
          setErrorStatus(500); // generic network error
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (errorStatus === 404 || (!loading && !series && errorStatus === null)) {
    return notFound();
  }

  if (errorStatus) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-background gap-4 text-white p-6 text-center">
        <h2 className="text-xl font-bold">Failed to load series</h2>
        <p className="text-neutral-400">Please check your internet connection.</p>
        <button 
          onClick={() => loadData()}
          className="px-6 py-2 bg-red-600 rounded text-white font-medium active:scale-95 transition-transform"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AndroidSeriesView 
      series={series} 
      chapters={chapters} 
      onRefresh={() => loadData(true)} 
      isRefreshing={refreshing} 
    />
  );
}
