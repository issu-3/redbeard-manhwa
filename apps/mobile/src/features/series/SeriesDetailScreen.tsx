import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient, type SeriesDetail } from '../../api/client';
import { SeriesDAO, ChapterDAO, type Chapter as LocalChapter } from '../../db/dao';
import { useNetworkStore } from '../../store/network';
import { ChapterList } from './ChapterList';
import { ArrowLeft, Download, Filter, MoreVertical, Heart, Globe, RefreshCw, Tags, Share2, FileText } from 'lucide-react';
import { startNativeDownload } from '../../lib/native-download';
import { useDownloadStore } from '../../store/download-store';
import { FilterSheet, type FilterState, type SortState, type DisplayState } from './FilterSheet';

export function SeriesDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStore();
  const { downloads } = useDownloadStore();

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [localChapters, setLocalChapters] = useState<Record<string, LocalChapter>>({});
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);

  const [filters, setFilters] = useState<FilterState>({ downloaded: false, unread: false });
  const [sort, setSort] = useState<SortState>({ by: 'chapterNumber', desc: true });
  const [display, setDisplay] = useState<DisplayState>({ showTitle: 'chapterNumber' });

  useEffect(() => {
    const handlePopState = () => {
      if (showThreeDotMenu) {
        setShowThreeDotMenu(false);
      }
      if (showFilterSheet) {
        setShowFilterSheet(false);
      }
    };

    if (showThreeDotMenu || showFilterSheet) {
      window.history.pushState({ menu: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showThreeDotMenu, showFilterSheet]);

  const closeThreeDotMenu = () => {
    if (showThreeDotMenu) {
      setShowThreeDotMenu(false);
      if (window.history.state?.menu) {
        window.history.back();
      }
    }
  };

  const toggleThreeDotMenu = () => {
    if (showThreeDotMenu) {
      closeThreeDotMenu();
    } else {
      setShowThreeDotMenu(true);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadAll = async () => {
    if (!series || !series.chapters || series.chapters.length === 0) {
      showToast('No chapters available');
      return;
    }

    const downloadableChapters = series.chapters.filter(ch => ch.downloadUrl);

    if (downloadableChapters.length === 0) {
      showToast('No downloadable chapters available.');
      return;
    }

    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    showToast(`Starting download of ${downloadableChapters.length} chapters...`);

    (async () => {
      for (const ch of downloadableChapters) {
        try {
          await startNativeDownload(
            ch.id,
            ch.downloadUrl!,
            series.id,
            series.title,
            series.slug,
            ch.number || '0'
          );
        } catch (e) {
          console.warn(`Failed to start download for chapter ${ch.number}`, e);
        }
      }
      setIsDownloadingAll(false);
    })();
  };

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

        setIsBookmarked(bookmarked);
        setSeries(data);

        // Fetch existing local chapters to immediately update UI state (fast 1 query)
        const localChaps = await ChapterDAO.getBySeriesId(data.id);
        const map: Record<string, LocalChapter> = {};
        localChaps.forEach(lc => {
          map[lc.id] = lc;
        });
        setLocalChapters(map);

        // Defer the massive chapter upserts to prevent freezing the UI thread
        setTimeout(async () => {
          if (data && data.chapters) {
            for (const ch of data.chapters) {
              try {
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
                // Small yield to let React and the browser breathe during huge loops
                await new Promise(r => setTimeout(r, 0));
              } catch (err) {
                console.error('Failed to upsert chapter:', err);
              }
            }
          }
        }, 100);
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

      // Load local chapter states (read, downloaded) if we didn't already
      if (!data && localSeries) {
        const id = localSeries?.id;
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
      const errMsg = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'Unknown error');
      setError(`Failed to load series details: ${errMsg}`);
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
      <div className="flex flex-col h-full items-center justify-center bg-brand-bg gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-brand-primary border-t-transparent"></div>
        <span className="text-sm text-brand-secondary">Loading series...</span>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col h-full bg-brand-bg text-brand-text">
        <div className="p-4 border-b border-white/5 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 text-brand-text"><ArrowLeft size={24} /></button>
          <span className="font-semibold">Error</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <p className="text-brand-secondary">{error || 'Series not found'}</p>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium active:scale-95 transition-transform"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  let filteredChapters = [...(series.chapters || [])];

  // Filter
  filteredChapters = filteredChapters.filter(ch => {
    const local = localChapters[ch.id];
    const isDownloaded = local?.downloadStatus === 'COMPLETED' || downloads[ch.id]?.status === 'COMPLETED';

    // Use local read state if available, fallback to server isRead
    const isRead = local?.read ?? ch.isRead ?? false;

    if (filters.downloaded && !isDownloaded) return false;
    if (filters.unread && isRead) return false;

    return true;
  });

  // Sort
  filteredChapters.sort((a, b) => {
    let result = 0;
    switch (sort.by) {
      case 'chapterNumber':
        result = (a.number ?? 0) - (b.number ?? 0);
        break;
      case 'uploadDate':
        result = new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime();
        break;
      case 'alphabetically':
        result = String(a.title || a.label || '').localeCompare(String(b.title || b.label || ''));
        break;
      case 'source':
        result = String(a.sourceType || '').localeCompare(String(b.sourceType || ''));
        break;
    }
    return sort.desc ? -result : result;
  });

  const activeFiltersCount = (filters.downloaded ? 1 : 0) + (filters.unread ? 1 : 0);

  return (
    <div id="series-detail-root" className="flex flex-col min-h-full bg-brand-bg text-brand-text">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-brand-primary text-brand-text px-4 py-2 rounded-full shadow-lg font-medium text-sm transition-all whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-brand-bg px-4 py-3 flex items-center justify-between pt-safe border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-brand-text">
            <ArrowLeft size={24} />
          </button>
          <span className="font-semibold text-lg truncate w-48">{series.title}</span>
        </div>
        <div className="flex items-center gap-2 text-brand-text relative">
          <button
            onClick={handleDownloadAll}
            className={`p-2 active:bg-white/10 rounded-full transition-colors ${isDownloadingAll ? 'opacity-50' : ''}`}
          >
            <Download size={22} />
          </button>
          <button onClick={() => setShowFilterSheet(true)} className="p-2 active:bg-white/10 rounded-full transition-colors relative">
            <Filter size={22} />
            {activeFiltersCount > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary border border-brand-bg" />}
          </button>

          <FilterSheet
            isOpen={showFilterSheet}
            onClose={() => {
              setShowFilterSheet(false);
              if (window.history.state?.menu) window.history.back();
            }}
            filters={filters}
            onFilterChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            display={display}
            onDisplayChange={setDisplay}
          />

          <button onClick={toggleThreeDotMenu} className="p-2 active:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={22} />
          </button>

          {showThreeDotMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeThreeDotMenu} />

              <div className="absolute top-[110%] right-0 w-60 bg-brand-card border border-white/5 rounded-xl shadow-2xl py-2 z-50 overflow-hidden flex flex-col origin-top-right animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    closeThreeDotMenu();
                    loadData();
                  }}
                  className="px-4 py-3 text-[15px] text-left text-brand-text flex items-center gap-3 active:bg-white/5 transition-colors"
                >
                  <RefreshCw size={18} className="text-brand-secondary" />
                  Refresh
                </button>
                <button
                  className="px-4 py-3 text-[15px] text-left text-brand-text opacity-50 flex items-center gap-3 active:bg-white/5 transition-colors"
                  disabled
                >
                  <Tags size={18} className="text-brand-secondary" />
                  Edit categories
                </button>
                <button
                  onClick={() => {
                    closeThreeDotMenu();
                    showToast('Capacitor Share plugin is not installed');
                  }}
                  className="px-4 py-3 text-[15px] text-left text-brand-text flex items-center gap-3 active:bg-white/5 transition-colors"
                >
                  <Share2 size={18} className="text-brand-secondary" />
                  Share
                </button>
                <button
                  className="px-4 py-3 text-[15px] text-left text-brand-text opacity-50 flex items-center gap-3 active:bg-white/5 transition-colors"
                  disabled
                >
                  <FileText size={18} className="text-brand-secondary" />
                  Notes
                </button>
              </div>
            </>
          )}
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border text-sm font-medium transition-colors ${isBookmarked
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
        <h2 className="font-semibold">
          {filteredChapters.length} {filteredChapters.length === 1 ? 'chapter' : 'chapters'}
          {activeFiltersCount > 0 && <span className="text-brand-secondary text-sm ml-2">({activeFiltersCount} Filter{activeFiltersCount > 1 ? 's' : ''})</span>}
        </h2>
        <button onClick={() => setShowFilterSheet(true)} className="text-brand-secondary"><Filter size={18} /></button>
      </div>

      {filteredChapters.length === 0 ? (
        <div className="py-8 text-center text-brand-secondary text-sm">
          {activeFiltersCount > 0 ? 'No chapters match the selected filters.' : 'No chapters available.'}
        </div>
      ) : (
        <ChapterList chapters={filteredChapters} localChapters={localChapters} displayPref={display.showTitle} />
      )}
    </div>
  );
}
