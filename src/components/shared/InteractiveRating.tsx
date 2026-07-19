'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { submitRating } from '@/app/actions/public/rating';
import { RatingStars } from './RatingStars';
import { formatNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface InteractiveRatingProps {
  seriesId: string;
  initialAverage: number;
  initialCount: number;
  initialUserRating: number | null;
  isLoggedIn: boolean;
}

export function InteractiveRating({
  seriesId,
  initialAverage,
  initialCount,
  initialUserRating,
  isLoggedIn,
}: InteractiveRatingProps) {
  const router = useRouter();
  
  const [average, setAverage] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We want to pass a 1-5 scale. RatingStars converts whatever it receives based on maxRating
  // We'll pass userRating if it exists, otherwise the average.
  const displayValue = userRating !== null ? userRating : average;

  const handleRate = async (score: number) => {
    if (!isLoggedIn) {
      toast.error('Sign in required', {
        description: 'Please sign in to rate this series.',
        action: {
          label: 'Sign In',
          onClick: () => router.push('/login'),
        }
      });
      return;
    }

    if (isSubmitting) return;
    
    // Optimistic UI update
    const previousRating = userRating;
    const previousAverage = average;
    const previousCount = count;
    
    setUserRating(score);
    setIsSubmitting(true);
    
    const toastId = toast.loading('Saving rating...');

    try {
      const result = await submitRating(seriesId, score);
      
      if (result.success) {
        setAverage(result.newAverage || score);
        setCount(result.newCount || 1);
        toast.success('Rating saved successfully!', { id: toastId });
      } else {
        // Revert on failure
        setUserRating(previousRating);
        setAverage(previousAverage);
        setCount(previousCount);
        toast.error(result.error || 'Failed to save rating', { id: toastId });
      }
    } catch (error) {
      setUserRating(previousRating);
      setAverage(previousAverage);
      setCount(previousCount);
      toast.error('An unexpected error occurred.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 mb-5">
      <RatingStars 
        rating={displayValue} 
        maxRating={5} 
        size="lg" 
        interactive={true} 
        onRate={handleRate} 
        showNumeric={false}
      />
      
      {count === 0 ? (
        <span className="text-sm text-text-muted italic ml-1">
          No ratings yet
        </span>
      ) : (
        <>
          <span className="text-xl font-bold text-amber-400">
            {average.toFixed(1)}
          </span>
          <span className="text-sm text-text-muted">
            ({formatNumber(count)} ratings)
          </span>
          {userRating && (
            <span className="text-xs font-medium text-primary ml-2 bg-primary/10 px-2 py-0.5 rounded-full">
              You rated: {userRating}
            </span>
          )}
        </>
      )}
    </div>
  );
}
