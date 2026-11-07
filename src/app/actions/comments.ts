'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath, updateTag } from 'next/cache';
import { commentSchema } from '@/lib/validators';

export async function postComment(chapterId: string, content: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to comment' };
  }

  // H7 FIX: Validate comment content
  const parsed = commentSchema.safeParse({ content: content.trim() });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid comment' };
  }

  const comment = await prisma.comment.create({
    data: {
      userId: session.user.id,
      chapterId,
      content: content.trim(),
    },
  });

  revalidatePath('/series/[slug]/chapter/[chapterSlug]', 'page');
  updateTag('chapter-comments');
  return { success: true, commentId: comment.id };
}

export async function replyToComment(commentId: string, content: string, parentReplyId?: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to reply' };
  }

  // H7 FIX: Validate reply content
  const parsed = commentSchema.safeParse({ content: content.trim() });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid reply' };
  }

  const reply = await prisma.commentReply.create({
    data: {
      userId: session.user.id,
      commentId,
      parentReplyId,
      content: content.trim(),
    },
  });

  // Fetch the target user to send a notification
  const targetUserId = parentReplyId 
    ? (await prisma.commentReply.findUnique({ where: { id: parentReplyId } }))?.userId 
    : (await prisma.comment.findUnique({ where: { id: commentId } }))?.userId;

  if (targetUserId && targetUserId !== session.user.id) {
    // Create a notification for the user who was replied to
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'REPLY',
        title: 'New Reply',
        message: `${session.user.name || 'Someone'} replied to your comment.`,
        link: `/user/notifications` // Link could be better, but we don't have full context here easily
      }
    });
  }

  revalidatePath('/series/[slug]/chapter/[chapterSlug]', 'page');
  updateTag('chapter-comments');
  return { success: true, replyId: reply.id };
}

export async function likeComment(id: string, isReply: boolean = false) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to like' };
  }

  const userId = session.user.id;
  let liked = false;
  let likesCount = 0;

  try {
    if (isReply) {
      // M10 FIX: Verify existence
      const target = await prisma.commentReply.findUnique({ where: { id } });
      if (!target) return { success: false, error: 'Reply not found' };

      const existing = await prisma.commentLike.findUnique({
        where: { userId_replyId: { userId, replyId: id } }
      });

      if (existing) {
        await prisma.commentLike.delete({ where: { id: existing.id } });
        const updated = await prisma.commentReply.update({ where: { id }, data: { likesCount: { decrement: 1 } }, select: { likesCount: true } });
        liked = false;
        likesCount = updated.likesCount;
      } else {
        await prisma.commentLike.create({ data: { userId, replyId: id } });
        const updated = await prisma.commentReply.update({ where: { id }, data: { likesCount: { increment: 1 } }, select: { likesCount: true } });
        liked = true;
        likesCount = updated.likesCount;
      }
    } else {
      // M10 FIX: Verify existence
      const target = await prisma.comment.findUnique({ where: { id } });
      if (!target) return { success: false, error: 'Comment not found' };

      const existing = await prisma.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId: id } }
      });

      if (existing) {
        await prisma.commentLike.delete({ where: { id: existing.id } });
        const updated = await prisma.comment.update({ where: { id }, data: { likesCount: { decrement: 1 } }, select: { likesCount: true } });
        liked = false;
        likesCount = updated.likesCount;
      } else {
        await prisma.commentLike.create({ data: { userId, commentId: id } });
        const updated = await prisma.comment.update({ where: { id }, data: { likesCount: { increment: 1 } }, select: { likesCount: true } });
        liked = true;
        likesCount = updated.likesCount;
      }
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
    return { success: false, error: 'Failed to toggle like' };
  }

  revalidatePath('/series/[slug]/chapter/[chapterSlug]', 'page');
  updateTag('chapter-comments');
  // Return the resulting toggle state so the client can sync its optimistic UI
  // with the server instead of blindly incrementing on every click.
  return { success: true, liked, likesCount };
}

function canModerate(role?: string | null) {
  return role === 'ADMIN' || role === 'MODERATOR';
}

