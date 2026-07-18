import { Metadata } from 'next';
import { HomepageClient } from './homepage-client';
import type { SeriesDetail } from '@/types';

export const metadata: Metadata = {
  title: 'REDBEARD — The Ultimate Reading Experience',
  description:
    'Discover and read the best manhwa, manga, and webtoons. Thousands of titles, premium reading experience, and a vibrant community.',
};

/* ── Sample data (replaced by DB queries in production) ─────────── */

const SAMPLE_GENRES = [
  { name: 'Action', slug: 'action', icon: 'Sword', color: '#E53935', seriesCount: 342 },
  { name: 'Adventure', slug: 'adventure', icon: 'Compass', color: '#43A047', seriesCount: 256 },
  { name: 'Comedy', slug: 'comedy', icon: 'Laugh', color: '#FDD835', seriesCount: 198 },
  { name: 'Drama', slug: 'drama', icon: 'Drama', color: '#8E24AA', seriesCount: 287 },
  { name: 'Fantasy', slug: 'fantasy', icon: 'Wand2', color: '#5C6BC0', seriesCount: 412 },
  { name: 'Horror', slug: 'horror', icon: 'Skull', color: '#424242', seriesCount: 89 },
  { name: 'Isekai', slug: 'isekai', icon: 'Globe', color: '#00ACC1', seriesCount: 176 },
  { name: 'Martial Arts', slug: 'martial-arts', icon: 'Shield', color: '#F4511E', seriesCount: 134 },
  { name: 'Mystery', slug: 'mystery', icon: 'Search', color: '#6D4C41', seriesCount: 112 },
  { name: 'Romance', slug: 'romance', icon: 'Heart', color: '#EC407A', seriesCount: 367 },
  { name: 'School Life', slug: 'school-life', icon: 'GraduationCap', color: '#26A69A', seriesCount: 156 },
  { name: 'Sci-Fi', slug: 'sci-fi', icon: 'Rocket', color: '#7E57C2', seriesCount: 93 },
  { name: 'Slice of Life', slug: 'slice-of-life', icon: 'Coffee', color: '#8D6E63', seriesCount: 204 },
  { name: 'Sports', slug: 'sports', icon: 'Trophy', color: '#FFB300', seriesCount: 67 },
  { name: 'Thriller', slug: 'thriller', icon: 'AlertTriangle', color: '#D32F2F', seriesCount: 145 },
];

function makeSeries(id: number, overrides: Partial<SeriesDetail> = {}) {
  const pseudoRandom = (id * 17) % 10 / 10;
  const baseSeries = {
    id: `series-${id}`,
    title: '',
    slug: '',
    coverImage: `https://picsum.photos/seed/cover${id}/300/450`,
    type: 'MANHWA' as const,
    status: 'ONGOING' as const,
    averageRating: parseFloat((8.0 + pseudoRandom * 2).toFixed(1)),
    totalViews: Math.floor(50000 + pseudoRandom * 5000000),
    totalBookmarks: Math.floor(1000 + pseudoRandom * 100000),
    chapterCount: Math.floor(20 + pseudoRandom * 300),
    genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]],
    updatedAt: new Date(1700000000000 - pseudoRandom * 7 * 86400000).toISOString(),
  };
  return { ...baseSeries, ...overrides };
}

