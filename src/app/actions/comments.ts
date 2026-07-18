'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function postComment(chapterId: string, content: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('You must be logged in to comment');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Comment cannot be empty');
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
    throw new Error('You must be logged in to reply');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Reply cannot be empty');
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
  // A real implementation would require a CommentLike model to prevent multiple likes.
  // Since we only have a likesCount field, this is a simplified version (vulnerable to multi-liking).
  // We'll just increment it for demonstration.
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('You must be logged in to like');
  }

  if (isReply) {
    await prisma.commentReply.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });
  } else {
    await prisma.comment.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });
  }

  revalidatePath('/series/[slug]/chapter/[number]', 'page');
  return { success: true };
}
