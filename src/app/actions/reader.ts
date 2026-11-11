'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// The chapter reader page is ISR-cached and renders identically for
// every visitor, so anything user-specific is fetched through these
// actions after the page loads instead of during its render.

export async function getMyReaderPreferences(): Promise<Record<string, any> | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });

  return (userRecord?.preferences as Record<string, any>) || null;
}

export async function getChapterLikeState(chapterId: string): Promise<{
  likedCommentIds: string[];
  likedReplyIds: string[];
}> {
  const empty = { likedCommentIds: [] as string[], likedReplyIds: [] as string[] };

  const session = await auth();
  if (!session?.user?.id) return empty;

  const comments = await prisma.comment.findMany({
    where: { chapterId },
    select: { id: true, replies: { select: { id: true } } },
  });
  if (comments.length === 0) return empty;

  const myLikes = await prisma.commentLike.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { commentId: { in: comments.map((c) => c.id) } },
        { replyId: { in: comments.flatMap((c) => c.replies.map((r) => r.id)) } },
      ],
    },
    select: { commentId: true, replyId: true },
  });

  return {
    likedCommentIds: myLikes.map((l) => l.commentId).filter(Boolean) as string[],
    likedReplyIds: myLikes.map((l) => l.replyId).filter(Boolean) as string[],
  };
}
