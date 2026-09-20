import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient, type SeriesDetail } from '../../api/client';
import { SeriesDAO, ChapterDAO, type Chapter as LocalChapter } from '../../db/dao';
import { useNetworkStore } from '../../store/network';
import { ChapterList } from './ChapterList';
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react';

export function SeriesDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStore();
  
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [localChapters, setLocalChapters] = useState<Record<string, LocalChapter>>({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    
    try {
      let data: SeriesDetail | null = null;

      if (isOnline) {
        data = await ApiClient.getSeriesDetail(slug);
      }

      const localSeries = await SeriesDAO.getBySlug(slug);
      
      // If API succeeded, cache it
      if (data) {
        // Keep existing bookmark state if we have it locally
        const bookmarked = localSeries ? localSeries.bookmarked : false;
        
        await SeriesDAO.upsert({
          id: data.id,
          slug: data.slug,
          title: data.title,
          cover: data.coverImage || null,
          synopsis: data.synopsis || data.description || null,
          author: data.authors.map(a => a.name).join(', ') || null,
          artist: data.artists.map(a => a.name).join(', ') || null,
          type: data.type || null,
          status: data.status || null,
          genres: data.genres.map(g => g.name).join(',') || null,
          bookmarked,
          updatedAt: Date.now()
        });

        // Upsert chapters
        if (data.chapters) {
          for (const ch of data.chapters) {
            await ChapterDAO.upsert({
              id: ch.id,
              seriesId: data.id,
              title: ch.title || ch.label || null,
              chapterNumber: ch.number ?? null,
              slug: ch.slug || null,
              totalPages: ch.totalPages ?? null,
              publishedAt: ch.publishedAt || null,
              downloadStatus: null,
              localFilePath: null,
              read: false,
              readingProgress: 0,
              updatedAt: Date.now()
            });
          }
        }
        
        setIsBookmarked(bookmarked);
        setSeries(data);
      } else if (localSeries) {
        // Fallback to offline
        // Reconstruct SeriesDetail from SQLite
        setIsBookmarked(localSeries.bookmarked);
        
        const cachedChapters = await ChapterDAO.getBySeriesId(localSeries.id);
        
        setSeries({
          id: localSeries.id,
          title: localSeries.title,
          slug: localSeries.slug,
          coverImage: localSeries.cover || '',
          type: localSeries.type || '',
          status: localSeries.status || '',
          isNSFW: false,
          averageRating: 0,
          ratingCount: 0,
          totalViews: 0,
          totalBookmarks: 0,
          chapterCount: cachedChapters.length,
          updatedAt: new Date(localSeries.updatedAt).toISOString(),
          alternativeTitles: [],
          description: localSeries.synopsis || '',
          synopsis: localSeries.synopsis || '',
          readingDirection: 'VERTICAL',
          isHot: false,
          isFeatured: false,
          isEditorChoice: false,
          isHiddenGem: false,
          tags: [],
          authors: localSeries.author ? localSeries.author.split(',').map(name => ({ name: name.trim(), slug: '' })) : [],
          artists: localSeries.artist ? localSeries.artist.split(',').map(name => ({ name: name.trim(), slug: '' })) : [],
          genres: localSeries.genres ? localSeries.genres.split(',').map(g => ({ name: g.trim(), slug: g.trim() })) : [],
          chapters: cachedChapters.map(c => ({
            id: c.id,
            number: c.chapterNumber || null,
            title: c.title || undefined,
            slug: c.slug || '',
            totalPages: c.totalPages || 0,
            totalViews: 0,
            publishedAt: c.publishedAt || undefined,
            isRead: c.read,
            sourceType: 'UPLOAD',
          })),
          createdAt: new Date(localSeries.updatedAt).toISOString()
        });
      } else {
        setError('You are offline and this series is not cached.');
      }

      // Load local chapter states (read, downloaded)
      if (data || localSeries) {
        const id = data?.id || localSeries?.id;
        if (id) {
          const localChaps = await ChapterDAO.getBySeriesId(id);
          const map: Record<string, LocalChapter> = {};
          localChaps.forEach(lc => {
            map[lc.id] = lc;
          });
          setLocalChapters(map);
        }
      }

    } catch (e) {
      console.error('loadData error:', e);
      setError(`Failed to load series details: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, [slug, isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleBookmark = async () => {
    if (!series) return;
    const newState = !isBookmarked;
    setIsBookmarked(newState);
    await SeriesDAO.toggleBookmark(series.id, newState);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-100">
        <div className="p-4 border-b border-slate-800 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4"><ArrowLeft size={24} /></button>
          <span className="font-semibold">Error</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <p>{error || 'Series not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto z-50 fixed inset-0">
      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-200 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={toggleBookmark} className={isBookmarked ? 'text-red-500' : 'text-slate-400 hover:text-white'}>
            <Bookmark size={24} fill={isBookmarked ? "currentColor" : "none"} />
          </button>
          <button className="text-slate-400 hover:text-white">
            <Share2 size={24} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 h-64 overflow-hidden">
          <img src={series.bannerImage || series.coverImage} className="w-full h-full object-cover blur-xl opacity-30 scale-110" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>
        
        <div className="relative pt-8 px-4 flex flex-col items-center text-center">
          <div className="w-32 md:w-48 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl ring-1 ring-slate-800 bg-slate-800 mb-4">
            <img src={series.coverImage} alt={series.title} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{series.title}</h1>
          <p className="text-sm text-slate-400 mb-3">
            {series.authors.map(a => a.name).join(', ')} • {series.type} • {series.status}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {series.genres.map(g => (
              <span key={g.slug} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-800 rounded text-slate-300">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {series.synopsis && (
        <div className="px-4 pb-6 text-sm text-slate-300 leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: series.synopsis }} />
        </div>
      )}

      <div className="px-4 py-3 bg-slate-900 border-t border-b border-slate-800 sticky top-[68px] z-10 flex justify-between items-center">
        <h2 className="font-semibold">{series.chapters.length} Chapters</h2>
      </div>

      <ChapterList chapters={series.chapters} localChapters={localChapters} />
    </div>
  );
}
