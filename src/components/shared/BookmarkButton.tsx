'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleBookmark } from '@/app/actions/bookmarks';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppLibraryStore } from '@/store/app-library-store';
import { Capacitor } from '@capacitor/core';
import { cacheCoverImage } from '@/lib/cache-utils';

interface BookmarkButtonProps {
  seriesId: string;
  initialBookmarked: boolean;
  bookmarkCount?: number;
  
  // Metadata for local library sync (Mihon-style offline persistence)
  title?: string;
  slug?: string;
  coverImage?: string | null;
  status?: string | null;
  latestChapterId?: string | null;
  latestChapterNumber?: number | null;
  continueReadingChapter?: number | null;
}

export function BookmarkButton({ 
  seriesId, 
  initialBookmarked, 
  bookmarkCount = 0, 
  title, 
  slug, 
  coverImage,
  status,
  latestChapterId,
  latestChapterNumber,
  continueReadingChapter
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const store = useAppLibraryStore();

  const handleToggle = async () => {
    setIsPending(true);
    // Optimistic update
    setIsBookmarked(!isBookmarked);

    try {
      const result = await toggleBookmark(seriesId);
      if (result.error) {
        throw new Error(result.error);
      }
      
      const newBookmarkedState = result.bookmarked as boolean;
      setIsBookmarked(newBookmarkedState);

      // --- NATIVE LOCAL LIBRARY SYNC ---
      // If we are native and have metadata, sync to the offline-first LocalLibraryRepository
      const isNative = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && navigator.userAgent.includes('RedbeardApp'));
      if (isNative && title && slug) {
        if (newBookmarkedState) {
          await store.addToLibrary({
            seriesId,
            title,
            slug,
            coverImage: coverImage || null,
            status,
            latestChapterId,
            latestChapterNumber,
            continueReadingChapter
          });
          
          // Background caching for cover images
          if (coverImage) {
            cacheCoverImage(seriesId, coverImage).then(cachedUri => {
              if (cachedUri) {
                store.updateLibrarySeries(seriesId, { cachedCoverUri: cachedUri });
              }
            }).catch(e => console.error("Failed to cache cover:", e));
          }
        } else {
          await store.removeFromLibrary(seriesId);
        }
      }
      // ----------------------------------

      if (newBookmarkedState) {
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