export async function deleteComment(commentId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to delete a comment' };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });
    if (!comment) return { success: false, error: 'Comment not found' };

    if (comment.userId !== session.user.id && !canModerate(session.user.role)) {
      return { success: false, error: 'You can only delete your own comments' };
    }

    // Delete children explicitly inside a transaction. The schema also cascades
    // (CommentReply.comment and CommentLike.comment/reply are onDelete: Cascade),
    // but doing it explicitly keeps the result independent of DB-level cascades.
    const replies = await prisma.commentReply.findMany({
      where: { commentId },
      select: { id: true },
    });
    const replyIds = replies.map((r) => r.id);

    await prisma.$transaction([
      prisma.commentLike.deleteMany({
        where: {
          OR: [{ commentId }, ...(replyIds.length > 0 ? [{ replyId: { in: replyIds } }] : [])],
        },
      }),
      prisma.commentReply.deleteMany({ where: { commentId } }),
      prisma.comment.delete({ where: { id: commentId } }),
    ]);
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }

  revalidatePath('/series/[slug]/chapter/[chapterSlug]', 'page');
  updateTag('chapter-comments');
  return { success: true };
}

export async function deleteReply(replyId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to delete a reply' };
  }

  try {
    const reply = await prisma.commentReply.findUnique({
      where: { id: replyId },
      select: { id: true, userId: true },
    });
    if (!reply) return { success: false, error: 'Reply not found' };

    if (reply.userId !== session.user.id && !canModerate(session.user.role)) {
      return { success: false, error: 'You can only delete your own replies' };
    }

    await prisma.$transaction([
      prisma.commentLike.deleteMany({ where: { replyId } }),
      // Child replies have no cascade on parentReplyId — detach them so they
      // survive as top-level replies of the same comment instead of blocking
      // the delete or being silently removed.
      prisma.commentReply.updateMany({
        where: { parentReplyId: replyId },
        data: { parentReplyId: null },
      }),
      prisma.commentReply.delete({ where: { id: replyId } }),
    ]);
  } catch (error) {
    console.error('Failed to delete reply:', error);
    return { success: false, error: 'Failed to delete reply' };
  }

  revalidatePath('/series/[slug]/chapter/[chapterSlug]', 'page');
  updateTag('chapter-comments');
  return { success: true };
}

async function createCommentReport(
  reporterId: string,
  target: { commentId: string; targetId: string; targetType: 'COMMENT' | 'REPLY'; ownerId: string },
  reason: string
) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { success: false, error: 'Please tell us why you are reporting this' };
  }
  if (trimmedReason.length > 1000) {
    return { success: false, error: 'Reason must be at most 1000 characters' };
  }
  if (target.ownerId === reporterId) {
    return { success: false, error: 'You cannot report your own comment' };
  }

  const existing = await prisma.report.findFirst({
    where: { reporterId, targetType: target.targetType, targetId: target.targetId },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: 'You have already reported this' };
  }

  await prisma.report.create({
    data: {
      reporterId,
      targetType: target.targetType,
      targetId: target.targetId,
      commentId: target.commentId,
      type: 'OTHER',
      reason: trimmedReason,
    },
  });

  return { success: true };
}

export async function reportComment(commentId: string, reason: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to report a comment' };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });
    if (!comment) return { success: false, error: 'Comment not found' };

    return await createCommentReport(
      session.user.id,
      { commentId, targetId: commentId, targetType: 'COMMENT', ownerId: comment.userId },
      reason
    );
  } catch (error) {
    console.error('Failed to report comment:', error);
    return { success: false, error: 'Failed to report comment' };
  }
}

export async function reportReply(replyId: string, reason: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to report a reply' };
  }

  try {
    const reply = await prisma.commentReply.findUnique({
      where: { id: replyId },
      select: { id: true, userId: true, commentId: true },
    });
    if (!reply) return { success: false, error: 'Reply not found' };

    return await createCommentReport(
      session.user.id,
      { commentId: reply.commentId, targetId: replyId, targetType: 'REPLY', ownerId: reply.userId },
      reason
    );
  } catch (error) {
    console.error('Failed to report reply:', error);
    return { success: false, error: 'Failed to report reply' };
  }
}
