import type { Chapter } from '../../api/client';
import type { Chapter as LocalChapter } from '../../db/dao';

interface ChapterListProps {
  chapters: Chapter[];
  localChapters: Record<string, LocalChapter>;
}

export function ChapterList({ chapters, localChapters }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No chapters available.
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-slate-800">
      {chapters.map((chapter) => {
        const local = localChapters[chapter.id];
        const isRead = local?.read ?? false;
        
        return (
          <button
            key={chapter.id}
            className={`flex items-center justify-between p-4 border-b border-slate-800/50 hover:bg-slate-900 transition-colors text-left ${isRead ? 'opacity-60' : ''}`}
            onClick={() => {
              // Reader not implemented yet
              console.log('Open chapter', chapter.id);
            }}
          >
            <div className="flex flex-col">
              <span className={`text-sm font-semibold ${isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                Chapter {chapter.number} {chapter.title ? `- ${chapter.title}` : ''}
              </span>
              <div className="flex items-center gap-2 mt-1">
                {chapter.publishedAt && (
                  <span className="text-xs text-slate-500">
                    {new Date(chapter.publishedAt).toLocaleDateString()}
                  </span>
                )}
                {local?.downloadStatus === 'COMPLETED' && (
                  <span className="text-[10px] font-bold bg-green-900 text-green-300 px-1.5 py-0.5 rounded">
                    DOWNLOADED
                  </span>
                )}
              </div>
            </div>
            {local?.readingProgress ? (
              <span className="text-[10px] font-medium text-slate-400">
                {local.readingProgress}%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
