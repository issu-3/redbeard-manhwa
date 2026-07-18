import { Metadata } from 'next';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { generateSampleSeries } from '@/lib/sample-data';

const GENRE_MAP: Record<string, { name: string; color: string }> = {
  action: { name: 'Action', color: '#E53935' },
  adventure: { name: 'Adventure', color: '#43A047' },
  comedy: { name: 'Comedy', color: '#FDD835' },
  drama: { name: 'Drama', color: '#8E24AA' },
  fantasy: { name: 'Fantasy', color: '#5C6BC0' },
  horror: { name: 'Horror', color: '#424242' },
  isekai: { name: 'Isekai', color: '#00ACC1' },
  'martial-arts': { name: 'Martial Arts', color: '#F4511E' },
  mystery: { name: 'Mystery', color: '#6D4C41' },
  romance: { name: 'Romance', color: '#EC407A' },
  'school-life': { name: 'School Life', color: '#26A69A' },
  'sci-fi': { name: 'Sci-Fi', color: '#7E57C2' },
  'slice-of-life': { name: 'Slice of Life', color: '#8D6E63' },
  sports: { name: 'Sports', color: '#FFB300' },
  thriller: { name: 'Thriller', color: '#D32F2F' },
};

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = GENRE_MAP[slug];
  return { title: genre?.name || 'Genre' };
}

export default async function GenreDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const genre = GENRE_MAP[slug] || { name: slug, color: '#E53935' };
  const series = generateSampleSeries(12, {
    genres: [{ name: genre.name, slug }],
  });

  return (
    <BrowseGrid
      title={genre.name}
      subtitle={`Explore all ${genre.name.toLowerCase()} series`}
      icon={
        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: genre.color }} />
      }
      series={series}
    />
  );
}