const featuredSeries = [
  makeSeries(1, { title: 'Solo Leveling: Ragnarok', slug: 'solo-leveling-ragnarok', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], chapterCount: 156, totalViews: 12500000, averageRating: 9.5, bannerImage: '/images/banners/banner-1.jpg', description: 'After the events of Solo Leveling, a new generation of hunters must rise to face threats from beyond the dimensional gates. Follow the next chapter in this epic saga.' }),
  makeSeries(2, { title: 'Tower of God', slug: 'tower-of-god', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], chapterCount: 580, totalViews: 28000000, averageRating: 9.2, bannerImage: '/images/banners/banner-2.jpg', description: 'Twenty-Fifth Bam, who has spent most of his life in a dark cave with only his companion Rachel, enters the mysterious Tower to chase after her when she disappears.' }),
  makeSeries(3, { title: 'Omniscient Reader\'s Viewpoint', slug: 'omniscient-readers-viewpoint', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[6]], chapterCount: 178, totalViews: 18000000, averageRating: 9.6, bannerImage: '/images/banners/banner-3.jpg', description: 'When the world is destroyed by scenarios from a web novel, its sole reader Kim Dokja must navigate this new reality using his knowledge of the story.' }),
  makeSeries(4, { title: 'The Beginning After the End', slug: 'the-beginning-after-the-end', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], chapterCount: 204, totalViews: 15000000, averageRating: 9.3, bannerImage: '/images/banners/banner-4.jpg', description: 'King Grey has unrivaled strength and prestige in a world governed by martial ability. However, solitude lingers closely behind those with great power.' }),
];

const trendingSeries = [
  makeSeries(5, { title: 'Nano Machine', slug: 'nano-machine', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[7]] }),
  makeSeries(6, { title: 'Return of the Mount Hua Sect', slug: 'return-mount-hua-sect', genres: [SAMPLE_GENRES[7], SAMPLE_GENRES[0]] }),
  makeSeries(7, { title: 'Mercenary Enrollment', slug: 'mercenary-enrollment', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[3]] }),
  makeSeries(8, { title: 'Reincarnation of the Suicidal Battle God', slug: 'reincarnation-battle-god', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]] }),
  makeSeries(9, { title: 'The Greatest Estate Developer', slug: 'greatest-estate-developer', genres: [SAMPLE_GENRES[2], SAMPLE_GENRES[4]] }),
  makeSeries(10, { title: 'Infinite Mage', slug: 'infinite-mage', genres: [SAMPLE_GENRES[4], SAMPLE_GENRES[0]] }),
  makeSeries(11, { title: 'I Grow Stronger By Eating', slug: 'grow-stronger-eating', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]] }),
  makeSeries(12, { title: 'Heavenly Demon Instructor', slug: 'heavenly-demon-instructor', genres: [SAMPLE_GENRES[7], SAMPLE_GENRES[0]] }),
];

const popularSeries = [
  makeSeries(13, { title: 'The Breaker: Eternal Force', slug: 'breaker-eternal-force', genres: [SAMPLE_GENRES[7], SAMPLE_GENRES[0]], totalViews: 9200000 }),
  makeSeries(14, { title: 'Eleceed', slug: 'eleceed', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[2]], totalViews: 14000000 }),
  makeSeries(15, { title: 'Wind Breaker', slug: 'wind-breaker', genres: [SAMPLE_GENRES[13], SAMPLE_GENRES[3]], totalViews: 8500000 }),
  makeSeries(16, { title: 'Lookism', slug: 'lookism', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[3]], totalViews: 22000000 }),
  makeSeries(17, { title: 'Weak Hero', slug: 'weak-hero', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[10]], totalViews: 11000000 }),
  makeSeries(18, { title: 'Doom Breaker', slug: 'doom-breaker', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], totalViews: 7800000 }),
  makeSeries(19, { title: 'SSS-Class Suicide Hunter', slug: 'sss-class-suicide-hunter', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], totalViews: 6500000 }),
  makeSeries(20, { title: 'Leviathan', slug: 'leviathan', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[5]], totalViews: 5300000 }),
];

