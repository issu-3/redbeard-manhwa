import { useState, useEffect } from 'react';
import { Check, ArrowDown, ArrowUp } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

export type FilterState = {
  downloaded: boolean;
  unread: boolean;
};

export type SortState = {
  by: 'source' | 'chapterNumber' | 'uploadDate' | 'alphabetically';
  desc: boolean;
};

export type DisplayState = {
  showTitle: 'sourceTitle' | 'chapterNumber';
};

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  display: DisplayState;
  onDisplayChange: (display: DisplayState) => void;
}

const DISPLAY_PREF_KEY = 'redbeard_chapter_display_pref';

export function FilterSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  sort,
  onSortChange,
  display,
  onDisplayChange,
}: FilterSheetProps) {
  const [activeTab, setActiveTab] = useState<'filter' | 'sort' | 'display'>('filter');

  // Load display pref on mount
  useEffect(() => {
    (async () => {
      try {
        const { value } = await Preferences.get({ key: DISPLAY_PREF_KEY });
        if (value === 'sourceTitle' || value === 'chapterNumber') {
          onDisplayChange({ showTitle: value });
        }
      } catch (e) {
        console.warn('Failed to load display preference', e);
      }
    })();
  }, []);

  // Save display pref when it changes
  useEffect(() => {
    (async () => {
      try {
        await Preferences.set({ key: DISPLAY_PREF_KEY, value: display.showTitle });
      } catch (e) {
        console.warn('Failed to save display preference', e);
      }
    })();
  }, [display.showTitle]);

  if (!isOpen) return null;

  const toggleFilter = (key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const handleSortSelect = (by: SortState['by']) => {
    if (sort.by === by) {
      onSortChange({ by, desc: !sort.desc });
    } else {
      onSortChange({ by, desc: true });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 transition-opacity animate-in fade-in" onClick={onClose} />
      
      <div className="fixed inset-x-0 bottom-0 z-50 bg-brand-card rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-10 h-1.5 bg-white/20 rounded-full" />
        </div>
        
        <div className="flex border-b border-white/10">
          <button 
            className={`flex-1 py-3 text-[15px] font-medium transition-colors relative ${activeTab === 'filter' ? 'text-brand-primary' : 'text-brand-text'}`}
            onClick={() => setActiveTab('filter')}
          >
            Filter
            {activeTab === 'filter' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-primary" />}
          </button>
          <button 
            className={`flex-1 py-3 text-[15px] font-medium transition-colors relative ${activeTab === 'sort' ? 'text-brand-primary' : 'text-brand-text'}`}
            onClick={() => setActiveTab('sort')}
          >
            Sort
            {activeTab === 'sort' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-primary" />}
          </button>
          <button 
            className={`flex-1 py-3 text-[15px] font-medium transition-colors relative ${activeTab === 'display' ? 'text-brand-primary' : 'text-brand-text'}`}
            onClick={() => setActiveTab('display')}
          >
            Display
            {activeTab === 'display' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-primary" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {activeTab === 'filter' && (
            <div className="py-2">
              <button 
                onClick={() => toggleFilter('downloaded')}
                className="w-full flex items-center justify-between px-6 py-4 active:bg-white/5 transition-colors"
              >
                <span className="text-[15px] text-brand-text">Downloaded</span>
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${filters.downloaded ? 'bg-brand-primary border-brand-primary text-brand-bg' : 'border-white/20'}`}>
                  {filters.downloaded && <Check size={14} strokeWidth={3} />}
                </div>
              </button>
              
              <button 
                onClick={() => toggleFilter('unread')}
                className="w-full flex items-center justify-between px-6 py-4 active:bg-white/5 transition-colors"
              >
                <span className="text-[15px] text-brand-text">Unread</span>
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${filters.unread ? 'bg-brand-primary border-brand-primary text-brand-bg' : 'border-white/20'}`}>
                  {filters.unread && <Check size={14} strokeWidth={3} />}
                </div>
              </button>
              
              <button 
                className="w-full flex items-center justify-between px-6 py-4 opacity-50"
                disabled
              >
                <div className="flex flex-col text-left">
                  <span className="text-[15px] text-brand-text">Bookmarked</span>
                  <span className="text-[11px] text-brand-secondary">Feature not available in API</span>
                </div>
                <div className="w-5 h-5 rounded border border-white/20" />
              </button>

              <button 
                className="w-full flex items-center justify-between px-6 py-4 opacity-50"
                disabled
              >
                <div className="flex flex-col text-left">
                  <span className="text-[15px] text-brand-text">Scanlator</span>
                  <span className="text-[11px] text-brand-secondary">Data field missing in API</span>
                </div>
                <div className="w-5 h-5 rounded border border-white/20" />
              </button>
            </div>
          )}

          {activeTab === 'sort' && (
            <div className="py-2">
              {[
                { id: 'source', label: 'By source' },
                { id: 'chapterNumber', label: 'By chapter number' },
                { id: 'uploadDate', label: 'By upload date' },
                { id: 'alphabetically', label: 'Alphabetically' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSortSelect(opt.id as SortState['by'])}
                  className="w-full flex items-center justify-between px-6 py-4 active:bg-white/5 transition-colors"
                >
                  <span className={`text-[15px] ${sort.by === opt.id ? 'text-brand-primary font-medium' : 'text-brand-text'}`}>
                    {opt.label}
                  </span>
                  {sort.by === opt.id && (
                    <span className="text-brand-primary">
                      {sort.desc ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'display' && (
            <div className="py-2">
              <button 
                onClick={() => onDisplayChange({ showTitle: 'sourceTitle' })}
                className="w-full flex items-center gap-4 px-6 py-4 active:bg-white/5 transition-colors"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${display.showTitle === 'sourceTitle' ? 'border-brand-primary' : 'border-white/30'}`}>
                  {display.showTitle === 'sourceTitle' && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                </div>
                <span className="text-[15px] text-brand-text">Source title</span>
              </button>
              
              <button 
                onClick={() => onDisplayChange({ showTitle: 'chapterNumber' })}
                className="w-full flex items-center gap-4 px-6 py-4 active:bg-white/5 transition-colors"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${display.showTitle === 'chapterNumber' ? 'border-brand-primary' : 'border-white/30'}`}>
                  {display.showTitle === 'chapterNumber' && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                </div>
                <span className="text-[15px] text-brand-text">Chapter number</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
