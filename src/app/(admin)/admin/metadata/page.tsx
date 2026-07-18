import { prisma } from '@/lib/prisma';
import { MetadataClient } from './metadata-client';

export default async function AdminMetadataPage() {
  const [genres, tags] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Metadata Management</h1>
        <p className="text-text-secondary">Manage Genres and Tags.</p>
      </div>

      <MetadataClient genres={genres} tags={tags} />
    </div>
  );
}
