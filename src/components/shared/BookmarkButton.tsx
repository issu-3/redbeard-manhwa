'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleBookmark } from '@/app/actions/bookmarks';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface BookmarkButtonProps {
  seriesId: string;
  initialBookmarked: boolean;
  bookmarkCount?: number;
}

export function BookmarkButton({ seriesId, initialBookmarked, bookmarkCount = 0 }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsPending(true);
    // Optimistic update
    setIsBookmarked(!isBookmarked);

    try {
      const result = await toggleBookmark(seriesId);
      if (result.error) {
        throw new Error(result.error);
      }
      setIsBookmarked(result.bookmarked as boolean);
      if (result.bookmarked) {
        toast.success('Added to bookmarks');
      } else {
        toast.success('Removed from bookmarks');
      }
      router.refresh();
    } catch (error: unknown) {
      // Revert on failure
      setIsBookmarked(isBookmarked);
      const msg = error instanceof Error ? error.message : 'Failed to update bookmark';
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button 
      variant={isBookmarked ? "default" : "outline"} 
      onClick={handleToggle}
      disabled={isPending}
      className={`gap-2 ${isBookmarked ? 'bg-primary text-primary-foreground' : ''}`}
    >
      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
      {bookmarkCount > 0 && !isBookmarked && (
        <span className="ml-1 text-xs opacity-70">({bookmarkCount})</span>
      )}
    </Button>
  );
}
