import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { deleteChapter } from '@/app/actions/admin/chapters';
import { ChaptersTableClient } from './chapters-table-client';
export default async function AdminChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: [{ number: 'asc' }, { createdAt: 'asc' }]
      }
    }
  });

  if (!series) return <div>Series not found</div>;

  return <ChaptersTableClient series={series} />;
}
