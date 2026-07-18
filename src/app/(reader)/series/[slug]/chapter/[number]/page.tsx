import type { Metadata } from 'next';
import type { ChapterData } from '@/types';
import { ChapterReader } from '@/components/reader/ChapterReader';

// ─── Sample Data ───────────────────────────────────────────────

function getChapterData(slug: string, number: number): ChapterData {
  const chapterTitles: Record<number, string> = {
    1: 'A New Beginning',
    2: 'Inherited Power',
    3: 'The System Activates',
    4: 'Shadows of Seoul',
    5: 'First Awakening',
    6: 'The Hidden Dungeon',
    7: 'Legacy of the Monarchs',
    8: 'A New Threat Emerges',
    9: 'Bonds of Power',
    10: 'The Tournament Begins',
    11: 'Through Fire and Ice',
    12: "The Architect's Design",
    13: 'Shadows Converge',
    14: 'Rise of the Rulers',
    15: 'Between Worlds',
    16: 'The Final Warning',
    17: 'Into the Abyss',
    18: 'The Monarch Returns',
    19: 'Awakening of the Shadow',
    20: 'The Gates of Ragnarok',
  };

  const totalImages = 15;

  return {
    id: `chapter-${number}`,
    seriesId: 'series-solo-ragnarok',
    seriesTitle: 'Solo Leveling: Ragnarok',
    seriesSlug: slug,
    number,
    title: chapterTitles[number] || `Chapter ${number}`,
    slug: `chapter-${number}`,
    totalPages: totalImages,
    images: Array.from({ length: totalImages }, (_, i) => ({
      id: `img-${number}-${i + 1}`,
      pageNumber: i + 1,
      imageUrl: `https://picsum.photos/seed/slr-ch${number}-p${i + 1}/800/1200`,
      width: 800,
      height: 1200,
    })),
    prevChapter:
      number > 1
        ? { number: number - 1, slug: `chapter-${number - 1}` }
        : undefined,
    nextChapter:
      number < 20
        ? { number: number + 1, slug: `chapter-${number + 1}` }
        : undefined,
  };
}

// ─── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}): Promise<Metadata> {
  const { slug, number } = await params;
  const chapterNum = parseInt(number, 10);
  const chapter = getChapterData(slug, chapterNum);

  return {
    title: `Ch. ${chapter.number}${chapter.title ? ` — ${chapter.title}` : ''} | ${chapter.seriesTitle}`,
    description: `Read ${chapter.seriesTitle} Chapter ${chapter.number}${chapter.title ? ` — ${chapter.title}` : ''} on REDBEARD. High quality manhwa reading experience.`,
    openGraph: {
      title: `${chapter.seriesTitle} - Chapter ${chapter.number}`,
      description: `Read Chapter ${chapter.number} of ${chapter.seriesTitle}`,
      images: chapter.images.length > 0 ? [{ url: chapter.images[0].imageUrl }] : [],
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = await params;
  const chapterNum = parseInt(number, 10);
  const chapter = getChapterData(slug, chapterNum);

  return <ChapterReader chapter={chapter} />;
}
