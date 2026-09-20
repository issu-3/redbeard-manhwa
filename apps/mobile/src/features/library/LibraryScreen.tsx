import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../../store/library';

export function LibraryScreen() {
  const navigate = useNavigate();
  const { series, isLoading, isSyncing, loadLocal, syncWithServer } = useLibraryStore();

  useEffect(() => {
    // 1. Immediately load local DB
    loadLocal();
    // 2. Background sync
    syncWithServer();
  }, []);

  if (isLoading && series.length === 0) {
    return <div className="p-4">Loading Library...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Library</h1>
        {isSyncing && <span className="text-xs text-slate-400">Syncing...</span>}
      </div>
      
      {series.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-slate-500 text-center">
          <p>Your library is empty.<br/>Bookmark some series!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {series.map(s => (
            <div 
              key={s.id} 
              className="flex flex-col gap-1 cursor-pointer"
              onClick={() => navigate(`/series/${s.slug}`)}
            >
              <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-slate-800">
                {s.cover ? (
                  <img src={s.cover} alt={s.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-slate-500">No Cover</div>
                )}
              </div>
              <span className="text-xs font-medium line-clamp-2">{s.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
