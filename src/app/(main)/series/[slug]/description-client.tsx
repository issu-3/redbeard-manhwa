'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function DescriptionClient({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 300;
  const displayText = expanded || !isLong ? description : description.slice(0, 300).replace(/\s+\S*$/, '') + '...';

  return (
    <div className="mb-6">
      <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
        {displayText}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          {expanded ? (
            <>
              Show Less
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Read More
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
