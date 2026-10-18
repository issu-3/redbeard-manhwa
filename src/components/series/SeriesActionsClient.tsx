'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Share2 } from 'lucide-react';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

interface SeriesActionsProps {
  seriesId: string;
  seriesSlug: string;
  seriesTitle: string;
  coverImage: string | null;
  firstChapterLink: string;
  chapters: { id: string; number: number | null; label?: string | null; slug?: string; sourceType: string | null; downloadUrl: string | null }[];
  isMobile?: boolean;
}

export function SeriesActionsClient({ seriesId, seriesSlug, seriesTitle, coverImage, firstChapterLink, chapters, isMobile }: SeriesActionsProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [continueReadingChapter, setContinueReadingChapter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // We still track isNative to prevent wrong button flashing if needed, though we now always render BookmarkButton
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);

    import('@/lib/native/api').then(({ nativeFetch }) => {
      nativeFetch(`/api/series/${seriesSlug}/user-data`)
        .then(res => res.json())
        .then(data => {
          setIsBookmarked(data.isBookmarked);
          setContinueReadingChapter(data.continueReadingChapter);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    });
  }, [seriesSlug]);

  const continueChapterObj = continueReadingChapter 
    ? chapters.find(c => c.number === continueReadingChapter || c.label === String(continueReadingChapter))
    : null;

  const safeContinueSlug = continueChapterObj ? (typeof continueChapterObj.slug === 'string' && continueChapterObj.slug.trim() ? continueChapterObj.slug : continueChapterObj.number != null ? String(continueChapterObj.number) : null) : null;

  const continueLink = continueChapterObj
    ? (continueChapterObj.sourceType === 'DOWNLOAD' && continueChapterObj.downloadUrl ? `/download/${continueChapterObj.id}` : safeContinueSlug ? `/series/${seriesSlug}/chapter/${safeContinueSlug}` : '#')
    : firstChapterLink;

  const hasHistory = !!continueChapterObj;

  const isExternal = continueChapterObj 
    ? continueChapterObj.sourceType === 'DOWNLOAD'
    : firstChapterLink.includes('/api/chapter/');

  const targetLink = hasHistory ? continueLink : firstChapterLink;

  const rawChapterNumber = continueChapterObj?.label || continueChapterObj?.number || continueReadingChapter;
  const formattedChapter = rawChapterNumber 
    ? String(rawChapterNumber).replace(/^(ch\.|chapter)\s*/i, '')
    : '';

  const readLabel = isLoading
    ? 'Loading...'
    : hasHistory
      ? `Continue Ch. ${formattedChapter}`
      : 'Read First Chapter';

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://redbeard.store/series/${seriesSlug}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: seriesTitle,
          text: `Read ${seriesTitle} online on REDBEARD`,
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed or share failed, fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        const { toast } = await import('sonner');
        toast.success('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  if (isMobile) {
    return (
      <div className="flex items-center gap-2.5 w-full">
        {/* Primary Action (approx. 60% width) */}
        {targetLink !== '#' && (
          <Link
            href={targetLink}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={async (e) => {
              if (isExternal && Capacitor.isNativePlatform()) {
                e.preventDefault();

                const targetChapter = hasHistory ? continueChapterObj : (chapters.length > 0 ? chapters[0] : null);
                const chapterLabel = targetChapter?.label || targetChapter?.number?.toString() || '1';

                if (targetChapter) {
                  const { useDownloadStore } = await import('@/store/download-store');
                  const state = useDownloadStore.getState().downloads[targetChapter.id];
                  if (state && state.status === 'COMPLETED' && state.localUri) {
                    window.location.href = `/android-reader/index.html?seriesSlug=${seriesSlug}&chapterSlug=${chapterLabel}&id=${targetChapter.id}&seriesId=${seriesId}`;
                    return;
                  }
                }

                const handleDownload = (urlToDownload: string, apiDownloadUrl?: string) => {
                  if (targetChapter) {
                    import('@/store/download-store').then(({ useDownloadStore }) => {
                      useDownloadStore.getState().queueDownload(targetChapter.id, {
                        seriesId,
                        seriesTitle,
                        seriesSlug,
                        chapterNumber: chapterLabel,
                        filename: `${seriesSlug}-chapter-${chapterLabel}.pdf`,
                      });
                    });
                  }
                };

                if (targetLink.startsWith('/api/')) {
                  const resolveUrl = targetLink + (targetLink.includes('?') ? '&' : '?') + 'resolve=true';
                  try {
                    const { nativeFetch } = await import('@/lib/native/api');
                    const res = await nativeFetch(resolveUrl);
                    if (res.ok) {
                      const data = await res.json();
                      if (data.url) {
                        handleDownload(data.url, resolveUrl);
                        return;
                      }
                    }
                  } catch (err) {
                    console.error('Failed to resolve API URL', err);
                  }
                  const absoluteUrl = `https://redbeard.store${targetLink}`;
                  handleDownload(absoluteUrl);
                } else if (targetLink.startsWith('http')) {
                  if (targetLink.toLowerCase().endsWith('.pdf')) {
                    handleDownload(targetLink);
                  } else {
                    import('@capacitor/browser').then(({ Browser }) => {
                      Browser.open({ url: targetLink });
                    });
                  }
                } else {
                  router.push(targetLink);
                }
              }
            }}
            className="flex-[6] min-w-0 h-[52px] flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary/90 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary/25 transition-all active:scale-[0.98] px-3"
            aria-label={readLabel}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{readLabel}</span>
          </Link>
        )}

        {/* Secondary Action (Bookmark) — approx 40% width */}
        <div className="flex-[4] min-w-0">
          {!isMounted ? (
            <div className="w-full h-[52px] rounded-xl border border-border/80 bg-card/60 animate-pulse" aria-hidden="true" />
          ) : (
            <BookmarkButton 
              seriesId={seriesId} 
              initialBookmarked={isBookmarked} 
              title={seriesTitle}
              slug={seriesSlug}
              coverImage={coverImage}
              continueReadingChapter={continueReadingChapter}
              className="w-full h-[52px] rounded-xl text-xs sm:text-sm px-2 justify-center"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {targetLink !== '#' && (
        <Link
          href={targetLink}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={async (e) => {
            if (isExternal && Capacitor.isNativePlatform()) {
              e.preventDefault();

              const targetChapter = hasHistory ? continueChapterObj : (chapters.length > 0 ? chapters[0] : null);
              const chapterLabel = targetChapter?.label || targetChapter?.number?.toString() || '1';

              if (targetChapter) {
                const { useDownloadStore } = await import('@/store/download-store');
                const state = useDownloadStore.getState().downloads[targetChapter.id];
                if (state && state.status === 'COMPLETED' && state.localUri) {
                  window.location.href = `/android-reader/index.html?seriesSlug=${seriesSlug}&chapterSlug=${chapterLabel}&id=${targetChapter.id}&seriesId=${seriesId}`;
                  return;
                }
              }

              const handleDownload = (urlToDownload: string, apiDownloadUrl?: string) => {
                if (targetChapter) {
                  import('@/store/download-store').then(({ useDownloadStore }) => {
                    useDownloadStore.getState().queueDownload(targetChapter.id, {
                      seriesId,
                      seriesTitle,
                      seriesSlug,
                      chapterNumber: chapterLabel,
                      filename: `${seriesSlug}-chapter-${chapterLabel}.pdf`,
                    });
                  });
                }
              };

              if (targetLink.startsWith('/api/')) {
                const resolveUrl = targetLink + (targetLink.includes('?') ? '&' : '?') + 'resolve=true';
                try {
                  const { nativeFetch } = await import('@/lib/native/api');
                  const res = await nativeFetch(resolveUrl);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                      handleDownload(data.url, resolveUrl);
                      return;
                    }
                  }
                } catch (err) {
                  console.error('Failed to resolve API URL', err);
                }
                const absoluteUrl = `https://redbeard.store${targetLink}`;
                handleDownload(absoluteUrl);
              } else if (targetLink.startsWith('http')) {
                if (targetLink.toLowerCase().endsWith('.pdf')) {
                  handleDownload(targetLink);
                } else {
                  import('@capacitor/browser').then(({ Browser }) => {
                    Browser.open({ url: targetLink });
                  });
                }
              } else {
                router.push(targetLink);
              }
            }
          }}
          className="flex items-center gap-2 h-12 rounded-xl bg-primary px-8 font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25 text-sm"
          aria-label={readLabel}
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          <span>{readLabel}</span>
        </Link>
      )}
      
      {!isMounted ? (
        <div className="w-36 h-12 rounded-xl border border-border/80 bg-card/60 animate-pulse" aria-hidden="true" />
      ) : (
        <BookmarkButton 
          seriesId={seriesId} 
          initialBookmarked={isBookmarked} 
          title={seriesTitle}
          slug={seriesSlug}
          coverImage={coverImage}
          continueReadingChapter={continueReadingChapter}
          className="h-12 px-6 rounded-xl border-border/80 bg-card/70 hover:bg-card text-text-primary text-sm font-semibold"
        />
      )}
      
      <button 
        onClick={handleShare}
        className="flex items-center justify-center rounded-xl border border-border/80 bg-card/70 backdrop-blur-sm h-12 w-12 text-text-primary transition-all hover:border-primary/50 hover:bg-card hover:text-primary active:scale-95"
        title="Share series"
        aria-label="Share series"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </>
  );
}
