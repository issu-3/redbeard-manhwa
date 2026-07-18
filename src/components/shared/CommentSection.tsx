'use client';

import { useState } from 'react';
import { CommentData, CommentItem } from './CommentItem';
import { postComment } from '@/app/actions/comments';
import { toast } from 'sonner';

export function CommentSection({ 
  chapterId, 
  comments,
  currentUserId 
}: { 
  chapterId: string;
  comments: CommentData[];
  currentUserId?: string;
}) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast.error('You must be logged in to comment');
      return;
    }
    
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await postComment(chapterId, content);
      setContent('');
      toast.success('Comment posted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-text-primary mb-4">
          Comments ({comments.length})
        </h3>
        
        {/* New Comment Input */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <textarea 
            placeholder={currentUserId ? "Share your thoughts on this chapter..." : "Log in to share your thoughts..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!currentUserId || isSubmitting}
            className="w-full min-h-[100px] resize-none rounded-xl border border-border bg-background px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
          />
          <div className="flex justify-end">
            <button 
              onClick={handleSubmit} 
              disabled={!currentUserId || isSubmitting || !content.trim()}
              className="px-6 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            currentUserId={currentUserId} 
          />
        ))}

        {comments.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
