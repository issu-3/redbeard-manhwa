import { prisma } from '@/lib/prisma';

/**
 * Resolves a reader chapter URL segment to a chapter ID, using the exact
 * same lookup chain as the chapter reader page:
 *
 * 1. Exact slug match (`seriesId_slug` unique key, no publish filter —
 *    matching the reader page's original behaviour).
 * 2. Fallback match on published chapters: numeric chapter number,
 *    `chapter-`-prefixed slug, case-insensitive slug, case-insensitive label.
 * 3. Volume-range aliases: a numeric slug (e.g. `chapter-5` or `5`) that
 *    falls inside a published chapter's slug/label range (e.g. `chapter-1-20`).
 *
 * Returns the chapter ID, or `null` when no chapter matches.
 * Shared by the reader page and by `src/proxy.ts` (soft-404 pre-check) so
 * the two can never drift apart.
 */
export async function resolveReaderChapterId(
  seriesId: string,
  chapterSlug: string
): Promise<string | null> {
  if (!chapterSlug || chapterSlug === 'null' || chapterSlug === 'undefined') {
    return null;
  }

  const exact = await prisma.chapter.findUnique({
    where: {
      seriesId_slug: {
        seriesId,
        slug: chapterSlug,
      },
    },
    select: { id: true },
  });
  if (exact) return exact.id;

  const numericSlug = Number(chapterSlug);
  const fallback = await prisma.chapter.findFirst({
    where: {
      seriesId,
      isPublished: true,
      OR: [
        ...(!isNaN(numericSlug) ? [{ number: numericSlug }] : []),
        { slug: `chapter-${chapterSlug}` },
        { slug: { equals: chapterSlug, mode: 'insensitive' as const } },
        { label: { equals: chapterSlug, mode: 'insensitive' as const } },
      ],
    },
    select: { id: true },
  });
  if (fallback) return fallback.id;

  // Range alias resolution: if chapterSlug corresponds to a chapter number
  // (e.g. "chapter-1", "1", "ch-15"), check if any published chapter for
  // this series defines a volume range containing that chapter number.
  const numMatch = chapterSlug.match(/^(?:chapter[-_]|ch[-_])?(\d+(?:\.\d+)?)$/i);
  if (numMatch) {
    const reqNum = parseFloat(numMatch[1]);
    const candidateChapters = await prisma.chapter.findMany({
      where: {
        seriesId,
        isPublished: true,
      },
      select: {
        id: true,
        slug: true,
        label: true,
      },
    });

    for (const cand of candidateChapters) {
      const rangeMatch = `${cand.slug} ${cand.label || ''}`.match(/(\d+)\s*[-–—]\s*(\d+)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (reqNum >= start && reqNum <= end) {
          return cand.id;
        }
      }
    }
  }

  return null;
}
