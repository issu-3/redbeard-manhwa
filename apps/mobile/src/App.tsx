import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useNetworkStore } from './store/network';
import { LibraryScreen } from './features/library/LibraryScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { BookMarked, Compass, Settings } from 'lucide-react';
import { BrowseScreen } from './features/browse/BrowseScreen';
import { SearchScreen } from './features/search/SearchScreen';
import { SeriesDetailScreen } from './features/series/SeriesDetailScreen';

function BottomNav() {
  return (
    <div className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around p-3 text-slate-400 z-50">
      <Link to="/browse" className="flex flex-col items-center hover:text-white">
        <Compass size={24} />
        <span className="text-xs mt-1">Browse</span>
      </Link>
      <Link to="/library" className="flex flex-col items-center hover:text-white">
        <BookMarked size={24} />
        <span className="text-xs mt-1">Library</span>
      </Link>
      <Link to="/settings" className="flex flex-col items-center hover:text-white">
        <Settings size={24} />
        <span className="text-xs mt-1">More</span>
      </Link>
    </div>
  );
}

export default function App() {
  const { initNetworkDetection, isOnline } = useNetworkStore();

  useEffect(() => {
    initNetworkDetection();
  }, [initNetworkDetection]);

  return (
    <Router>
      <div className="flex flex-col h-screen bg-slate-950 text-slate-100 pb-[72px] overflow-hidden">
        
        {/* Network Banner */}
        {!isOnline && (
          <div className="bg-red-600/20 text-red-500 text-center text-xs py-1">You are currently offline</div>
        )}

        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/browse" element={<BrowseScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/series/:slug" element={<SeriesDetailScreen />} />
            
            {/* Default redirect to library or browse */}
            <Route path="/" element={<Navigate to="/library" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </Router>
  );
}
