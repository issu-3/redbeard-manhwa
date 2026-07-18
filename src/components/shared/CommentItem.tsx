'use client';

import { useState } from 'react';
import { ThumbsUp, MessageSquare, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { likeComment, replyToComment } from '@/app/actions/comments';
import { toast } from 'sonner';

export interface CommentData {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  isPinned: boolean;
  isSpoiler: boolean;
  isEdited: boolean;
  createdAt: Date;
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
  createdAt: Date;
  user: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

export function CommentItem({ 
  comment, 
  currentUserId 
}: { 
  comment: CommentData;
  currentUserId?: string;
}) {
  const [isLiking, setIsLiking] = useState(false);
  const [likes, setLikes] = useState(comment.likesCount);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error('Must be logged in to like');
      return;
    }
    if (isLiking) return;
    
    setIsLiking(true);
    setLikes(prev => prev + 1); // Optimistic
    try {
      await likeComment(comment.id, false);
    } catch (e: unknown) {
      setLikes(prev => prev - 1);
      toast.error('Failed to like comment');
    } finally {
      setIsLiking(false);
    }
  };

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

  const displayName = comment.user.displayName || comment.user.username || 'Unknown User';
  const initial = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex gap-4">
      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-surface-light border border-border flex items-center justify-center text-sm font-bold">
        {comment.user.avatarUrl ? (
          <img src={comment.user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
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
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(comment.createdAt.toISOString())}
          </span>
        </div>

        <p className="text-sm text-text-secondary whitespace-pre-wrap">
          {comment.content}
        </p>

        <div className="flex items-center gap-4 pt-1">
          <button 
            onClick={handleLike}
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Reply
          </button>
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
                    className="px-4 py-2 text-sm font-semibold rounded-lg text-text-secondary hover:bg-white/5 transition-colors"
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
        {comment.replies.length > 0 && (
          <div className="pt-4 space-y-4 pl-4 border-l-2 border-border/50">
            {comment.replies.map(reply => {
              const rDisplayName = reply.user.displayName || reply.user.username || 'Unknown';
              const rInitial = rDisplayName.slice(0, 2).toUpperCase();
              return (
                <div key={reply.id} className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-surface-light border border-border flex items-center justify-center text-xs font-bold">
                    {reply.user.avatarUrl ? (
                      <img src={reply.user.avatarUrl} alt={rDisplayName} className="h-full w-full object-cover" />
                    ) : (
                      rInitial
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary">
                        {rDisplayName}
                      </span>
                      {reply.user.role === 'ADMIN' && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary text-white">
                          ADMIN
                        </span>
                      )}
                      <span className="text-[11px] text-text-muted">
                        {formatRelativeTime(reply.createdAt.toISOString())}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
