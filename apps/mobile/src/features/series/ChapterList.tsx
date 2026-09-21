import { useEffect, useState } from 'react';
import type { Chapter } from '../../api/client';
import type { Chapter as LocalChapter } from '../../db/dao';
import { Download, CircleCheck, MoreVertical } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';

interface ChapterListProps {
  chapters: Chapter[];
  localChapters: Record<string, LocalChapter>;
  displayPref?: 'sourceTitle' | 'chapterNumber';
}

export function ChapterList({ chapters, localChapters, displayPref = 'chapterNumber' }: ChapterListProps) {
  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>(undefined);

  useEffect(() => {
    setScrollParent(document.getElementById('series-scroll-container') || undefined);
  }, []);

  if (chapters.length === 0) {
    return (
      <div className="py-8 text-center text-brand-secondary text-sm">
        No chapters available.
      </div>
    );
  }

  // Wait until we have the scroll parent ref on the client
  if (!scrollParent) return <div className="flex-1" />;

  return (
    <div className="flex flex-col pb-6">
      <Virtuoso
        customScrollParent={scrollParent}
        data={chapters}
        itemContent={(_, chapter) => {
          const local = localChapters[chapter.id];
          const isRead = local?.read ?? false;
          
          let displayTitle = '';
          
          if (displayPref === 'sourceTitle') {
            displayTitle = String(chapter.title || chapter.label || `Chapter ${chapter.number || 0}`);
          } else {
            // chapterNumber display preference
            displayTitle = chapter.number != null ? `Chapter ${chapter.number}` : String(chapter.title || chapter.label || 'Chapter');
          }

          return (
            <button
              key={chapter.id}
              className={`w-full flex items-center justify-between py-3 px-4 active:bg-white/5 transition-colors text-left ${isRead ? 'opacity-60 text-brand-secondary' : 'text-brand-text'}`}
              onClick={() => {
                // Reader not implemented yet
                console.log('Open chapter', chapter.id);
              }}
            >
              <div className="flex flex-col max-w-[75%]">
                <span className={`text-[15px] font-medium leading-snug ${!isRead ? 'text-brand-text' : ''}`}>
                  {displayTitle}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  {chapter.publishedAt && (
                    <span className="text-[12px] text-brand-secondary">
                      {new Date(chapter.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                  {local?.readingProgress ? (
                    <>
                      <span className="text-brand-secondary text-[10px]">•</span>
                      <span className="text-[12px] text-brand-secondary">
                        Page {Math.floor(local.readingProgress)}%
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                {local?.downloadStatus === 'COMPLETED' ? (
                  <CircleCheck size={20} className="text-brand-secondary" />
                ) : (
                  <Download size={20} className="text-brand-secondary" />
                )}
                <MoreVertical size={18} className="text-brand-secondary" />
              </div>
            </button>
          );
        }}
      />
    </div>
  );
}
