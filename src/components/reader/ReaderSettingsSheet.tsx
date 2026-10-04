import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Sun, Expand, 
  ArrowRightToLine, ArrowLeftToLine, GripVertical, GripHorizontal, BoxSelect, Maximize,
  RectangleHorizontal, Scaling, Move, Sparkles
} from 'lucide-react';
import { useReaderStore } from '@/store/reader-store';
import { cn } from '@/lib/utils';

const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label?: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    {label && <span className="text-sm font-medium text-white/90">{label}</span>}
    <button 
      onClick={onChange} 
      className={cn("w-12 h-6 rounded-full transition-colors relative flex-shrink-0", checked ? "bg-[#E53935]" : "bg-white/10")}
    >
      <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", checked ? "left-7" : "left-1")} />
    </button>
  </div>
);

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6 space-y-3">
    <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{title}</h4>
    <div className="bg-[#1A1D24] p-4 rounded-2xl border border-white/5 shadow-sm space-y-4">
      {children}
    </div>
  </div>
);

export function ReaderSettingsSheet({ onClose }: { onClose: () => void }) {
  const store = useReaderStore();
  const [activeTab, setActiveTab] = useState<'display' | 'reading' | 'navigation' | 'advanced'>('display');

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-0 inset-x-0 z-[70] bg-[#0F1115] rounded-t-[32px] flex flex-col pb-safe shadow-2xl h-[85dvh] border-t border-white/10"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col shrink-0">
        <div className="p-4 flex items-center justify-between relative">
          <button onClick={onClose} className="p-2 bg-transparent text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6"/>
          </button>
          <h3 className="font-bold text-lg text-white absolute left-1/2 -translate-x-1/2">Reading Settings</h3>
          <div className="w-10"></div>
        </div>
        
        <div className="flex border-b border-white/10 px-2 overflow-x-auto thin-scrollbar">
          {['Display', 'Reading', 'Navigation', 'Advanced'].map(tab => {
            const isActive = activeTab === tab.toLowerCase();
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase() as any)}
                className={cn(
                  "flex-1 px-4 py-3 text-[13px] font-bold transition-all whitespace-nowrap",
                  isActive ? "text-white border-b-2 border-[#E53935]" : "text-white/50 border-b-2 border-transparent hover:text-white/80"
                )}
              >
                {isActive ? (
                  <span className="bg-[#E53935] text-white px-3 py-1 rounded-sm">{tab}</span>
                ) : (
                  tab
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto thin-scrollbar p-5 pb-10">
        
        {/* --- DISPLAY TAB --- */}
        {activeTab === 'display' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Reading Mode">
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => store.setMode('singlePage')} 
                  className={cn("p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all", store.mode === 'singlePage' ? "border-[#E53935] bg-[#E53935]/10" : "border-transparent bg-white/5 hover:bg-white/10")}
                >
                  <GripHorizontal className={cn("w-6 h-6", store.mode === 'singlePage' ? "text-[#E53935]" : "text-white/70")} />
                  <span className={cn("text-xs font-semibold", store.mode === 'singlePage' ? "text-[#E53935]" : "text-white/70")}>Vertical</span>
                </button>
                <button 
                  onClick={() => store.setMode('doublePage')} 
                  className={cn("p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all", store.mode === 'doublePage' ? "border-[#E53935] bg-[#E53935]/10" : "border-transparent bg-white/5 hover:bg-white/10")}
                >
                  <RectangleHorizontal className={cn("w-6 h-6", store.mode === 'doublePage' ? "text-[#E53935]" : "text-white/70")} />
                  <span className={cn("text-xs font-semibold", store.mode === 'doublePage' ? "text-[#E53935]" : "text-white/70")}>Horizontal</span>
                </button>
                <button 
                  onClick={() => store.setMode('longStrip')} 
                  className={cn("p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all", store.mode === 'longStrip' ? "border-[#E53935] bg-[#E53935]/10" : "border-transparent bg-white/5 hover:bg-white/10")}
                >
                  <GripVertical className={cn("w-6 h-6", store.mode === 'longStrip' ? "text-[#E53935]" : "text-white/70")} />
                  <span className={cn("text-xs font-semibold", store.mode === 'longStrip' ? "text-[#E53935]" : "text-white/70")}>Webtoon</span>
                </button>
              </div>
            </Section>

            <Section title="Background">
              <div className="flex justify-around items-center">
                {[
                  { id: 'white', color: '#FFFFFF', name: 'White' },
                  { id: 'gray', color: '#F5E6C8', name: 'Sepia' },
                  { id: 'black', color: '#121212', name: 'Dark' },
                  { id: 'pureBlack', color: '#000000', name: 'Pure Black' }
                ].map(bg => {
                  const isActive = store.backgroundColor === bg.id || (bg.id === 'pureBlack' && store.backgroundColor === 'black' && store.inverted);
                  return (
                    <button 
                      key={bg.id}
                      onClick={() => store.setBackgroundColor(bg.id as any)}
                      className="flex flex-col items-center gap-2"
                    >
                      <div 
                        className={cn("w-10 h-10 rounded-full border-[3px] transition-all", isActive ? "border-[#E53935] scale-110" : "border-transparent")}
                        style={{ backgroundColor: bg.color }}
                      ></div>
                      <span className="text-xs text-white/70">{bg.name}</span>
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section title="Brightness">
              <div className="flex items-center gap-4">
                <Sun className="w-5 h-5 text-white/50" />
                <input 
                  type="range" min="10" max="100" step="1" 
                  value={store.brightness} 
                  onChange={(e) => store.setBrightness(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#E53935] outline-none"
                />
                <span className="text-sm font-bold text-white/70 w-10 text-right">{Math.round(store.brightness)}%</span>
              </div>
            </Section>

            <Section title="Image Fit">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'width', name: 'Fit Width', icon: Maximize },
                  { id: 'height', name: 'Fit Height', icon: Scaling },
                  { id: 'original', name: 'Original', icon: Expand },
                  { id: 'smart', name: 'Smart Fit', icon: Sparkles }
                ].map(fit => (
                  <button 
                    key={fit.id}
                    onClick={() => store.setFitMode(fit.id as any)} 
                    className={cn("p-2 rounded-xl flex flex-col items-center gap-2 border-2 transition-all", store.fitMode === fit.id ? "border-[#E53935] bg-[#E53935]/10" : "border-transparent bg-white/5 hover:bg-white/10")}
                  >
                    <fit.icon className={cn("w-5 h-5", store.fitMode === fit.id ? "text-[#E53935]" : "text-white/70")} />
                    <span className={cn("text-[10px] font-semibold whitespace-nowrap", store.fitMode === fit.id ? "text-[#E53935]" : "text-white/70")}>{fit.name}</span>
                  </button>
                ))}
              </div>
            </Section>

            <div className="bg-[#1A1D24] px-4 rounded-2xl border border-white/5 shadow-sm">
              <ToggleSwitch label="Show Page Number" checked={store.showPageNumber} onChange={store.toggleShowPageNumber} />
              <ToggleSwitch label="Double Tap to Zoom" checked={store.doubleTapZoom} onChange={store.toggleDoubleTapZoom} />
              <ToggleSwitch label="Keep Screen On" checked={store.keepScreenOn} onChange={() => store.setKeepScreenOn(!store.keepScreenOn)} />
            </div>
          </div>
        )}

        {/* --- READING TAB --- */}
        {activeTab === 'reading' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Reading Direction">
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => store.setDirection('ltr')} 
                  className={cn("flex-1 py-3 text-sm font-semibold rounded-lg transition-colors", store.direction === 'ltr' ? "bg-[#E53935] text-white" : "text-white/60 hover:text-white")}
                >
                  Left to Right
                </button>
                <button 
                  onClick={() => store.setDirection('rtl')} 
                  className={cn("flex-1 py-3 text-sm font-semibold rounded-lg transition-colors", store.direction === 'rtl' ? "bg-[#E53935] text-white" : "text-white/60 hover:text-white")}
                >
                  Right to Left
                </button>
              </div>
            </Section>

            <Section title="Page Transition">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'scroll', name: 'Scroll', icon: Move },
                  { id: 'slide', name: 'Slide', icon: BoxSelect },
                  { id: 'fade', name: 'Fade', icon: Sparkles },
                  { id: 'none', name: 'None', icon: Expand }
                ].map(trans => (
                  <button 
                    key={trans.id}
                    onClick={() => store.setPageTransitionEffect(trans.id as any)} 
                    className={cn("p-2 rounded-xl flex flex-col items-center gap-2 border-2 transition-all", store.pageTransitionEffect === trans.id ? "border-[#E53935] bg-[#E53935]/10" : "border-transparent bg-white/5 hover:bg-white/10")}
                  >
                    <trans.icon className={cn("w-5 h-5", store.pageTransitionEffect === trans.id ? "text-[#E53935]" : "text-white/70")} />
                    <span className={cn("text-[10px] font-semibold whitespace-nowrap", store.pageTransitionEffect === trans.id ? "text-[#E53935]" : "text-white/70")}>{trans.name}</span>
                  </button>
                ))}
              </div>
            </Section>
            
            <Section title="Scroll Smoothness">
              <div className="flex items-center gap-4">
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={75} // Mock value for visual
                  readOnly
                  className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#E53935] outline-none"
                />
                <span className="text-sm font-bold text-white/70 w-10 text-right">75%</span>
              </div>
            </Section>

            <div className="bg-[#1A1D24] px-4 rounded-2xl border border-white/5 shadow-sm">
              <ToggleSwitch label="Remember Zoom Position" checked={store.rememberZoom} onChange={() => store.setRememberZoom(!store.rememberZoom)} />
              <ToggleSwitch label="Auto-hide Controls" checked={store.autoHideControls} onChange={() => store.setAutoHideControls(!store.autoHideControls)} />
            </div>
          </div>
        )}

        {/* --- NAVIGATION TAB --- */}
        {activeTab === 'navigation' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Section title="Tap Areas">
              <div className="w-full aspect-[21/9] bg-black rounded-xl border border-white/10 flex overflow-hidden mb-4 relative">
                {/* Visualizer */}
                <div className="flex-1 border-r border-white/10 flex items-center justify-center bg-white/5">
                  <ArrowLeftToLine className="w-6 h-6 text-white/30" />
                </div>
                <div className="flex-1 border-r border-white/10 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-white/30" />
                </div>
                <div className="flex-1 flex items-center justify-center bg-white/5">
                  <ArrowRightToLine className="w-6 h-6 text-white/30" />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-white/70 px-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#E53935]"/> Left: Previous</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#E53935]"/> Center: Settings</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked readOnly className="accent-[#E53935]"/> Right: Next</label>
              </div>
            </Section>

            <div className="bg-[#1A1D24] px-4 rounded-2xl border border-white/5 shadow-sm">
              <ToggleSwitch label="Volume Button to Navigate" checked={store.volumeNavigation} onChange={() => store.setVolumeNavigation(!store.volumeNavigation)} />
              <ToggleSwitch label="Swipe Navigation" checked={store.swipeNavigation} onChange={() => store.setSwipeNavigation(!store.swipeNavigation)} />
              <ToggleSwitch label="Show Chapter Progress" checked={store.showProgress} onChange={store.toggleShowProgress} />
              <ToggleSwitch label="Auto Next Chapter" checked={store.autoNextChapter} onChange={store.toggleAutoNextChapter} />
            </div>
          </div>
        )}

        {/* --- ADVANCED TAB --- */}
        {activeTab === 'advanced' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-[#1A1D24] px-4 rounded-2xl border border-white/5 shadow-sm mb-6">
              <ToggleSwitch label="Preload Next Pages" checked={store.preloadNextPages} onChange={() => store.setPreloadNextPages(!store.preloadNextPages)} />
              <ToggleSwitch label="Immersive Mode" checked={store.immersiveMode} onChange={() => store.setImmersiveMode(!store.immersiveMode)} />
            </div>

            <Section title="Screen Orientation">
              <div className="flex bg-white/5 p-1 rounded-xl">
                {['Auto', 'Portrait', 'Landscape'].map(mode => (
                  <button 
                    key={mode}
                    onClick={() => store.setRotationMode(mode.toLowerCase() as any)} 
                    className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-colors", (store.rotationMode === mode.toLowerCase() || (mode === 'Auto' && store.rotationMode === 'default')) ? "bg-[#E53935] text-white" : "text-white/60 hover:text-white")}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Image Quality">
              <div className="flex bg-white/5 p-1 rounded-xl">
                {['Auto', 'High', 'Data Saver'].map(mode => {
                  const val = mode === 'Data Saver' ? 'dataSaver' : mode.toLowerCase();
                  return (
                    <button 
                      key={mode}
                      onClick={() => store.setImageQuality(val as any)} 
                      className={cn("flex-1 py-2 text-[11px] font-semibold rounded-lg transition-colors", store.imageQuality === val ? "bg-[#E53935] text-white" : "text-white/60 hover:text-white")}
                    >
                      {mode}
                    </button>
                  )
                })}
              </div>
            </Section>

            <div className="mt-8">
              <button 
                onClick={() => {
                  store.resetFilters();
                  store.setMode('vertical');
                }} 
                className="w-full py-4 rounded-xl text-[#E53935] bg-[#E53935]/10 font-bold hover:bg-[#E53935]/20 transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
