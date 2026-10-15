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
 * Client component that renders ALL chapter links in the DOM (crawlable by Googlebot)
 * but uses CSS to collapse/expand for better UX. The links are always in the HTML.
 */
export function ArchiveChapterList({ seriesSlug, chapters }: ArchiveChapterListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const VISIBLE_COUNT = 5;
  const hasMore = chapters.length > VISIBLE_COUNT;

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
       * ALL links are rendered in the DOM for Googlebot crawlability.
       * We use CSS max-height + overflow to hide overflow for human users,
       * but Googlebot reads the full DOM regardless of CSS.
       */}
      <div
        className={
          isExpanded
            ? 'flex flex-wrap gap-1.5'
            : 'flex flex-wrap gap-1.5 max-h-[1.75rem] overflow-hidden'
        }
      >
        {chapters.map((ch) => {
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
