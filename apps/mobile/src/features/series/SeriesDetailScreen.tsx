import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient, type SeriesDetail } from '../../api/client';
import { SeriesDAO, ChapterDAO, type Chapter as LocalChapter } from '../../db/dao';
import { useNetworkStore } from '../../store/network';
import { ChapterList } from './ChapterList';
import { ArrowLeft, Download, Filter, MoreVertical, Heart, Globe } from 'lucide-react';

export function SeriesDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStore();
  
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [localChapters, setLocalChapters] = useState<Record<string, LocalChapter>>({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

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
    <div className="flex flex-col h-full bg-brand-bg text-brand-text overflow-y-auto z-50 fixed inset-0">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-brand-bg/95 backdrop-blur px-4 py-3 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-brand-text">
            <ArrowLeft size={24} />
          </button>
          <span className="font-semibold text-lg truncate w-48">{series.title}</span>
        </div>
        <div className="flex items-center gap-2 text-brand-text">
          <button className="p-2 active:bg-white/10 rounded-full transition-colors">
            <Download size={22} />
          </button>
          <button className="p-2 active:bg-white/10 rounded-full transition-colors">
            <Filter size={22} />
          </button>
          <button className="p-2 active:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={22} />
          </button>
        </div>
      </div>

      {/* Main Metadata Section */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex gap-4">
          <div className="w-28 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-brand-card">
            <img src={series.coverImage} alt={series.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold mb-1 leading-tight">{series.title}</h1>
            <p className="text-sm text-brand-secondary mb-1 flex items-center gap-1">
              <span className="truncate">{series.authors?.map(a => a.name).join(', ') || 'Unknown Author'}</span>
            </p>
            {series.artists && series.artists.length > 0 && series.artists[0].name !== series.authors?.[0]?.name && (
              <p className="text-sm text-brand-secondary mb-1 flex items-center gap-1">
                <span className="truncate">{series.artists.map(a => a.name).join(', ')}</span>
              </p>
            )}
            <p className="text-sm text-brand-secondary">
              {series.status || 'Ongoing'} • {series.type || 'Manhwa'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5">
          <button 
            onClick={toggleBookmark} 
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border text-sm font-medium transition-colors ${
              isBookmarked 
                ? 'border-brand-primary text-brand-primary bg-brand-primary/10' 
                : 'border-white/10 text-brand-text bg-white/5'
            }`}
          >
            <Heart size={18} fill={isBookmarked ? "currentColor" : "none"} />
            {isBookmarked ? 'In Library' : 'Add to Library'}
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-white/10 text-brand-text bg-white/5 text-sm font-medium"
          >
            <Globe size={18} />
            WebView
          </button>
        </div>

        {/* Description */}
        {series.synopsis && (
          <div className="mt-5">
            <div 
              className={`text-[13px] leading-relaxed text-brand-secondary ${!isDescExpanded ? 'line-clamp-3' : ''}`}
              dangerouslySetInnerHTML={{ __html: series.synopsis }} 
            />
            {!isDescExpanded && (
              <button 
                onClick={() => setIsDescExpanded(true)}
                className="text-brand-primary text-xs font-medium mt-1 flex items-center gap-1"
              >
                Read more <span className="text-[10px]">▼</span>
              </button>
            )}
          </div>
        )}

        {/* Genres */}
        {series.genres && series.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {series.genres.map(g => (
              <span key={g.slug} className="text-xs px-3 py-1 bg-white/5 rounded-full text-brand-text border border-white/5">
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 sticky top-[56px] z-10 bg-brand-bg flex justify-between items-center">
        <h2 className="font-semibold">{series.chapters?.length || 0} chapters</h2>
        <button className="text-brand-secondary"><Filter size={18} /></button>
      </div>

      <ChapterList chapters={series.chapters || []} localChapters={localChapters} />
    </div>
  );
}
