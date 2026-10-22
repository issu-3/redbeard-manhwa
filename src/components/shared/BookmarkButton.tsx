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
import { cn } from '@/lib/utils';

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
  className?: string;
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
  continueReadingChapter,
  className,
}: BookmarkButtonProps) {
  // ⚡ BOLT OPTIMIZATION:
  // Subscribing to specific atomic state (isSaved, hasHydrated) instead of the whole store
  // prevents O(N) cascading re-renders when rendering lists of series with BookmarkButton.
  // Expected impact: Significantly reduced React rendering overhead for lists/sliders.
  const isSavedInStore = useAppLibraryStore((state) => state.isSaved(seriesId));
  const hasHydrated = useAppLibraryStore((state) => state.hasHydrated);

  const [internalBookmarked, setInternalBookmarked] = useState(initialBookmarked);
  
  // Use store as source of truth if hydrated, otherwise fallback to local/prop state
  const isBookmarked = hasHydrated ? isSavedInStore : internalBookmarked;

  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsPending(true);
    const previousState = isBookmarked;
    setInternalBookmarked(!previousState);

    try {
      const result = await toggleBookmark(seriesId);
      if (result.error) {
        throw new Error(result.error);
      }
      
      const newBookmarkedState = result.bookmarked as boolean;
      setInternalBookmarked(newBookmarkedState);

      // Sync to AppLibraryStore (Works for Web Memory + Native SQLite)
      if (title && slug) {
        const { addToLibrary, removeFromLibrary, updateLibrarySeries } = useAppLibraryStore.getState();
        if (newBookmarkedState) {
          await addToLibrary({
            seriesId,
            title,
            slug,
            coverImage: coverImage || null,
            status,
            latestChapterId,
            latestChapterNumber,
            continueReadingChapter
          });
          
          // Background caching for cover images (Native only)
          const isNative = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || navigator.userAgent.includes('RedbeardApp'));
          if (isNative && coverImage) {
            cacheCoverImage(seriesId, coverImage).then(cachedUri => {
              if (cachedUri) {
                updateLibrarySeries(seriesId, { cachedCoverUri: cachedUri });
              }
            }).catch(e => console.error("Failed to cache cover:", e));
          }
        } else {
          await removeFromLibrary(seriesId);
        }
      }

      if (newBookmarkedState) {
        toast.success('Added to bookmarks');
      } else {
        toast.success('Removed from bookmarks');
      }
      router.refresh();
    } catch (error: unknown) {
      // Revert on failure
      setInternalBookmarked(previousState);
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
      className={cn(
        "gap-2 font-semibold transition-all active:scale-95",
        isBookmarked 
          ? "bg-primary hover:bg-primary-hover text-white border-primary shadow-xs" 
          : "border-border/80 bg-card/60 hover:bg-card text-text-primary hover:text-white",
        className
      )}
    >
      <Bookmark className={cn("w-4 h-4 shrink-0", isBookmarked ? "fill-current text-white" : "")} />
      <span className="truncate">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
      {bookmarkCount > 0 && !isBookmarked && (
        <span className="ml-1 text-xs opacity-70 shrink-0">({bookmarkCount})</span>
      )}
    </Button>
  );
}
