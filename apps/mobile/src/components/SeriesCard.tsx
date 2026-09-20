import { Link } from 'react-router-dom';
import type { SeriesCardData } from '../api/client';

export function SeriesCard({ series }: { series: SeriesCardData }) {
  return (
    <Link to={`/series/${series.slug}`} className="flex flex-col group h-full">
      <div className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-slate-800 shadow-lg">
        {series.coverImage ? (
          <img
            src={series.coverImage}
            alt={series.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-2">
            No Cover
          </div>
        )}
        
        {/* Badges overlay */}
        <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
          {series.isNSFW && (
            <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
              18+
            </span>
          )}
          {series.type && (
            <span className="bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
              {series.type}
            </span>
          )}
        </div>
        <div className="absolute bottom-1 right-1">
           {series.chapterCount > 0 && (
            <span className="bg-slate-900/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow">
              {series.chapterCount} ch
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-slate-200 leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">
          {series.title}
        </h3>
        <div className="mt-auto pt-1 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            ⭐ {series.averageRating > 0 ? series.averageRating.toFixed(1) : 'N/A'}
          </span>
          <span className={
            series.status === 'ONGOING' ? 'text-green-500' : 
            series.status === 'COMPLETED' ? 'text-blue-500' : 'text-slate-500'
          }>
            {series.status}
          </span>
        </div>
      </div>
    </Link>
  );
}
