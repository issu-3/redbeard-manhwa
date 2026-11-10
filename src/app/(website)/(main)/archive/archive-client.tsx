'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ArchiveChapterListProps {
  seriesSlug: string;
  chapters: {
    slug: string;
    number: number | null;
    title: string | null;
  }[];
}

/**
 * Chapter links for one series on /archive. Only the first VISIBLE_COUNT
 * links are rendered initially (including in the server-rendered HTML) so
 * the archive page stays small — rendering all ~2,700 chapter links pushed
 * it past 1 MB, which Bing flags. The full chapter list arrives with the
 * page as props, so expanding renders the remaining links on the client
 * with no extra fetch. Chapter discovery for crawlers is covered by the
 * chapters sitemap and each series page, which link every chapter.
 */
export function ArchiveChapterList({ seriesSlug, chapters }: ArchiveChapterListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const VISIBLE_COUNT = 5;
  const hasMore = chapters.length > VISIBLE_COUNT;
  const visibleChapters = isExpanded ? chapters : chapters.slice(0, VISIBLE_COUNT);

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 flex items-center gap-1 text-xs font-medium text-text-muted hover:text-primary transition-colors"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {chapters.length} Chapters
      </button>

      {/*
       * Collapsed: only the first VISIBLE_COUNT links are rendered (the CSS
       * max-height clips the row as before). Expanded: all links render on
       * the client from the props already on the page.
       */}
      <div
        className={
          isExpanded
            ? 'flex flex-wrap gap-1.5'
            : 'flex flex-wrap gap-1.5 max-h-[1.75rem] overflow-hidden'
        }
      >
        {visibleChapters.map((ch) => {
          const chSlug = ch.slug?.trim() ? ch.slug : String(ch.number);
          const label = ch.number != null ? `Ch. ${ch.number}` : ch.slug;
          return (
            <Link
              key={ch.slug}
              href={`/series/${seriesSlug}/chapter/${chSlug}`}
              className="inline-block rounded border border-border bg-surface-hover px-2 py-0.5 text-xs text-text-secondary transition-colors hover:border-primary hover:text-primary"
              title={ch.title || `Chapter ${ch.number}`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {hasMore && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="mt-1.5 text-xs text-primary hover:underline"
        >
          Show all {chapters.length} chapters
        </button>
      )}
    </div>
  );
}
