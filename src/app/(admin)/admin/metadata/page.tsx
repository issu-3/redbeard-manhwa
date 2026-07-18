import { prisma } from '@/lib/prisma';

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Genres */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Genres</h2>
          </div>
          
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-text-secondary">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Slug</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {genres.map((genre) => (
                  <tr key={genre.id} className="hover:bg-surface/50">
                    <td className="px-6 py-4 font-semibold">{genre.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{genre.slug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Tags</h2>
          </div>
          
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-text-secondary">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Slug</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-surface/50">
                    <td className="px-6 py-4 font-semibold">{tag.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{tag.slug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
