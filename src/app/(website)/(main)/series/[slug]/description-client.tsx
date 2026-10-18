'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DescriptionClient({ description }: { description?: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!description || !description.trim()) {
    return null;
  }

  const cleanDescription = description.trim();
  const isLong = cleanDescription.length > 220;

  return (
    <div className="relative">
      <div
        className={cn(
          "text-xs sm:text-sm text-text-secondary leading-relaxed sm:leading-relaxed whitespace-pre-line transition-all duration-200",
          !expanded && isLong && "line-clamp-3 sm:line-clamp-4"
        )}
      >
        {cleanDescription}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:text-primary-hover active:scale-95 transition-all py-0.5"
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less description' : 'Read more description'}
        >
          {expanded ? (
            <>
              Show Less
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Read More
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
