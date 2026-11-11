'use client';

import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, MessageSquare, Clock, MoreVertical, Flag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { formatRelativeTime } from '@/lib/utils';
import {
  likeComment,
  replyToComment,
  deleteComment,
  deleteReply,
  reportComment,
  reportReply,
} from '@/app/actions/comments';
import { toast } from 'sonner';

export interface CommentData {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  hasLiked?: boolean;
  isPinned: boolean;
  isSpoiler: boolean;
  isEdited: boolean;
  createdAt: Date | string;
  user: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
  replies: CommentReplyData[];
}

export interface CommentReplyData {
  id: string;
  userId: string;
  commentId: string;
  content: string;
  likesCount: number;
  hasLiked?: boolean;
  createdAt: Date | string;
  user: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

type ActionResult = { success: boolean; error?: string };

/**
 * Like toggle state synced with the server. The server action returns the
 * resulting { liked, likesCount }, so the optimistic value is always
 * corrected to the real count instead of drifting on repeated clicks.
 */
function useToggleLike(
  id: string,
  isReply: boolean,
  initialLikes: number,
  initialHasLiked: boolean,
  currentUserId?: string
) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isLiking, setIsLiking] = useState(false);

  // The reader page is cached, so the signed-in user's like state can
  // arrive after mount (hydrated by CommentSection). Follow the prop
  // until the user toggles a like themselves; from then on the local
  // state — corrected by the like action's response — is the truth.
  const interactedRef = useRef(false);
  useEffect(() => {
    if (!interactedRef.current) {
      setHasLiked(initialHasLiked);
    }
  }, [initialHasLiked]);

  const toggleLike = async () => {
    if (!currentUserId) {
      toast.error('Must be logged in to like');
      return;
    }
    if (isLiking) return;
    interactedRef.current = true;

    const prevLiked = hasLiked;
    const prevLikes = likes;
    setIsLiking(true);
    setHasLiked(!prevLiked);
    setLikes(prevLikes + (prevLiked ? -1 : 1)); // Optimistic toggle

    try {
      const res = await likeComment(id, isReply);
      if (res.success) {
        setHasLiked(!!res.liked);
        if (typeof res.likesCount === 'number') setLikes(res.likesCount);
      } else {
        setHasLiked(prevLiked);
        setLikes(prevLikes);
        toast.error(res.error || 'Failed to like comment');
      }
    } catch {
      setHasLiked(prevLiked);
      setLikes(prevLikes);
      toast.error('Failed to like comment');
    } finally {
      setIsLiking(false);
    }
  };

  return { likes, hasLiked, isLiking, toggleLike };
}

function LikeButton({
  likes,
  hasLiked,
  isLiking,
  onToggle,
  size = 'md',
}: {
  likes: number;
  hasLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  size?: 'md' | 'sm';
}) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <button
      onClick={onToggle}
      disabled={isLiking}
      aria-pressed={hasLiked}
      className={`flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
        hasLiked ? 'text-primary' : 'text-text-muted hover:text-primary'
      }`}
    >
      <ThumbsUp className={`${iconSize} ${hasLiked ? 'fill-current' : ''}`} />
      {likes > 0 && <span>{likes}</span>}
    </button>
  );
}

/**
 * Overflow (⋯) menu with Delete (owner) and Report (any logged-in user),
 * using inline confirm / reason panels — the same in-app pattern used for
 * review deletion, no native window.confirm.
 */
