import type { SeriesCardData } from '@/types';

const titles = [
  'Solo Leveling: Ragnarok', 'Tower of God', 'Omniscient Reader\'s Viewpoint',
  'The Beginning After the End', 'Nano Machine', 'Return of the Mount Hua Sect',
  'Mercenary Enrollment', 'Reincarnation of the Suicidal Battle God',
  'The Greatest Estate Developer', 'Infinite Mage', 'Eleceed', 'Lookism',
  'Weak Hero', 'Doom Breaker', 'SSS-Class Suicide Hunter', 'Wind Breaker',
  'Jungle Juice', 'Manager Kim', 'Legend of the Northern Blade', 'Overgeared',
  'A Returner\'s Magic Should Be Special', 'Reformation of the Deadbeat Noble',
  'Trash of the Count\'s Family', 'Medical Return',
];

const genres = [
  { name: 'Action', slug: 'action' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Adventure', slug: 'adventure' },
  { name: 'Martial Arts', slug: 'martial-arts' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Isekai', slug: 'isekai' },
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

export function generateSampleSeries(
  count: number,
  overrides: Partial<SeriesCardData> = {},
  startIndex: number = 0
): SeriesCardData[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = (startIndex + i) % titles.length;
    const pseudoRandom = (idx * 17) % 10 / 10;
    return {
      id: `s-${startIndex + i}`,
      title: titles[idx],
      slug: slugify(titles[idx]),
      coverImage: `https://picsum.photos/seed/cover${(idx % 10) + 1}/300/450`,
      type: 'MANHWA' as const,
      status: 'ONGOING' as const,
      averageRating: parseFloat((7.5 + pseudoRandom * 2.5).toFixed(1)),
      totalViews: Math.floor(100000 + pseudoRandom * 10000000),
      totalBookmarks: Math.floor(5000 + pseudoRandom * 500000),
      chapterCount: Math.floor(20 + pseudoRandom * 300),
      genres: [genres[idx % genres.length], genres[(idx + 3) % genres.length]],
      updatedAt: new Date(1700000000000 - pseudoRandom * 7 * 86400000).toISOString(),
      ...overrides,
    };
  });
}
