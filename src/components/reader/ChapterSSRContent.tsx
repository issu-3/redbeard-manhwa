import Link from 'next/link';
import type { ChapterData } from '@/types';

/**
 * ChapterSSRContent — server-rendered chapter content (SEO layer).
 *
 * Why this exists:
 * The interactive reader (`ChapterReader`) is a client component that renders
 * an empty shell until it mounts in the browser (`if (!mounted) return …`), and
 * its long-strip list is virtualized, so the initial HTML of a chapter page
 * previously contained no chapter text and zero <img> elements — crawlers saw
 * an empty "Loading..." page.
 *
 * This component renders the *same* chapter data the page already fetched on
 * the server (Prisma + unstable_cache, no extra queries) as plain,
 * crawler-readable HTML in the initial response:
 *   - breadcrumb navigation as real anchor links
 *   - the chapter heading (series title + chapter label/title)
 *   - every page image as a real <img> (first two eager + fetchPriority=high,
 *     the rest lazy) using the exact same image URLs the reader itself uses,
 *     so the browser reuses them from cache after hydration
 *   - previous / next chapter navigation as real <Link> anchors
 *
 * Once the interactive reader mounts on the client, `ChapterSSRTakeover`
 * hides this block and the reader takes over with the identical long-strip
 * layout (centered column, max-w-[56rem], black background) — the visual
 * result for users is unchanged. If JavaScript is disabled or hydration
 * fails, this content simply stays visible and readable.
 */
export function ChapterSSRContent({ chapter }: { chapter: ChapterData }) {
  const seriesSlug = chapter.seriesSlug;
  const chapterLabel =
    chapter.label || (chapter.number != null ? `Chapter ${chapter.number}` : 'Chapter');
  const heading = `${chapter.seriesTitle} ${chapterLabel}${chapter.title ? ` - ${chapter.title}` : ''}`;

  // Mirror of the safe-slug helper used by ChapterReader for prev/next links.
  const getSafeSlug = (c?: { slug?: string | null; number?: number | null } | null) => {
    if (!c) return null;
    if (typeof c.slug === 'string' && c.slug.trim()) return c.slug;
    if (c.number != null) return String(c.number);
    return null;
  };
  const prevSlug = getSafeSlug(chapter.prevChapter);
  const nextSlug = getSafeSlug(chapter.nextChapter);

  const pageAlt = (pageNumber: number) =>
    chapter.number != null
      ? `${chapter.seriesTitle} Chapter ${chapter.number} page ${pageNumber}`
      : `${chapter.seriesTitle} ${chapterLabel} page ${pageNumber}`;

  return (
    <article id="rb-chapter-ssr" className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[56rem] px-4 pt-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-white/60">
            <li>
              <Link href="/" className="hover:text-white">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/series/${seriesSlug}`} className="hover:text-white">
                {chapter.seriesTitle}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white">
              {chapterLabel}
            </li>
          </ol>
        </nav>

        <h1 className="mt-4 text-2xl font-bold leading-snug">{heading}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Read {heading} online in high quality
          {chapter.images.length > 0 ? ` — ${chapter.images.length} pages` : ''}. Use the
          previous and next chapter links below to continue reading {chapter.seriesTitle}.
        </p>
      </div>

      {chapter.images.length > 0 && (
        <div className="mx-auto w-full max-w-[56rem]">
          {chapter.images.map((img, i) => (
            // Plain <img> on purpose: the reader's long-strip mode uses the
            // same element with the same src, so these URLs are cache-warm
            // when the interactive reader takes over.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.imageUrl}
              alt={pageAlt(img.pageNumber)}
              width={img.width || 800}
              height={img.height || 1200}
              loading={i < 2 ? 'eager' : 'lazy'}
              {...(i < 2 ? { fetchPriority: 'high' as const } : {})}
              decoding="async"
              className="m-0 block h-auto w-full p-0"
            />
          ))}
        </div>
      )}

      <nav
        aria-label="Chapter navigation"
        className="mx-auto flex w-full max-w-[56rem] flex-wrap items-center justify-between gap-3 px-4 py-8"
      >
        {prevSlug ? (
          <Link
            href={`/series/${seriesSlug}/chapter/${prevSlug}`}
            className="rounded-full bg-white/10 px-6 py-3 font-bold text-white transition-all hover:bg-white/20"
          >
            ← Previous Chapter
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`/series/${seriesSlug}`}
          className="rounded-full bg-white/10 px-6 py-3 font-bold text-white transition-all hover:bg-white/20"
        >
          All Chapters
        </Link>
        {nextSlug ? (
          <Link
            href={`/series/${seriesSlug}/chapter/${nextSlug}`}
            className="rounded-full bg-[#E53935] px-6 py-3 font-bold text-white transition-all hover:bg-[#E53935]/90"
          >
            Next Chapter →
          </Link>
        ) : (
          <span className="text-xs font-bold uppercase tracking-wider text-white/30">
            Latest Chapter
          </span>
        )}
      </nav>
    </article>
  );
}
