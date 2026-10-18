'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';
import { submitReview, deleteReview } from '@/app/actions/public/reviews';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Review } from '@prisma/client';

type ReviewWithUser = Review & {
  user: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role?: string;
  };
};

interface ReviewsSectionProps {
  seriesId: string;
  averageRating: number;
  ratingCount: number;
  initialReviews: ReviewWithUser[];
  ratingDistribution: { [key: number]: number };
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Masterpiece',
};

/**
 * Pixel-perfect 5-star visual display supporting smooth fractional fills.
 */
function StarRatingDisplay({ 
  rating, 
  maxStars = 5, 
  size = 'md',
  className = ''
}: { 
  rating: number; 
  maxStars?: number; 
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-6 h-6 sm:w-7 sm:h-7',
  };

  return (
    <div 
      className={`flex items-center gap-1 ${className}`} 
      aria-label={`Rating: ${rating.toFixed(1)} out of ${maxStars} stars`}
    >
      {Array.from({ length: maxStars }).map((_, idx) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - idx) * 100));

        return (
          <div key={idx} className={`relative inline-block ${sizeClasses[size]} shrink-0`}>
            {/* Background empty star */}
            <Star 
              className="w-full h-full text-[#3E4553] fill-[#13161C]" 
              strokeWidth={1.5} 
            />
            {/* Foreground filled star with exact width clipping */}
            {fillPercentage > 0 && (
              <div 
                className="absolute inset-0 overflow-hidden" 
                style={{ width: `${fillPercentage}%` }}
              >
                <Star 
                  className="w-full h-full text-[#FFAA00] fill-[#FFAA00]" 
                  strokeWidth={1.5} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReviewsSection({
  seriesId,
  averageRating,
  ratingCount,
  initialReviews,
  ratingDistribution,
}: ReviewsSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithUser[]>(initialReviews);
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  // Identify if current authenticated user has already submitted a review
  const userReview = useMemo(() => {
    return reviews.find((r) => r.userId === session?.user?.id);
  }, [reviews, session?.user?.id]);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [content, setContent] = useState(userReview?.content || '');
  const [isSpoiler, setIsSpoiler] = useState(userReview?.isSpoiler || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Sync edit values if user review changes
  useEffect(() => {
    if (userReview && !isEditing) {
      setRating(userReview.rating);
      setContent(userReview.content || '');
      setIsSpoiler(userReview.isSpoiler);
    }
  }, [userReview, isEditing]);

  // Handle dynamic distribution calculation
  const distributionData = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    // Aggregate from actual review records if present
    if (reviews && reviews.length > 0) {
      reviews.forEach((r) => {
        const rounded = Math.round(r.rating);
        if (rounded >= 1 && rounded <= 5) {
          counts[rounded] = (counts[rounded] || 0) + 1;
        }
      });
    } else if (ratingDistribution) {
      for (let s = 1; s <= 5; s++) {
        counts[s] = ratingDistribution[s] || 0;
      }
    }

    const totalCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);
    const effectiveTotal = Math.max(totalCount, ratingCount);

    return [5, 4, 3, 2, 1].map((star) => {
      const count = counts[star] || 0;
      const percentage = effectiveTotal > 0 ? Math.round((count / effectiveTotal) * 100) : 0;
      return {
        star,
        count,
        percentage,
      };
    });
  }, [reviews, ratingDistribution, ratingCount]);

  // Dynamic average rating
  const dynamicAverage = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      return sum / reviews.length;
    }
    return averageRating || 0;
  }, [reviews, averageRating]);

  const totalReviewsDisplay = Math.max(reviews.length, ratingCount);

  // Clear / Reset form
  const handleClear = () => {
    setRating(0);
    setContent('');
    setIsSpoiler(false);
    setHoverRating(0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (userReview) {
      setRating(userReview.rating);
      setContent(userReview.content || '');
      setIsSpoiler(userReview.isSpoiler);
    } else {
      handleClear();
    }
  };

  // Submit review
  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (content.length > 500) {
      toast.error('Review must be 500 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReview(
        seriesId, 
        rating, 
        content.trim() ? content.trim() : null, 
        isSpoiler
      );

      if (res.success) {
        toast.success(userReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete review
  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      const res = await deleteReview(reviewId);
      if (res.success) {
        toast.success('Review deleted successfully');
        setIsEditing(false);
        handleClear();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      toast.error('Failed to delete review');
    }
  };

  // Sorted reviews list
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === 'highest') {
        return b.rating - a.rating;
      }
      return a.rating - b.rating;
    });
  }, [reviews, sortOrder]);

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="mt-10 md:mt-16 space-y-6 md:space-y-8">
      {/* ── 1. REVIEWS & RATINGS SUMMARY CARD ──────────────────────────── */}
      <section 
        aria-labelledby="reviews-summary-title"
        className="rounded-2xl bg-[#1A1D24] border border-[#2A2E39] p-5 sm:p-6 md:p-8 shadow-sm transition-all"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5 md:mb-6 pb-4 border-b border-[#2A2E39]/80">
          <div className="p-2 rounded-xl bg-[#FFAA00]/10 border border-[#FFAA00]/20 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-[#FFAA00] fill-[#FFAA00]" />
          </div>
          <div>
            <h2 id="reviews-summary-title" className="text-lg sm:text-xl font-bold text-[#F5F5F5] tracking-tight">
              Reviews &amp; Ratings
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Community feedback and rating breakdown
            </p>
          </div>
        </div>

        {/* Desktop 2-column layout / Mobile compact stacked layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
          {/* Left Column: Average Rating & Total Reviews */}
          <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left justify-center md:pr-6 md:border-r md:border-[#2A2E39]/80">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl sm:text-6xl font-black text-[#F5F5F5] tracking-tight tabular-nums">
                {dynamicAverage > 0 ? dynamicAverage.toFixed(1) : '0.0'}
              </span>
              <span className="text-lg sm:text-xl font-bold text-[#9CA3AF]">/ 5</span>
            </div>

            {/* Five-star visual rating display */}
            <div className="mb-2.5">
              <StarRatingDisplay rating={dynamicAverage} size="md" />
            </div>

            {/* Total reviews count */}
            <p className="text-xs sm:text-sm text-[#9CA3AF] font-medium">
              Based on <strong className="text-[#F5F5F5] font-semibold">{totalReviewsDisplay}</strong> {totalReviewsDisplay === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Right Column: 5 Rating Distribution Rows */}
          <div className="md:col-span-7 space-y-2.5 w-full">
            {distributionData.map(({ star, count, percentage }) => (
              <div 
                key={star} 
                className="flex items-center gap-2.5 text-xs sm:text-sm font-medium"
              >
                {/* Rating number */}
                <span className="w-3 text-right text-[#F5F5F5] font-bold tabular-nums">
                  {star}
                </span>

                {/* Gold star icon */}
                <Star className="w-3.5 h-3.5 text-[#FFAA00] fill-[#FFAA00] shrink-0" />

                {/* Horizontal progress bar */}
                <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-[#2A2E39]/80 overflow-hidden">
                  <div
                    className="h-full bg-[#FFAA00] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${star} star reviews: ${count} (${percentage}%)`}
                  />
                </div>

                {/* Actual review count */}
                <span className="w-9 sm:w-11 text-right text-[#9CA3AF] text-xs tabular-nums font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. YOUR REVIEW FORM CARD ───────────────────────────────────── */}
      <section 
        aria-labelledby="your-review-title"
        className="rounded-2xl bg-[#1A1D24] border border-[#2A2E39] p-5 sm:p-6 md:p-8 shadow-sm transition-all"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#2A2E39]/80">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#E53935]" />
            <h3 id="your-review-title" className="text-lg sm:text-xl font-bold text-[#F5F5F5] tracking-tight">
              Your Review
            </h3>
          </div>

          {/* Clear / Reset Action */}
          {session && (isEditing || !userReview) && (rating > 0 || content.trim().length > 0 || isSpoiler) && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-white/5 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#E53935]"
              aria-label="Clear review form"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Content based on session & existing review state */}
        {!session ? (
          <div className="p-6 sm:p-8 rounded-xl border border-[#2A2E39] bg-[#0F1115]/50 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E53935]/10 border border-[#E53935]/20 text-[#E53935] flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-[#F5F5F5]">Share Your Thoughts</h4>
            <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-sm mx-auto">
              Log in to REDBEARD to rate this series and write a community review.
            </p>
            <div className="pt-2">
              <Button 
                asChild 
                className="rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold px-6 py-2.5 text-sm transition-all shadow-md shadow-[#E53935]/25"
              >
                <Link href="/login">Log In to Review</Link>
              </Button>
            </div>
          </div>
        ) : userReview && !isEditing ? (
          /* View mode for user's existing review */
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <StarRatingDisplay rating={userReview.rating} size="sm" />
                <span className="text-xs sm:text-sm font-semibold text-[#FFAA00]">
                  {RATING_LABELS[userReview.rating] || `${userReview.rating} Stars`}
                </span>
                {userReview.isSpoiler && (
                  <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                    Spoiler
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-white/5 h-8 px-2.5 rounded-lg"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1 text-[#FFAA00]" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(userReview.id)}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>

            {userReview.content ? (
              <p className="text-sm text-[#F5F5F5] whitespace-pre-wrap leading-relaxed bg-[#0F1115]/60 p-4 rounded-xl border border-[#2A2E39]/60">
                {userReview.content}
              </p>
            ) : (
              <p className="text-xs text-[#9CA3AF] italic bg-[#0F1115]/40 p-3 rounded-xl border border-[#2A2E39]/40">
                You rated this series without a written review.
              </p>
            )}
          </div>
        ) : (
          /* Active Review Form (New or Editing) */
          <div className="space-y-5">
            {/* Interactive 5-star rating selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Select Your Rating *
              </label>
              <div className="flex items-center gap-3.5 flex-wrap">
                <div 
                  className="flex items-center gap-1" 
                  role="radiogroup" 
                  aria-label="Star rating selector"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={rating === star}
                        aria-label={`${star} star${star > 1 ? 's' : ''} - ${RATING_LABELS[star]}`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 rounded-md transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFAA00]"
                      >
                        <Star
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            isFilled
                              ? 'text-[#FFAA00] fill-[#FFAA00] drop-shadow-[0_2px_8px_rgba(255,170,0,0.35)]'
                              : 'text-[#3E4553] fill-[#13161C] hover:text-[#FFAA00]/60'
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#FFAA00] min-w-[90px]">
                  {hoverRating > 0 
                    ? RATING_LABELS[hoverRating] 
                    : rating > 0 
                      ? RATING_LABELS[rating] 
                      : 'Click to rate'}
                </span>
              </div>
            </div>

            {/* Review text area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="review-textarea" 
                  className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]"
                >
                  Review (Optional)
                </label>
                <span 
                  className={`text-xs tabular-nums font-semibold ${
                    content.length >= 500 ? 'text-[#E53935] font-bold' : 'text-[#9CA3AF]'
                  }`}
                >
                  {content.length}/500
                </span>
              </div>
              <textarea
                id="review-textarea"
                rows={4}
                maxLength={500}
                placeholder="Write your review..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl border border-[#2A2E39] bg-[#0F1115] text-[#F5F5F5] placeholder-[#9CA3AF]/60 p-3.5 sm:p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#E53935] focus:border-[#E53935] transition-all resize-y min-h-[100px]"
              />
            </div>

            {/* Spoilers & Edit actions */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-0.5">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-[#9CA3AF] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2A2E39] bg-[#0F1115] text-[#E53935] focus:ring-[#E53935] focus:ring-offset-0 cursor-pointer"
                />
                <span>Contains Spoilers</span>
              </label>

              {userReview && isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-xs border-[#2A2E39] text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-white/5 rounded-lg"
                >
                  Cancel Edit
                </Button>
              )}
            </div>

            {/* Full-width red Submit Review button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0 || content.length > 500}
              className="w-full py-3.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] active:bg-[#B71C1C] text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-[#E53935]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Review...</span>
                </>
              ) : userReview && isEditing ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        )}
      </section>

      {/* ── 3. COMMUNITY REVIEWS LIST ──────────────────────────────────── */}
      <section 
        aria-labelledby="community-reviews-title"
        className="space-y-4 pt-4 border-t border-[#2A2E39]/80"
      >
        {/* Header & Sorting */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <h3 id="community-reviews-title" className="text-lg sm:text-xl font-bold text-[#F5F5F5]">
              Community Reviews
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-[#2A2E39] text-[#9CA3AF] font-bold tabular-nums">
              {sortedReviews.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF] hidden sm:inline">Sort by:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'highest' | 'lowest')}
              className="rounded-xl border border-[#2A2E39] bg-[#1A1D24] text-[#F5F5F5] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#E53935] cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        {sortedReviews.length === 0 ? (
          <div className="text-center py-12 px-4 border border-[#2A2E39] rounded-2xl bg-[#1A1D24]/50">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-[#2A2E39] flex items-center justify-center mx-auto mb-3 text-[#9CA3AF]">
              <MessageSquare className="w-5 h-5 opacity-60" />
            </div>
            <h4 className="text-sm font-bold text-[#F5F5F5] mb-1">No reviews yet</h4>
            <p className="text-xs text-[#9CA3AF]">Be the first to share your thoughts on this series!</p>
          </div>
        ) : (
          /* Reviews List */
          <div className="space-y-3.5">
            {sortedReviews.map((review) => {
              const isOwner = review.userId === session?.user?.id;
              const isSpoilerRevealed = revealedSpoilers[review.id];

              return (
                <article 
                  key={review.id} 
                  className="p-4 sm:p-5 rounded-2xl border border-[#2A2E39] bg-[#1A1D24] shadow-xs space-y-3 transition-colors hover:border-[#2A2E39]/90"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* User profile */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#0F1115] border border-[#2A2E39] shrink-0">
                        <Image
                          src={review.user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${review.user.id}`}
                          alt={review.user.displayName || review.user.username || 'User avatar'}
                          fill
                          sizes="40px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-[#F5F5F5] truncate">
                            {review.user.displayName || review.user.username || 'Anonymous Reader'}
                          </p>
                          {review.user.role && review.user.role !== 'USER' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#E53935]/15 text-[#E53935] border border-[#E53935]/30 uppercase">
                              {review.user.role}
                            </span>
                          )}
                          {isOwner && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          {formatRelativeTime(review.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <StarRatingDisplay rating={review.rating} size="sm" />
                    </div>
                  </div>

                  {/* Review Content & Spoiler Handling */}
                  {review.content && (
                    <div className="pt-1">
                      {review.isSpoiler ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleSpoiler(review.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            <span>
                              {isSpoilerRevealed ? 'Hide Spoiler' : 'Spoiler Warning (Click to reveal)'}
                            </span>
                          </button>
                          {isSpoilerRevealed && (
                            <p className="text-sm text-[#F5F5F5]/90 whitespace-pre-wrap leading-relaxed pt-1 border-t border-red-500/10">
                              {review.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[#F5F5F5]/90 whitespace-pre-wrap leading-relaxed">
                          {review.content}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
