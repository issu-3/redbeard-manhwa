'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Share2 } from 'lucide-react';
import { BookmarkButton } from '@/components/shared/BookmarkButton';

interface SeriesActionsProps {
  seriesId: string;
  seriesSlug: string;
  firstChapterLink: string;
  chapters: { number: number | null; label?: string | null; sourceType: string | null; externalUrl: string | null }[];
  isMobile?: boolean;
}

export function SeriesActionsClient({ seriesId, seriesSlug, firstChapterLink, chapters, isMobile }: SeriesActionsProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [continueReadingChapter, setContinueReadingChapter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/series/${seriesSlug}/user-data`)
      .then(res => res.json())
      .then(data => {
        setIsBookmarked(data.isBookmarked);
        // continueReadingChapter might be a number or a string if label is returned in the future
        setContinueReadingChapter(data.continueReadingChapter);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [seriesSlug]);

  const continueChapterObj = continueReadingChapter 
    ? chapters.find(c => c.number === continueReadingChapter || c.label === String(continueReadingChapter))
    : null;

  const continueLink = continueChapterObj
    ? (continueChapterObj.sourceType === 'EXTERNAL' && continueChapterObj.externalUrl ? continueChapterObj.externalUrl : `/series/${seriesSlug}/chapter/${continueChapterObj.number || continueChapterObj.label}`)
    : firstChapterLink;

  const hasHistory = !!continueChapterObj;

  const isExternal = continueChapterObj 
    ? continueChapterObj.sourceType === 'EXTERNAL'
    : false; // First chapter link logic is tricky, assume not external unless continue is. Actually, handled by target="_blank"

  if (isMobile) {
    return (
      <>
        {firstChapterLink !== '#' && (
          <Link
            href={hasHistory ? continueLink : firstChapterLink}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-bold text-white active:scale-95 transition-transform shadow-lg shadow-primary/25"
          >
            <BookOpen className="h-5 w-5" />
            {isLoading ? 'Loading...' : (hasHistory ? `Continue Ch. ${continueChapterObj?.label || continueChapterObj?.number || continueReadingChapter}` : 'Read First Chapter')}
          </Link>
        )}
        <BookmarkButton seriesId={seriesId} initialBookmarked={isBookmarked} />
      </>
    );
  }

  return (
    <>
      {firstChapterLink !== '#' && (
        <Link
          href={hasHistory ? continueLink : firstChapterLink}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="flex items-center gap-2 rounded-xl bg-primary px-10 py-4 font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25"
        >
          <BookOpen className="h-5 w-5" />
          {isLoading ? 'Loading...' : (hasHistory ? `Continue Ch. ${continueChapterObj?.label || continueChapterObj?.number || continueReadingChapter}` : 'Read First Chapter')}
        </Link>
      )}
      
      <BookmarkButton seriesId={seriesId} initialBookmarked={isBookmarked} />
      
      <button className="flex items-center justify-center rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm w-[56px] text-text-primary transition-all hover:border-primary/50 hover:bg-card-hover hover:text-primary">
        <Share2 className="h-5 w-5" />
      </button>
    </>
  );
}
