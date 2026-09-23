export const revalidate = 3600;

import { Metadata } from 'next';
import { GenreCard } from '@/components/shared/GenreCard';
import { prisma } from '@/lib/prisma';

import { generateMetadata } from '@/lib/seo';
import { APP_URL } from '@/lib/constants';

export const metadata: Metadata = generateMetadata({
  title: 'Genres',
  description: 'Browse thousands of series by your favorite categories and genres.',
  url: `${APP_URL}/browse/genres`
});

const getCachedGenres = async () => {
    return prisma.genre.findMany({
      include: {
        _count: {
          select: { series: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  };

export default async function GenresPage() {
  const genres = await getCachedGenres();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': `${APP_URL}`
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Genres',
        'item': `${APP_URL}/browse/genres`
      }
    ]
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Browse by Genre
        </h1>
        <p className="mt-1 text-sm text-text-muted">Discover series by your favorite categories</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {genres.map((genre, i) => (
          <GenreCard 
            key={genre.slug} 
            genre={{
              name: genre.name,
              slug: genre.slug,
              icon: genre.iconName || 'Hash',
              color: genre.color || '#E53935',
              seriesCount: genre._count.series
            }} 
            index={i} 
          />
        ))}
      </div>
    </div>
  );
}