function ItemTools({
  isOwner,
  currentUserId,
  itemLabel,
  onDelete,
  onReport,
}: {
  isOwner: boolean;
  currentUserId?: string;
  itemLabel: 'comment' | 'reply';
  onDelete: () => Promise<ActionResult>;
  onReport: (reason: string) => Promise<ActionResult>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  if (!currentUserId) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await onDelete();
      if (res.success) {
        toast.success(itemLabel === 'comment' ? 'Comment deleted' : 'Reply deleted');
        setConfirmingDelete(false);
      } else {
        toast.error(res.error || `Failed to delete ${itemLabel}`);
      }
    } catch {
      toast.error(`Failed to delete ${itemLabel}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setIsReporting(true);
    try {
      const res = await onReport(reportReason);
      if (res.success) {
        toast.success('Reported. Our team will review it.');
        setReportOpen(false);
        setReportReason('');
      } else {
        toast.error(res.error || `Failed to report ${itemLabel}`);
      }
    } catch {
      toast.error(`Failed to report ${itemLabel}`);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <div className="relative ml-auto">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={`More actions for this ${itemLabel}`}
          className="flex items-center justify-center w-6 h-6 rounded-full text-text-muted hover:text-text-primary hover:bg-foreground/5 transition-colors"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-7 z-20 w-40 rounded-xl border border-border bg-surface shadow-lg py-1.5">
              {!isOwner && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-foreground/5 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmingDelete(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirmingDelete && (
        <div className="basis-full mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
          <span className="text-xs font-medium text-red-300">
            Delete this {itemLabel}? This cannot be undone.
          </span>
          <span className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-secondary hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </span>
        </div>
      )}

      {reportOpen && (
        <div className="basis-full mt-2 space-y-2 rounded-xl border border-border bg-surface px-3 py-3">
          <label className="block text-xs font-medium text-text-secondary">
            Why are you reporting this {itemLabel}?
          </label>
          <textarea
            placeholder="Tell us what's wrong with it..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full min-h-[64px] text-sm resize-none rounded-xl border border-border bg-background px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReportOpen(false)}
              disabled={isReporting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-text-secondary hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={isReporting || !reportReason.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isReporting ? 'Reporting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CommentReplyItem({
  reply,
  currentUserId,
  onDeleted,
}: {
  reply: CommentReplyData;
  currentUserId?: string;
  onDeleted: (replyId: string) => void;
}) {
  const like = useToggleLike(reply.id, true, reply.likesCount, !!reply.hasLiked, currentUserId);
  const rDisplayName = reply.user.displayName || reply.user.username || 'Unknown';
  const rInitial = rDisplayName.slice(0, 2).toUpperCase();
  const isOwner = !!currentUserId && reply.userId === currentUserId;

  const handleDelete = async (): Promise<ActionResult> => {
    const res = await deleteReply(reply.id);
    if (res.success) onDeleted(reply.id);
    return res;
  };

  return (
    <div className="flex gap-3">
      <div className="relative h-8 w-8 shrink-0 rounded-full overflow-hidden bg-surface-light border border-border flex items-center justify-center text-xs font-bold">
        {reply.user.avatarUrl ? (
          <Image src={reply.user.avatarUrl} alt={rDisplayName} fill className="object-cover" unoptimized />
        ) : (
          rInitial
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-text-primary">
            {rDisplayName}
          </span>
          {reply.user.role === 'ADMIN' && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary text-white">
              ADMIN
            </span>
          )}
          <span className="text-[11px] text-text-muted" suppressHydrationWarning>
            {formatRelativeTime(reply.createdAt)}
          </span>
        </div>
        <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">
          {reply.content}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1.5">
          <LikeButton
            likes={like.likes}
            hasLiked={like.hasLiked}
            isLiking={like.isLiking}
            onToggle={like.toggleLike}
            size="sm"
          />
          <ItemTools
            isOwner={isOwner}
            currentUserId={currentUserId}
            itemLabel="reply"
            onDelete={handleDelete}
            onReport={(reason) => reportReply(reply.id, reason)}
          />
        </div>
      </div>
    </div>
  );
}

export function CommentItem({
  comment,
  currentUserId,
  onDeleted
}: {
  comment: CommentData;
  currentUserId?: string;
  onDeleted?: (commentId: string) => void;
}) {
  const like = useToggleLike(comment.id, false, comment.likesCount, !!comment.hasLiked, currentUserId);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  // Local copy so a deleted reply disappears immediately; revalidation
  // syncs the fresh list back in through the effect below.
  const [replies, setReplies] = useState<CommentReplyData[]>(comment.replies);

  useEffect(() => {
    setReplies(comment.replies);
  }, [comment.replies]);

  const submitReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmittingReply(true);
    try {
      await replyToComment(comment.id, replyContent);
      toast.success('Reply posted');
      setReplyContent('');
      setIsReplying(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to post reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async (): Promise<ActionResult> => {
    const res = await deleteComment(comment.id);
    if (res.success) onDeleted?.(comment.id);
    return res;
  };

  const handleReplyDeleted = (replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  };

  const displayName = comment.user.displayName || comment.user.username || 'Unknown User';
  const initial = displayName.slice(0, 2).toUpperCase();
  const isOwner = !!currentUserId && comment.userId === currentUserId;

  return (
    <div className="flex gap-4">
      <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-surface-light border border-border flex items-center justify-center text-sm font-bold">
        {comment.user.avatarUrl ? (
          <Image src={comment.user.avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
        ) : (
          initial
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-text-primary">
            {displayName}
          </span>
          {comment.user.role === 'ADMIN' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-white">
              ADMIN
            </span>
          )}
          <span className="text-xs text-text-muted flex items-center gap-1" suppressHydrationWarning>
            <Clock className="w-3 h-3" />
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        <p className="text-sm text-text-secondary whitespace-pre-wrap">
          {comment.content}
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <LikeButton
            likes={like.likes}
            hasLiked={like.hasLiked}
            isLiking={like.isLiking}
            onToggle={like.toggleLike}
          />
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reply
          </button>
          <ItemTools
            isOwner={isOwner}
            currentUserId={currentUserId}
            itemLabel="comment"
            onDelete={handleDelete}
            onReport={(reason) => reportComment(comment.id, reason)}
          />
        </div>

        {/* Reply Input Box */}
        {isReplying && (
          <div className="pt-3 flex gap-3">
             <div className="flex-1 space-y-3">
                <textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full min-h-[80px] text-sm resize-none rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsReplying(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg text-text-secondary hover:bg-foreground/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReply}
                    disabled={isSubmittingReply || !replyContent.trim()}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingReply ? 'Posting...' : 'Reply'}
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Replies List */}
        {replies.length > 0 && (
          <div className="pt-4 space-y-4 pl-4 border-l-2 border-border/50">
            {replies.map((reply) => (
              <CommentReplyItem
                key={reply.id}
                reply={reply}
                currentUserId={currentUserId}
                onDeleted={handleReplyDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
