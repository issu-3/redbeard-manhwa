import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useNetworkStore } from './store/network';
import { LibraryScreen } from './features/library/LibraryScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { BookMarked, Compass, Settings } from 'lucide-react';
import { BrowseScreen } from './features/browse/BrowseScreen';
import { SearchScreen } from './features/search/SearchScreen';
import { SeriesDetailScreen } from './features/series/SeriesDetailScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function BottomNav() {
  const navClass = ({ isActive }: { isActive: boolean }) => 
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      isActive ? 'text-brand-primary' : 'text-brand-secondary hover:text-brand-text'
    }`;

  return (
    <div className="fixed bottom-0 w-full bg-brand-surface border-t border-white/5 flex justify-around items-center h-[60px] pb-safe z-50">
      <NavLink to="/library" className={navClass}>
        <BookMarked size={22} strokeWidth={2.5} />
        <span className="text-[10px] font-medium">Library</span>
      </NavLink>
      <NavLink to="/browse" className={navClass}>
        <Compass size={22} strokeWidth={2.5} />
        <span className="text-[10px] font-medium">Browse</span>
      </NavLink>
      <NavLink to="/settings" className={navClass}>
        <Settings size={22} strokeWidth={2.5} />
        <span className="text-[10px] font-medium">More</span>
      </NavLink>
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
      <div className="flex flex-col h-screen bg-brand-bg text-brand-text pb-[60px] overflow-hidden">
        
        {/* Network Banner */}
        {!isOnline && (
          <div className="bg-red-600/20 text-red-500 text-center text-xs py-1">You are currently offline</div>
        )}

        <div id="series-scroll-container" className="flex-1 overflow-y-auto relative">
          <Routes>
            <Route path="/browse" element={<BrowseScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/series/:slug" element={<ErrorBoundary><SeriesDetailScreen /></ErrorBoundary>} />
            
            {/* Default redirect to library or browse */}
            <Route path="/" element={<Navigate to="/library" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </Router>
  );
}
