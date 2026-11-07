'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { clearReadingHistory, removeHistoryItem } from '@/app/actions/history';

/**
 * "Clear all" button for the reading history page. Confirmation is an inline
 * panel, NOT window.confirm (the native dialog silently no-ops when
 * suppressed, which previously made delete buttons look dead).
 * Rendered by the page only when the history list is non-empty.
 */
export function ClearHistoryButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      const res = await clearReadingHistory();
      if (res.success) {
        toast.success('History cleared');
        setConfirming(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to clear history');
      }
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setIsClearing(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
        <span className="text-sm font-medium text-red-300">
          Clear all history? This cannot be undone.
        </span>
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={isClearing}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClear}
            disabled={isClearing}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear'}
          </button>
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-red-400 transition-colors shrink-0"
    >
      <Trash2 className="w-4 h-4" />
      Clear all
    </button>
  );
}

/**
 * Small × button overlaid on a history card. The card itself is a <Link>, so
 * this button is rendered as a sibling of the link (absolutely positioned by
 * the page) and must stop the click from navigating.
 */
export function RemoveHistoryItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      const res = await removeHistoryItem(itemId);
      if (res.success) {
        toast.success('Removed from history');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to remove item');
      }
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isRemoving}
      aria-label="Remove from history"
      title="Remove from history"
      className="flex items-center justify-center w-7 h-7 rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-50"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
