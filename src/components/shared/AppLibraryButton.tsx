'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAppLibraryStore } from '@/store/app-library-store';
import { toast } from 'sonner';
import { cacheCoverImage } from '@/lib/cache-utils';

interface AppLibraryButtonProps {
  seriesId: string;
  title: string;
  slug: string;
  coverImage: string | null;
}

export function AppLibraryButton({ seriesId, title, slug, coverImage }: AppLibraryButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const store = useAppLibraryStore();

  useEffect(() => {
    setIsSaved(store.isSaved(seriesId));
    setMounted(true);
  }, [store, seriesId]);

  if (!mounted || !store.hasHydrated) {
    // Return a placeholder that looks like the real button
    return (
      <button disabled className="flex flex-col items-center justify-center gap-1 opacity-50 px-4 py-2 w-full max-w-[120px] cursor-not-allowed">
        <Heart className="w-5 h-5" />
        <span className="text-xs">Loading...</span>
      </button>
    );
  }

  const handleToggle = async () => {
    if (isSaved) {
      store.removeFromLibrary(seriesId);
      toast.success('Removed from Offline Library');
    } else {
      store.addToLibrary({
        seriesId,
        title,
        slug,
        coverImage
      });
      toast.success('Added to Offline Library');
      
      // Attempt to cache cover image in background
      if (coverImage) {
        try {
          const cachedUri = await cacheCoverImage(seriesId, coverImage);
          if (cachedUri) {
            store.updateLibrarySeries(seriesId, { cachedCoverUri: cachedUri });
          }
        } catch (e) {
          console.error("Failed to cache cover:", e);
        }
      }
    }
    setIsSaved(!isSaved);
  };

  return (
    <button 
      onClick={handleToggle}
      className={`flex flex-col items-center justify-center gap-1 px-4 py-2 w-full max-w-[120px] rounded-lg transition-colors ${
        isSaved 
          ? 'text-primary hover:bg-primary/10' 
          : 'text-text-secondary hover:text-primary hover:bg-primary/5'
      }`}
    >
      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
      <span className="text-xs">{isSaved ? 'In Library' : 'Add to library'}</span>
    </button>
  );
}
