import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Trash2, MessageSquare } from 'lucide-react';

export default async function AdminCommentsPage() {
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { displayName: true, username: true, email: true } },
      chapter: { select: { number: true, series: { select: { title: true } } } }
    },
    take: 50 // Just show recent 50 for MVP
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Comments & Moderation</h1>
        <p className="text-text-secondary">View and moderate recent comments.</p>
      </div>

      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-primary font-bold">
                  {comment.user.displayName?.[0] || comment.user.username?.[0] || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">
                      {comment.user.displayName || comment.user.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-text-secondary">
                      on {comment.chapter.series.title} Ch. {comment.chapter.number}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {formatDate(comment.createdAt)}
                  </div>
                  <div className="mt-3 text-sm text-text-primary bg-surface/50 p-3 rounded-lg border border-border/50">
                    {comment.content}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-colors" title="Delete Comment">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-text-secondary flex flex-col items-center">
            <MessageSquare className="h-12 w-12 text-border mb-4" />
            <p>No comments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
