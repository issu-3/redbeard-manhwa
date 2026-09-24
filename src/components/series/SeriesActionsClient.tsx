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

  // Placeholder with same dimensions — shown during SSR and before detection completes.
  const buttonPlaceholder = (
    <div className={isMobile
      ? "flex flex-col items-center justify-center gap-1 px-4 py-2 w-full max-w-[120px] opacity-0 pointer-events-none"
      : "w-14 h-[52px] rounded-xl border-2 border-transparent opacity-0 pointer-events-none"
    } aria-hidden="true" />
  );

  if (isMobile) {
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
                    router.push(`/android-reader?seriesSlug=${seriesSlug}&chapterSlug=${chapterLabel}&id=${targetChapter.id}&seriesId=${seriesId}`);
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
            className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-primary px-3 py-2.5 md:px-4 md:py-3.5 font-bold text-sm md:text-base text-white active:scale-95 transition-transform shadow-lg shadow-primary/25"
          >
            <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
            {isLoading 
              ? 'Loading...' 
              : (hasHistory 
                  ? `Continue ${isExternal ? 'Download' : 'Ch.'} ${continueChapterObj?.label || continueChapterObj?.number || continueReadingChapter}` 
                  : (isExternal ? 'Download First Chapter' : 'Read First Chapter')
                )
            }
          </Link>
        )}
        {!isMounted
          ? buttonPlaceholder
          : <BookmarkButton 
              seriesId={seriesId} 
              initialBookmarked={isBookmarked} 
              title={seriesTitle}
              slug={seriesSlug}
              coverImage={coverImage}
              continueReadingChapter={continueReadingChapter}
            />
        }
      </>
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
                  router.push(`/android-reader?seriesSlug=${seriesSlug}&chapterSlug=${chapterLabel}&id=${targetChapter.id}&seriesId=${seriesId}`);
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
          className="flex items-center gap-2 rounded-xl bg-primary px-10 py-4 font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25"
        >
          <BookOpen className="h-5 w-5" />
            {isLoading 
              ? 'Loading...' 
              : (hasHistory 
                  ? `Continue ${isExternal ? 'Download' : 'Ch.'} ${continueChapterObj?.label || continueChapterObj?.number || continueReadingChapter}` 
                  : (isExternal ? 'Download First Chapter' : 'Read First Chapter')
                )
            }
        </Link>
      )}
      
      {!isMounted
        ? buttonPlaceholder
        : <BookmarkButton 
            seriesId={seriesId} 
            initialBookmarked={isBookmarked} 
            title={seriesTitle}
            slug={seriesSlug}
            coverImage={coverImage}
            continueReadingChapter={continueReadingChapter}
          />
      }
      
      <button className="flex items-center justify-center rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm w-[56px] text-text-primary transition-all hover:border-primary/50 hover:bg-card-hover hover:text-primary">
        <Share2 className="h-5 w-5" />
      </button>
    </>
  );
}
