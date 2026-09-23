'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Share2, MoreVertical, Download, Bookmark, Play, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAppLibraryStore } from '@/store/app-library-store';
import { useDownloadStore } from '@/store/download-store';
import { Capacitor } from '@capacitor/core';
import { SeriesRepository } from '@/lib/sqlite/repository';
import { nativeUserId } from '@/components/native/NativeInitializer';

export function AndroidSeriesView({ series, chapters }: { series: any, chapters: any[] }) {
  const router = useRouter();
  const { savedSeries, addToLibrary, removeFromLibrary, activeUserId } = useAppLibraryStore();
  const { downloads, startDownload } = useDownloadStore();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [localChapters, setLocalChapters] = useState<Record<string, any>>({});
  const [sortDesc, setSortDesc] = useState(true);

  const inLibrary = !!savedSeries[series.id];

  // Fetch SQLite read states
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const fetchReadStates = async () => {
        const userId = nativeUserId || activeUserId;
        if (!userId) return;
        const sqliteChapters = await SeriesRepository.getChapters(userId, series.id);
        const chapterMap: Record<string, any> = {};
        sqliteChapters.forEach(c => {
          chapterMap[c.serverChapterId] = c;
        });
        setLocalChapters(chapterMap);
      };
      fetchReadStates();
    }
  }, [series.id, activeUserId]);

  const handleToggleLibrary = () => {
    if (inLibrary) {
      removeFromLibrary(series.id);
    } else {
      addToLibrary({
        seriesId: series.id,
        title: series.title,
        slug: series.slug,
        coverImage: series.coverImage,
        author: series.authors?.[0]?.name,
        artist: series.artists?.[0]?.name,
        description: series.synopsis || series.description,
        status: series.status,
        genres: series.genres,
      });
    }
  };

  const handleDownload = (chapter: any) => {
    startDownload(chapter.id, {
      seriesId: series.id,
      seriesTitle: series.title,
      seriesSlug: series.slug,
      chapterNumber: chapter.number,
      chapterId: chapter.id,
      filename: `chapter_${chapter.number}_${chapter.id}`,
      coverImage: series.coverImage,
      sourceType: chapter.sourceType,
    });
  };

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => {
      if (sortDesc) {
        return b.number - a.number;
      }
      return a.number - b.number;
    });
  }, [chapters, sortDesc]);

  // Merge state
  const mergedChapters = sortedChapters.map(ch => {
    const local = localChapters[ch.id];
    const dl = downloads[ch.id];
    return {
      ...ch,
      isRead: local?.isRead === 1 || local?.isRead === true,
      readAt: local?.readAt,
      downloadState: dl?.status || 'NONE'
    };
  });

  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-6">
      {/* ── App Bar ────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-transparent flex items-center justify-between px-2 py-3 transition-colors duration-300">
        <button
          onClick={() => router.back()}
          className="p-2 bg-black/40 backdrop-blur rounded-full text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-black/40 backdrop-blur rounded-full text-white">
            <Share2 className="h-5 w-5" />
          </button>
          <button className="p-2 bg-black/40 backdrop-blur rounded-full text-white">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Hero Banner ────────────────────────────────────── */}
      <div className="relative h-[40vh] w-full overflow-hidden shrink-0">
        <Image
          src={series.bannerImage || series.coverImage}
          alt={series.title}
          fill
          className="object-cover blur-xl opacity-30 scale-125"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

        {/* Cover inside Banner */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-4 items-end">
          <div className="relative w-28 aspect-[2/3] rounded-md overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-white/10 shrink-0">
            <Image
              src={series.coverImage}
              alt={series.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col pb-1">
            <h1 className="text-2xl font-bold text-white leading-tight line-clamp-3 drop-shadow-md">
              {series.title}
            </h1>
            <p className="text-sm text-text-secondary mt-1 font-medium drop-shadow">
              {series.authors?.[0]?.name || 'Unknown Author'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────── */}
      <div className="px-4 py-4 flex gap-3">
        <button
          onClick={handleToggleLibrary}
          className={cn(
            "flex-1 py-3 rounded-full flex flex-col items-center justify-center transition-colors shadow-sm",
            inLibrary ? "bg-primary text-white" : "bg-surface text-text-primary"
          )}
        >
          <Bookmark className="h-5 w-5 mb-1" fill={inLibrary ? "currentColor" : "none"} />
          <span className="text-[11px] font-semibold">{inLibrary ? 'In Library' : 'Add to Library'}</span>
        </button>

        <button
          onClick={() => firstChapter && router.push(`/android-reader?seriesSlug=${series.slug}&chapterSlug=${firstChapter.slug}&id=${firstChapter.id}&seriesId=${series.id}`)}
          className="flex-[2] bg-primary text-white py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <Play className="h-5 w-5" fill="currentColor" />
          <span className="font-bold text-sm tracking-wide">Start Reading</span>
        </button>
      </div>

      {/* ── Info & Description ──────────────────────────────── */}
      <div className="px-4 py-2">
        <div className="flex flex-wrap gap-2 mb-4">
          {series.genres.slice(0, 5).map((g: any) => (
            <span key={g.slug} className="px-2.5 py-1 bg-surface text-text-secondary text-xs rounded-full border border-border">
              {g.name}
            </span>
          ))}
        </div>

        <div
          className="relative text-sm text-text-secondary leading-relaxed"
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        >
          <div className={cn(
            "transition-all duration-300",
            !isDescriptionExpanded && "line-clamp-3"
          )}>
            {series.synopsis || series.description || 'No description available.'}
          </div>
          {!isDescriptionExpanded && (
            <div className="absolute bottom-0 right-0 bg-background pl-4 text-text-primary font-bold">
              ...more
            </div>
          )}
        </div>
      </div>

      {/* ── Chapters ────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2 px-4">
          <h2 className="text-[15px] font-bold">
            {chapters.length} Chapters
          </h2>
          <button
            onClick={() => setSortDesc(!sortDesc)}
            className="p-2 hover:bg-surface rounded-full transition-colors flex items-center gap-1 text-sm text-text-muted"
          >
            {sortDesc ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex flex-col pb-20">
          {mergedChapters.map(ch => (
            <div
              key={ch.id}
              onClick={() => router.push(`/android-reader?seriesSlug=${series.slug}&chapterSlug=${ch.slug}&id=${ch.id}&seriesId=${series.id}`)}
              className={cn(
                "flex items-center justify-between py-3 px-4 border-b border-border-subtle active:bg-surface/50 transition-colors",
                ch.isRead ? "opacity-60" : ""
              )}
            >
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "font-medium",
                  ch.isRead ? "text-text-muted" : "text-text-primary"
                )}>
                  {ch.label || `Chapter ${ch.number}`}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(ch.publishedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {ch.downloadState === 'COMPLETED' ? (
                  <div className="text-primary"><Check className="h-5 w-5" /></div>
                ) : ch.downloadState === 'DOWNLOADING' ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(ch);
                    }}
                    className="p-1 text-text-muted"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
