import { Metadata } from 'next';
import { GenreCard } from '@/components/shared/GenreCard';

export const metadata: Metadata = { title: 'Genres' };

const GENRES = [
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

export default function GenresPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Browse by Genre
        </h1>
        <p className="mt-1 text-sm text-text-muted">Discover series by your favorite categories</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {GENRES.map((genre, i) => (
          <GenreCard key={genre.slug} genre={genre} index={i} />
        ))}
      </div>
    </div>
  );
}
