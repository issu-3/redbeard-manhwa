'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
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

  revalidatePath('/series/[slug]/chapter/[number]', 'page');
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

  revalidatePath('/series/[slug]/chapter/[number]', 'page');
  return { success: true, replyId: reply.id };
}

export async function likeComment(id: string, isReply: boolean = false) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to like' };
  }

  const userId = session.user.id;

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
        await prisma.commentReply.update({ where: { id }, data: { likesCount: { decrement: 1 } } });
      } else {
        await prisma.commentLike.create({ data: { userId, replyId: id } });
        await prisma.commentReply.update({ where: { id }, data: { likesCount: { increment: 1 } } });
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
        await prisma.comment.update({ where: { id }, data: { likesCount: { decrement: 1 } } });
      } else {
        await prisma.commentLike.create({ data: { userId, commentId: id } });
        await prisma.comment.update({ where: { id }, data: { likesCount: { increment: 1 } } });
      }
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
    return { success: false, error: 'Failed to toggle like' };
  }

  revalidatePath('/series/[slug]/chapter/[number]', 'page');
  return { success: true };
}
