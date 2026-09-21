import { useNavigate } from 'react-router-dom';
import type { Series } from '../db/dao';

interface SeriesCardProps {
  series: Series;
  showBookmarkIndicator?: boolean;
}

export function SeriesCard({ series, showBookmarkIndicator = false }: SeriesCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform"
      onClick={() => navigate(`/series/${series.slug}`)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-brand-card ring-1 ring-white/5">
        {series.cover ? (
          <img 
            src={series.cover} 
            alt={series.title} 
            className="h-full w-full object-cover transition-opacity" 
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-brand-secondary">
            No Cover
          </div>
        )}
        
        {/* Optional overlay gradients can go here, but keeping it minimal as requested */}
        {showBookmarkIndicator && series.bookmarked && (
          <div className="absolute top-2 right-2 bg-brand-primary rounded-full p-1 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          </div>
        )}
      </div>
      
      <div className="flex flex-col px-1">
        <span className="text-sm font-medium line-clamp-2 leading-tight text-brand-text">
          {series.title}
        </span>
        {/* Optional chapter count or status can be placed here if available */}
      </div>
    </div>
  );
}
