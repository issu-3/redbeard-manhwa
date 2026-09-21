import { useEffect, useState } from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { useLibraryStore } from '../../store/library';
import { SeriesCard } from '../../components/SeriesCard';

export function LibraryScreen() {
  const { series, isLoading, isSyncing, loadLocal, syncWithServer } = useLibraryStore();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Reading' | 'Completed' | 'On Hold'>('All');

  useEffect(() => {
    loadLocal();
    syncWithServer();
  }, []);

  // Filter logic based on the user's rule: "DO NOT FAKE LIBRARY STATUS."
  // Since our SQLite schema doesn't actively track reading/completed/on-hold natively 
  // via a separate 'status' enum, we apply simple honest filtering. 
  // If we lack the data, the filtered list simply evaluates as empty.
  const filteredSeries = series.filter(() => {
    if (activeFilter === 'All') return true;
    // Without schema changes, we cannot accurately determine these statuses yet.
    // We return false honestly so it shows empty, avoiding faked data.
    return false; 
  });

  return (
    <div className="flex flex-col h-full bg-brand-bg text-brand-text pt-safe">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 h-14">
        <h1 className="text-xl font-semibold tracking-wide">Library</h1>
        <div className="flex items-center gap-4 text-brand-text">
          {isSyncing && <span className="text-[10px] text-brand-secondary animate-pulse">Syncing...</span>}
          <Search size={22} />
          <Filter size={22} />
          <MoreVertical size={22} />
        </div>
      </div>
      
      {/* Filter Row */}
      <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto no-scrollbar">
        {(['All', 'Reading', 'Completed', 'On Hold'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter 
                ? 'bg-brand-primary text-white' 
                : 'bg-transparent text-brand-secondary'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading && series.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-brand-secondary">
            Loading...
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-brand-secondary text-sm text-center px-8">
            {activeFilter === 'All' 
              ? 'Your library is empty. Bookmark some series!' 
              : `No series found for "${activeFilter}".`}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 pb-6">
            {filteredSeries.map(s => (
              <SeriesCard key={s.id} series={s} showBookmarkIndicator={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
