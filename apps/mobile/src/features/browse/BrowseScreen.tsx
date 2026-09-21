import { useEffect, useState, useCallback } from 'react';
import { ApiClient, type Genre } from '../../api/client';
import { SeriesDAO, type Series } from '../../db/dao';
import { useNetworkStore } from '../../store/network';
import { SeriesCard } from '../../components/SeriesCard';
import { Search, LayoutGrid, MoreVertical, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BrowseScreen() {
  const { isOnline } = useNetworkStore();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [sort, setSort] = useState('popular');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  
  const [isGenreSheetOpen, setIsGenreSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  const loadGenres = useCallback(async () => {
    if (!isOnline) return;
    try {
      const g = await ApiClient.getGenres();
      if (g.length > 0) setGenres(g);
    } catch (e) {
      console.warn("Failed to load genres", e);
    }
  }, [isOnline]);

  const loadSeries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isOnline) {
        const cached = await SeriesDAO.getAll();
        if (cached.length > 0) {
          setSeriesList(cached);
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
      
      const mappedSeries: Series[] = results.map(res => ({
        id: res.id,
        slug: res.slug,
        title: res.title,
        cover: res.coverImage,
        type: res.type || '',
        status: res.status || '',
        genres: res.genres.map(g => g.name).join(','),
        bookmarked: false, 
        updatedAt: Date.now()
      }));

      setSeriesList(mappedSeries);

      // Cache the results
      for (const res of mappedSeries) {
        await SeriesDAO.upsert(res); // Upsert handles ignoring existing bookmarked flag via its internal logic (if it exists)
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

  const getSortLabel = () => {
    if (sort === 'popular') return 'Popular';
    if (sort === 'latest') return 'Latest';
    if (sort === 'rating') return 'Top Rated';
    if (sort === 'alphabetical') return 'A-Z';
    return 'Sort';
  };

  const getGenreLabel = () => {
    if (!selectedGenre) return 'Genre';
    const g = genres.find(x => x.slug === selectedGenre);
    return g ? g.name : 'Genre';
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg text-brand-text pt-safe relative">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 h-14">
        <h1 className="text-xl font-semibold tracking-wide">Browse</h1>
        <div className="flex items-center gap-4 text-brand-text">
          <Link to="/search">
            <Search size={22} />
          </Link>
          <LayoutGrid size={22} />
          <MoreVertical size={22} />
        </div>
      </div>
      
      {/* Filter Row */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setIsSortSheetOpen(true)}
          className="flex items-center gap-1 bg-brand-primary text-white px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap"
        >
          {getSortLabel()}
        </button>
        <button 
          onClick={() => {
            setSort('latest');
            setIsSortSheetOpen(false);
          }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${sort === 'latest' ? 'bg-white/10 text-brand-text' : 'bg-transparent text-brand-secondary'}`}
        >
          Latest
        </button>
        <button 
          onClick={() => setIsGenreSheetOpen(true)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${selectedGenre ? 'bg-white/10 text-brand-text' : 'bg-transparent text-brand-secondary'}`}
        >
          {getGenreLabel()}
          <span className="text-[10px] ml-1">▼</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-brand-secondary">
            <p className="text-sm">{error}</p>
            {isOnline && (
              <button onClick={loadSeries} className="mt-4 px-6 py-2 bg-brand-primary text-white rounded-full text-sm font-medium">
                Retry
              </button>
            )}
          </div>
        ) : seriesList.length === 0 ? (
          <div className="flex items-center justify-center h-full text-brand-secondary text-sm">
            No series found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 pb-6">
            {seriesList.map(series => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        )}
      </div>

      {/* Modals/Bottom Sheets (Simple full screen overlays for now, to ensure they work on mobile cleanly) */}
      
      {/* Sort Sheet */}
      {isSortSheetOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 pb-safe">
          <div className="bg-brand-surface rounded-t-2xl p-4 animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Sort by</h2>
              <button onClick={() => setIsSortSheetOpen(false)}><X size={20} className="text-brand-secondary" /></button>
            </div>
            <div className="flex flex-col gap-1">
              {[
                { id: 'popular', label: 'Popular' },
                { id: 'latest', label: 'Latest' },
                { id: 'alphabetical', label: 'A-Z' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => { setSort(option.id); setIsSortSheetOpen(false); }}
                  className="flex items-center justify-between py-3 px-2 text-left text-sm"
                >
                  <span className={sort === option.id ? 'text-brand-text' : 'text-brand-secondary'}>{option.label}</span>
                  {sort === option.id && <div className="w-4 h-4 rounded-full border-4 border-brand-primary"></div>}
                  {sort !== option.id && <div className="w-4 h-4 rounded-full border-2 border-brand-secondary"></div>}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsSortSheetOpen(false)}
              className="w-full mt-4 bg-brand-primary text-white py-3 rounded-full font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Genre Sheet */}
      {isGenreSheetOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 pb-safe">
          <div className="bg-brand-surface rounded-t-2xl p-4 max-h-[80%] flex flex-col animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-lg font-medium">Genre</h2>
              <button onClick={() => setIsGenreSheetOpen(false)}><X size={20} className="text-brand-secondary" /></button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar pb-4">
              <button
                onClick={() => { setSelectedGenre(''); setIsGenreSheetOpen(false); }}
                className="flex items-center justify-between py-3 px-2 text-left text-sm"
              >
                <span className={selectedGenre === '' ? 'text-brand-text' : 'text-brand-secondary'}>All Genres</span>
                {selectedGenre === '' && <div className="w-4 h-4 rounded-full border-4 border-brand-primary"></div>}
                {selectedGenre !== '' && <div className="w-4 h-4 rounded-full border-2 border-brand-secondary"></div>}
              </button>
              {genres.map(g => (
                <button
                  key={g.slug}
                  onClick={() => { setSelectedGenre(g.slug); setIsGenreSheetOpen(false); }}
                  className="flex items-center justify-between py-3 px-2 text-left text-sm"
                >
                  <span className={selectedGenre === g.slug ? 'text-brand-text' : 'text-brand-secondary'}>{g.name}</span>
                  {selectedGenre === g.slug && <div className="w-4 h-4 rounded-full border-4 border-brand-primary"></div>}
                  {selectedGenre !== g.slug && <div className="w-4 h-4 rounded-full border-2 border-brand-secondary"></div>}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsGenreSheetOpen(false)}
              className="w-full mt-2 shrink-0 bg-brand-primary text-white py-3 rounded-full font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
