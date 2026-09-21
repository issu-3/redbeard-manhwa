import type { Chapter } from '../../api/client';
import type { Chapter as LocalChapter } from '../../db/dao';
import { Download, CheckCircle2, MoreVertical } from 'lucide-react';

interface ChapterListProps {
  chapters: Chapter[];
  localChapters: Record<string, LocalChapter>;
}

export function ChapterList({ chapters, localChapters }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="py-8 text-center text-brand-secondary text-sm">
        No chapters available.
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-6">
      {chapters.map((chapter) => {
        const local = localChapters[chapter.id];
        const isRead = local?.read ?? false;
        
        let displayTitle = chapter.title || chapter.label;
        if (chapter.number != null && displayTitle && !displayTitle.toLowerCase().includes('chapter')) {
          displayTitle = `Chapter ${chapter.number} - ${displayTitle}`;
        }
        if (!displayTitle) {
          displayTitle = chapter.number != null ? `Chapter ${chapter.number}` : 'Chapter';
        }

        return (
          <button
            key={chapter.id}
            className={`flex items-center justify-between py-3 px-4 active:bg-white/5 transition-colors text-left ${isRead ? 'opacity-60 text-brand-secondary' : 'text-brand-text'}`}
            onClick={() => {
              // Reader not implemented yet
              console.log('Open chapter', chapter.id);
            }}
          >
            <div className="flex flex-col max-w-[75%]">
              <span className={`text-[15px] font-medium leading-snug ${!isRead && 'text-brand-text'}`}>
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
                <CheckCircle2 size={20} className="text-brand-secondary" />
              ) : (
                <Download size={20} className="text-brand-secondary" />
              )}
              <MoreVertical size={18} className="text-brand-secondary" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
