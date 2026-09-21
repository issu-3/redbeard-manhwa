import { useEffect, useState, useCallback, useRef } from 'react';
import { ApiClient } from '../../api/client';
import { SeriesDAO, type Series } from '../../db/dao';
import { useNetworkStore } from '../../store/network';
import { SeriesCard } from '../../components/SeriesCard';
import { Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SearchScreen() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStore();
  const [query, setQuery] = useState('');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSeriesList([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!isOnline) {
        const cached = await SeriesDAO.search(searchQuery.trim());
        if (cached.length > 0) {
          setSeriesList(cached);
        } else {
          setSeriesList([]);
        }
        setIsLoading(false);
        return;
      }
      const results = await ApiClient.searchSeries({ q: searchQuery.trim(), limit: 30 });
      const mappedResults: Series[] = results.map(res => ({
        id: res.id,
        slug: res.slug,
        title: res.title,
        cover: res.coverImage,
        synopsis: null,
        author: null,
        artist: null,
        type: res.type || null,
        status: res.status || null,
        genres: res.genres.map(g => g.name).join(','),
        bookmarked: false,
        updatedAt: Date.now()
      }));
      setSeriesList(mappedResults);

      // Cache the results
      for (const res of mappedResults) {
        await SeriesDAO.upsert(res);
      }
    } catch (e) {
      setError('Failed to load search results');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (query) {
      timeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 500);
    } else {
      setSeriesList([]);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, performSearch]);

  return (
    <div className="flex flex-col h-full bg-slate-950 z-50 fixed inset-0 overflow-hidden">
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            autoFocus
            type="text"
            placeholder="Search series..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-800 text-slate-200 text-sm rounded-full pl-10 pr-4 py-2 border border-slate-700 outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <p>{error}</p>
          </div>
        ) : query.trim() && seriesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <SearchIcon size={48} className="mb-4 opacity-20" />
            <p>No results found for "{query}"</p>
            {!isOnline && <p className="text-xs mt-2 text-slate-600">You are offline. Only cached titles are available.</p>}
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
