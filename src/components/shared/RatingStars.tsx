'use client';

import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { useState } from 'react';

interface RatingStarsProps {
  /** Rating value on 0–10 scale */
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (score: number) => void;
  showNumeric?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { star: 12, gap: 'gap-0.5', text: 'text-xs' },
  md: { star: 16, gap: 'gap-1', text: 'text-sm' },
  lg: { star: 22, gap: 'gap-1.5', text: 'text-base' },
} as const;

export function RatingStars({
  rating,
  maxRating = 10,
  size = 'md',
  interactive = false,
  onRate,
  showNumeric = true,
  className,
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const { star: starSize, gap, text } = sizeMap[size];

  const totalStars = 5;
  // Convert from 0-10 to 0-5
  const displayRating = hoverValue !== null ? hoverValue : (rating / maxRating) * totalStars;

  const handleClick = (starIndex: number) => {
    if (!interactive || !onRate) return;
    // Convert from 0-5 back to 0-10
    const newRating = ((starIndex + 1) / totalStars) * maxRating;
    onRate(newRating);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverValue(starIndex + (isHalf ? 0.5 : 1));
  };

  return (
    <div className={cn('flex items-center', gap, className)}>
      <div className={cn('flex items-center', gap)}>
        {Array.from({ length: totalStars }).map((_, i) => {
          const fillPercentage = Math.min(1, Math.max(0, displayRating - i)) * 100;

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(i)}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => setHoverValue(null)}
              className={cn(
                'relative focus-ring rounded-sm',
                interactive
                  ? 'cursor-pointer transition-transform hover:scale-110'
                  : 'cursor-default',
              )}
              aria-label={interactive ? `Rate ${i + 1} out of 5 stars` : undefined}
            >
              {/* Background (empty) star */}
              <Star
                size={starSize}
                className="text-text-muted/30"
                strokeWidth={1.5}
              />
              {/* Filled overlay */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star
                  size={starSize}
                  className="text-amber-400 fill-amber-400"
                  strokeWidth={1.5}
                />
              </div>
            </button>
          );
        })}
      </div>

      {showNumeric && (
        <span className={cn('font-semibold text-text-secondary ml-1', text)}>
          {(rating / maxRating * totalStars).toFixed(1)}
        </span>
      )}
    </div>
  );
}
