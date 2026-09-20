import { useEffect, useState, useCallback } from 'react';
import { ApiClient, type SeriesCardData, type Genre } from '../../api/client';
import { SeriesDAO } from '../../db/dao';
import { useNetworkStore } from '../../store/network';
import { SeriesCard } from '../../components/SeriesCard';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BrowseScreen() {
  const { isOnline } = useNetworkStore();
  const [seriesList, setSeriesList] = useState<SeriesCardData[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [sort, setSort] = useState('popular');
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  const loadGenres = useCallback(async () => {
    if (!isOnline) return;
    const g = await ApiClient.getGenres();
    if (g.length > 0) setGenres(g);
  }, [isOnline]);

  const loadSeries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isOnline) {
        const cached = await SeriesDAO.getAll();
        if (cached.length > 0) {
          setSeriesList(cached.map(s => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            coverImage: s.cover || '',
            type: s.type || '',
            status: s.status || '',
            isNSFW: false,
            averageRating: 0,
            ratingCount: 0,
            totalViews: 0,
            totalBookmarks: 0,
            chapterCount: 0,
            updatedAt: new Date(s.updatedAt).toISOString(),
            genres: s.genres ? s.genres.split(',').map(g => ({ name: g, slug: g })) : []
          })));
        } else {
          setError('You are offline and no cached catalog is available.');
        }
        setIsLoading(false);
        return;
      }
      
      const results = await ApiClient.searchSeries({
        sort,
        genre: selectedGenre ? [selectedGenre] : undefined,
        limit: 30
      });
      setSeriesList(results);

      // Cache the results
      for (const res of results) {
        await SeriesDAO.upsert({
          id: res.id,
          slug: res.slug,
          title: res.title,
          cover: res.coverImage,
          type: res.type,
          status: res.status,
          genres: res.genres.map(g => g.name).join(','),
          bookmarked: false, // Don't overwrite bookmarked if existing? Upsert handles it gracefully but wait, ON CONFLICT sets it. Let's fix DAO to NOT overwrite bookmarked if existing.
          updatedAt: Date.now()
        });
      }
    } catch (e) {
      setError('Failed to load series');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, sort, selectedGenre]);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Browse</h1>
          <Link to="/search" className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white hover:bg-slate-700">
            <Search size={20} />
          </Link>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <select 
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-800 text-slate-200 text-sm rounded px-3 py-1.5 border border-slate-700 outline-none"
          >
            <option value="popular">Popular</option>
            <option value="latest">Latest</option>
            <option value="rating">Top Rated</option>
            <option value="alphabetical">A-Z</option>
          </select>

          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-slate-800 text-slate-200 text-sm rounded px-3 py-1.5 border border-slate-700 outline-none"
          >
            <option value="">All Genres</option>
            {genres.map(g => (
              <option key={g.slug} value={g.slug}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <p>{error}</p>
            {isOnline && (
              <button onClick={loadSeries} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Retry
              </button>
            )}
          </div>
        ) : seriesList.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No series found.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {seriesList.map(series => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
