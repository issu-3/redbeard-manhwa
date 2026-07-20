import { prisma } from '@/lib/prisma';
import { TaxonomyClient } from '@/components/admin/TaxonomyClient';

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { series: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Tags</h1>
        <p className="text-text-secondary">Manage series tags.</p>
      </div>

      <TaxonomyClient type="tag" data={tags} />
    </div>
  );
}
