import { cn } from '@/lib/utils';

type SkeletonCardVariant = 'default' | 'compact' | 'featured' | 'wide';

interface SkeletonCardProps {
  variant?: SkeletonCardVariant;
  className?: string;
}

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonCard({ variant = 'default', className }: SkeletonCardProps) {
  if (variant === 'wide') {
    return (
      <div
        className={cn(
          'flex rounded-xl overflow-hidden bg-card border border-border',
          className,
        )}
      >
        {/* Image skeleton */}
        <ShimmerBlock className="w-32 sm:w-44 shrink-0 aspect-[3/4] rounded-none" />

        {/* Content skeleton */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Title */}
            <ShimmerBlock className="h-5 w-3/4" />
            <ShimmerBlock className="h-4 w-1/2" />

            {/* Genres */}
            <div className="flex gap-2">
              <ShimmerBlock className="h-5 w-14 rounded-full" />
              <ShimmerBlock className="h-5 w-16 rounded-full" />
            </div>

            {/* Description lines */}
            <div className="space-y-2">
              <ShimmerBlock className="h-3 w-full" />
              <ShimmerBlock className="h-3 w-5/6" />
            </div>
          </div>

          {/* Bottom meta */}
          <div className="flex gap-4 mt-3">
            <ShimmerBlock className="h-4 w-16" />
            <ShimmerBlock className="h-4 w-12" />
          </div>
        </div>
      </div>
    );
  }

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-card border border-border',
        isFeatured ? 'col-span-2 row-span-2' : '',
        className,
      )}
    >
      {/* Image skeleton */}
      <ShimmerBlock
        className={cn(
          'w-full rounded-none',
          isFeatured ? 'aspect-[3/4]' : isCompact ? 'aspect-[3/4]' : 'aspect-[3/4]',
        )}
      />

      {/* Content skeleton */}
      <div className={cn('p-3 space-y-2.5', isCompact && 'p-2 space-y-2')}>
        {/* Title */}
        <ShimmerBlock className={cn('h-4 w-4/5', isCompact && 'h-3.5')} />
        {!isCompact && <ShimmerBlock className="h-3.5 w-3/5" />}

        {/* Genres */}
        <div className="flex gap-1.5">
          <ShimmerBlock className="h-4 w-12 rounded-full" />
          <ShimmerBlock className="h-4 w-14 rounded-full" />
        </div>

        {/* Rating & meta */}
        <div className="flex items-center justify-between">
          <ShimmerBlock className="h-3.5 w-20" />
          <ShimmerBlock className="h-3.5 w-14" />
        </div>
      </div>
    </div>
  );
}
