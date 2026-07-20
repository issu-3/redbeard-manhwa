'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Star, MessageSquare, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime } from '@/lib/utils';
import { submitReview, deleteReview } from '@/app/actions/public/reviews';
import { toast } from 'sonner';
import type { Review, User } from '@prisma/client';

type ReviewWithUser = Review & { user: User };

interface ReviewsSectionProps {
  seriesId: string;
  averageRating: number;
  ratingCount: number;
  initialReviews: ReviewWithUser[];
  ratingDistribution: { [key: number]: number };
}

export function ReviewsSection({
  seriesId,
  averageRating,
  ratingCount,
  initialReviews,
  ratingDistribution,
}: ReviewsSectionProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState(initialReviews);
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest'>('newest');

  const userReview = reviews.find((r) => r.userId === session?.user?.id);

  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [content, setContent] = useState(userReview?.content || '');
  const [isSpoiler, setIsSpoiler] = useState(userReview?.isSpoiler || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitReview(seriesId, rating, content, isSpoiler);
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Review submitted successfully!');
      setIsEditing(false);
      // Let the page reload or handle optimistic update
      window.location.reload();
    } else {
      toast.error(res.error || 'Failed to submit review');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    const res = await deleteReview(reviewId);
    if (res.success) {
      toast.success('Review deleted');
      window.location.reload();
    } else {
      toast.error(res.error || 'Failed to delete review');
    }
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.rating - a.rating;
  });

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Rating Summary */}
        <div className="w-full md:w-1/3 p-6 rounded-2xl bg-card border border-border">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-warning fill-warning" />
            Reviews & Ratings
          </h3>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-5xl font-black">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground pb-1">/ 5</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Based on {ratingCount} review{ratingCount !== 1 && 's'}
          </p>

          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const percent = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-4">{star}</span>
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground text-xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Review Form */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Your Review</h3>
          </div>

          {!session ? (
            <div className="p-6 rounded-xl border border-border bg-card/50 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="mb-4 text-muted-foreground">Log in to leave a review.</p>
              <Button asChild>
                <a href="/login">Log In</a>
              </Button>
            </div>
          ) : userReview && !isEditing ? (
            <div className="p-6 rounded-xl border border-border bg-card relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= userReview.rating
                          ? 'text-warning fill-warning'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger hover:bg-danger/10"
                    onClick={() => handleDelete(userReview.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
              {userReview.content ? (
                <p className="whitespace-pre-wrap">{userReview.content}</p>
              ) : (
                <p className="text-muted-foreground italic">No written review.</p>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 transition-all ${
                        star <= (hoverRating || rating)
                          ? 'text-warning fill-warning'
                          : 'text-muted'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  Select a rating
                </span>
              </div>
              
              <Textarea
                placeholder="Write an optional review..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mb-4"
                rows={4}
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="rounded border-border bg-background"
                  />
                  Contains Spoilers
                </label>
                <div className="flex gap-2">
                  {userReview && isEditing && (
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-6 pt-8 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Community Reviews</h3>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'highest')}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rated</option>
          </select>
        </div>

        {sortedReviews.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-xl bg-card/30">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((review) => (
              <div key={review.id} className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                      <img
                        src={review.user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${review.user.id}`}
                        alt={review.user.displayName || review.user.username || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {review.user.displayName || review.user.username || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= review.rating
                            ? 'text-warning fill-warning'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {review.content && (
                  <div className="mt-3">
                    {review.isSpoiler ? (
                      <details className="group cursor-pointer">
                        <summary className="text-xs font-semibold text-danger flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3" />
                          Spoiler Warning (Click to reveal)
                        </summary>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{review.content}</p>
                      </details>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{review.content}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