const recentlyUpdated = [
  makeSeries(21, { title: 'Sword Sheath\'s Child', slug: 'sword-sheaths-child', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[7]], updatedAt: new Date(1700000000000 - 3600000).toISOString() }),
  makeSeries(22, { title: 'A Returner\'s Magic Should Be Special', slug: 'returners-magic', genres: [SAMPLE_GENRES[4], SAMPLE_GENRES[0]], updatedAt: new Date(1700000000000 - 7200000).toISOString() }),
  makeSeries(23, { title: 'Overgeared', slug: 'overgeared', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], updatedAt: new Date(1700000000000 - 10800000).toISOString() }),
  makeSeries(24, { title: 'Legend of the Northern Blade', slug: 'northern-blade', genres: [SAMPLE_GENRES[7], SAMPLE_GENRES[0]], updatedAt: new Date(1700000000000 - 14400000).toISOString() }),
  makeSeries(25, { title: 'Reformation of the Deadbeat Noble', slug: 'deadbeat-noble', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], updatedAt: new Date(1700000000000 - 18000000).toISOString() }),
  makeSeries(26, { title: 'Trash of the Count\'s Family', slug: 'trash-counts-family', genres: [SAMPLE_GENRES[4], SAMPLE_GENRES[2]], updatedAt: new Date(1700000000000 - 21600000).toISOString() }),
  makeSeries(27, { title: 'Second Life Ranker', slug: 'second-life-ranker', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], updatedAt: new Date(1700000000000 - 25200000).toISOString() }),
  makeSeries(28, { title: 'Medical Return', slug: 'medical-return', genres: [SAMPLE_GENRES[3], SAMPLE_GENRES[12]], updatedAt: new Date(1700000000000 - 28800000).toISOString() }),
];

const completedSeries = [
  makeSeries(29, { title: 'Solo Leveling', slug: 'solo-leveling', status: 'COMPLETED' as const, genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], chapterCount: 200, totalViews: 45000000, averageRating: 9.4 }),
  makeSeries(30, { title: 'The God of High School', slug: 'god-of-high-school', status: 'COMPLETED' as const, genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[7]], chapterCount: 570, totalViews: 20000000 }),
  makeSeries(31, { title: 'Bastard', slug: 'bastard', status: 'COMPLETED' as const, genres: [SAMPLE_GENRES[14], SAMPLE_GENRES[5]], chapterCount: 94, totalViews: 12000000, averageRating: 9.1 }),
  makeSeries(32, { title: 'Sweet Home', slug: 'sweet-home', status: 'COMPLETED' as const, genres: [SAMPLE_GENRES[5], SAMPLE_GENRES[14]], chapterCount: 141, totalViews: 18000000 }),
  makeSeries(33, { title: 'UnOrdinary', slug: 'unordinary', status: 'COMPLETED' as const, genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[10]], chapterCount: 329, totalViews: 16000000 }),
  makeSeries(34, { title: 'Noblesse', slug: 'noblesse', status: 'COMPLETED' as const, genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], chapterCount: 544, totalViews: 19000000 }),
];

const staffPicks = [
  makeSeries(35, { title: 'Jungle Juice', slug: 'jungle-juice', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[11]], averageRating: 9.0 }),
  makeSeries(36, { title: 'Manager Kim', slug: 'manager-kim', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[3]], averageRating: 8.9 }),
  makeSeries(37, { title: 'Teenage Mercenary', slug: 'teenage-mercenary', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[3]], averageRating: 8.7 }),
  makeSeries(38, { title: 'Villain to Kill', slug: 'villain-to-kill', genres: [SAMPLE_GENRES[0], SAMPLE_GENRES[4]], averageRating: 8.8 }),
  makeSeries(39, { title: 'The Horizon', slug: 'the-horizon', genres: [SAMPLE_GENRES[3], SAMPLE_GENRES[12]], averageRating: 9.3 }),
  makeSeries(40, { title: 'Purple Hyacinth', slug: 'purple-hyacinth', genres: [SAMPLE_GENRES[8], SAMPLE_GENRES[3]], averageRating: 9.1 }),
];

export default function HomePage() {
  return (
    <HomepageClient
      featured={featuredSeries}
      trending={trendingSeries}
      popular={popularSeries}
      recentlyUpdated={recentlyUpdated}
      completed={completedSeries}
      staffPicks={staffPicks}
      genres={SAMPLE_GENRES}
    />
  );
}
