'use client';

import { useState, useTransition, useMemo } from 'react';
import { Settings, Plus, Trash2, Search, GripVertical, Eye, EyeOff } from 'lucide-react';
import { SortableList } from './SortableList';
import { 
  upsertBanner, deleteBanner, reorderBanners, 
  updateSection, reorderSections, 
  searchSeries, updateHomepageSettings,
  refreshHomepageCache
} from '@/app/actions/admin/homepage';
import { toast } from 'sonner';

// Preview Components
import { HeroSlider } from '@/components/shared/HeroSlider';
import { TrendingCarousel } from '@/components/home/TrendingCarousel';
import { RecentlyUpdatedCarousel } from '@/components/home/RecentlyUpdatedCarousel';
import { ContinueReadingCarousel } from '@/components/home/ContinueReadingCarousel';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { Carousel } from '@/components/shared/Carousel';
import { toSeriesCardData } from '@/lib/data-mappers';

export function HomepageManager({ initialBanners, initialSections, initialManualData, featuredCount, initialSettings }: any) {
  const [banners, setBanners] = useState(initialBanners);
  const [sections, setSections] = useState(initialSections);
  const [settings, setSettings] = useState(initialSettings || {});
  const [manualData, setManualData] = useState<Record<string, any[]>>(initialManualData);
  const [isPending, startTransition] = useTransition();

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Banners Logic
  const handleReorderBanners = (newItems: any[]) => {
    setBanners(newItems);
    startTransition(async () => {
      await reorderBanners(newItems.map(i => i.id));
      toast.success('Banners reordered');
    });
  };

  const handleBannerSave = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = Object.fromEntries(formData.entries());
    data.isActive = data.isActive === 'true';
    e.currentTarget.reset();
    
    startTransition(async () => {
      await upsertBanner(data);
      toast.success('Banner saved! Please refresh to see changes locally.');
    });
  };

  const handleDeleteBanner = (id: string) => {
    startTransition(async () => {
      await deleteBanner(id);
      setBanners((prev: any[]) => prev.filter(b => b.id !== id));
      toast.success('Banner deleted');
    });
  };

  // Sections Logic
  const handleReorderSections = (newItems: any[]) => {
    setSections(newItems);
    startTransition(async () => {
      await reorderSections(newItems.map(i => i.id));
      toast.success('Sections reordered');
    });
  };

  const handleSectionUpdate = (id: string, updates: any) => {
    setSections((prev: any[]) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    startTransition(async () => {
      await updateSection(id, updates);
      toast.success('Section updated');
    });
  };

  const handleSettingsSave = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    
    const settingsData = {
      homepage_auto_genres: data.homepage_auto_genres,
      homepage_cache_interval: data.homepage_cache_interval
    };

    startTransition(async () => {
      await updateHomepageSettings(settingsData);
      setSettings(settingsData);
      toast.success('Automation settings saved');
    });
  };

  const handleRefreshCache = () => {
    startTransition(async () => {
      const res = await refreshHomepageCache();
      if (res.success) {
        toast.success(`Cache refreshed at ${new Date(res.timestamp).toLocaleTimeString()}`);
      }
    });
  };

  // Manual Series Picker Logic
  const handleSearch = async (e: any) => {
    e.preventDefault();
    const results = await searchSeries(searchQuery);
    setSearchResults(results);
  };

  const handleAddManual = (sectionType: string, series: any) => {
    const current = manualData[sectionType] || [];
    if (current.find(s => s.id === series.id)) return toast.error('Already added');
    
    const newItems = [...current, series];
    setManualData(prev => ({ ...prev, [sectionType]: newItems }));
    
    const sec = sections.find((s: any) => s.type === sectionType);
    if (sec) {
      handleSectionUpdate(sec.id, { manualSeriesId: newItems.map(i => i.id) });
    }
  };

  const handleRemoveManual = (sectionType: string, seriesId: string) => {
    const current = manualData[sectionType] || [];
    const newItems = current.filter(s => s.id !== seriesId);
    setManualData(prev => ({ ...prev, [sectionType]: newItems }));
    
    const sec = sections.find((s: any) => s.type === sectionType);
    if (sec) {
      handleSectionUpdate(sec.id, { manualSeriesId: newItems.map(i => i.id) });
    }
  };

  const handleReorderManual = (sectionType: string, newItems: any[]) => {
    setManualData(prev => ({ ...prev, [sectionType]: newItems }));
    const sec = sections.find((s: any) => s.type === sectionType);
    if (sec) {
      handleSectionUpdate(sec.id, { manualSeriesId: newItems.map(i => i.id) });
    }
  };

  const activeSection = sections.find((s: any) => s.id === activeSectionId);

  const renderLivePreview = (sec: any) => {
    const data = manualData[sec.type] || [];
    
    if (sec.type === 'HERO_BANNER') {
      const slides = data.map((b: any) => ({
        id: b.id,
        title: b.title || 'Untitled',
        slug: '#',
        coverImage: b.desktopImage,
        bannerImage: b.desktopImage,
        description: b.buttonText || '',
        genres: [],
        averageRating: 0,
        chapterCount: 0,
        totalViews: 0,
        status: 'ONGOING'
      }));
      return slides.length > 0 ? (
        <div className="scale-[0.8] origin-top-left w-[125%] -mb-16 pointer-events-none">
          <HeroSlider slides={slides} />
        </div>
      ) : <p className="text-sm text-text-muted">No banners active.</p>;
    }

    if (sec.type === 'TRENDING') {
      const mapped = data.map(toSeriesCardData);
      return (
        <div className="pointer-events-none p-4">
          <TrendingCarousel series={mapped} />
        </div>
      );
    }

    if (sec.type === 'RECENTLY_UPDATED') {
      const mapped = data.map((ch: any) => ({
        series: toSeriesCardData(ch.series),
        chapterNumber: ch.number,
        publishedAt: ch.publishedAt || new Date().toISOString()
      }));
      return (
        <div className="pointer-events-none p-4">
          <RecentlyUpdatedCarousel updates={mapped} />
        </div>
      );
    }

    if (sec.type === 'CONTINUE_READING') {
      const mapped = data.map((h: any) => ({
        series: toSeriesCardData(h.series),
        chapterNumber: h.chapter?.number || h.pageNumber || 1,
        progress: 50
      }));
      return (
        <div className="pointer-events-none p-4">
          <ContinueReadingCarousel items={mapped} />
        </div>
      );
    }

    // Default for FEATURED, RECOMMENDED
    const mapped = data.map(toSeriesCardData);
    return (
      <div className="pointer-events-none p-4">
        <Carousel title={sec.title || sec.type} subtitle={sec.subtitle || ''} href={sec.showViewAll ? '#' : undefined}>
          {mapped.map((s: any, i: number) => (
            <SeriesCard key={s.id} series={s} index={i} />
          ))}
        </Carousel>
      </div>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left Sidebar: Section Reordering */}
      <aside className="w-full xl:w-1/3 flex-shrink-0 flex flex-col gap-6">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-1">Homepage Structure</h2>
          <p className="text-xs text-text-muted mb-4">Drag to reorder sections on the homepage.</p>
          
          <SortableList
            items={sections}
            onReorder={handleReorderSections}
            renderItem={(sec) => {
              const isActive = activeSectionId === sec.id;
              return (
                <div 
                  className={`flex items-center justify-between w-full pr-2 p-2 -ml-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface'}`}
                  onClick={() => setActiveSectionId(sec.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{sec.title || sec.type.replace('_', ' ')}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSectionUpdate(sec.id, { isActive: !sec.isActive });
                    }}
                    className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${sec.isActive ? 'bg-success/20 text-success' : 'bg-surface-hover text-text-muted'}`}
                  >
                    {sec.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {sec.isActive ? 'On' : 'Off'}
                  </button>
                </div>
              );
            }}
          />
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Global Automation</h2>
          <form onSubmit={handleSettingsSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1 block">Cache Refresh Interval (seconds)</label>
              <input name="homepage_cache_interval" type="number" defaultValue={settings.homepage_cache_interval || '3600'} className="bg-surface border border-input rounded p-2 text-sm w-full" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
                Save
              </button>
              <button type="button" onClick={handleRefreshCache} disabled={isPending} className="flex-1 bg-surface-hover text-text-primary border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-border">
                Refresh Cache
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Right Content: Section Editor */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col min-h-[700px]">
        {activeSection ? (
          <div className="h-full flex flex-col">
            {/* Header config */}
            <div className="p-6 border-b border-border bg-surface/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black">{activeSection.type.replace('_', ' ')} Configuration</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSection.type !== 'HERO_BANNER' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Display Title</label>
                      <input 
                        defaultValue={activeSection.title || ''}
                        onBlur={(e) => handleSectionUpdate(activeSection.id, { title: e.target.value })}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                        placeholder="e.g. 🔥 Trending"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Subtitle</label>
                      <input 
                        defaultValue={activeSection.subtitle || ''}
                        onBlur={(e) => handleSectionUpdate(activeSection.id, { subtitle: e.target.value })}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                  </>
                )}
                
                <div className="flex gap-4 col-span-1 md:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Maximum Items</label>
                    <select
                      value={activeSection.limit}
                      onChange={(e) => handleSectionUpdate(activeSection.id, { limit: parseInt(e.target.value) })}
                      className="bg-background border border-input rounded-md px-3 py-2 text-sm min-w-[100px]"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                    </select>
                  </div>
                  {activeSection.type !== 'HERO_BANNER' && (
                    <div className="flex items-center gap-2 pt-5">
                      <input 
                        type="checkbox" 
                        id="showViewAll"
                        checked={activeSection.showViewAll} 
                        onChange={(e) => handleSectionUpdate(activeSection.id, { showViewAll: e.target.checked })}
                      />
                      <label htmlFor="showViewAll" className="text-sm">Show &quot;View All&quot; Link</label>
                    </div>
                  )}
                  {['TRENDING', 'RECOMMENDED', 'FEATURED'].includes(activeSection.type) && (
                    <div className="flex items-center gap-2 pt-5 ml-4">
                      <input 
                        type="checkbox" 
                        id="isManual"
                        checked={activeSection.isManual} 
                        onChange={(e) => handleSectionUpdate(activeSection.id, { isManual: e.target.checked })}
                      />
                      <label htmlFor="isManual" className="text-sm font-semibold text-warning">Manual Curation Mode</label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual curation tool if active */}
            {activeSection.isManual && activeSection.type !== 'HERO_BANNER' && (
              <div className="p-6 border-b border-border">
                <h3 className="text-sm font-bold mb-3">Manual Series Selection</h3>
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search series by title..."
                    className="flex-1 bg-surface border border-input rounded-lg px-4 py-2 text-sm"
                  />
                  <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Search</button>
                </form>
                {searchResults.length > 0 && (
                  <div className="mb-4 space-y-1 max-h-32 overflow-y-auto bg-surface p-2 rounded-lg border border-border">
                    {searchResults.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-1.5 rounded hover:bg-background">
                        <span className="text-xs font-medium">{s.title}</span>
                        <button onClick={() => handleAddManual(activeSection.type, s)} className="text-primary hover:bg-primary/10 p-1 rounded"><Plus width={14} height={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-surface p-3 rounded-lg border border-border">
                  <h4 className="text-xs font-semibold mb-2 text-text-muted">Currently Selected (Drag to Reorder)</h4>
                  <SortableList
                    items={manualData[activeSection.type] || []}
                    onReorder={(newItems) => handleReorderManual(activeSection.type, newItems)}
                    renderItem={(series) => (
                      <div className="flex items-center justify-between w-full pr-2 py-1">
                        <div className="flex items-center gap-3">
                          <img src={series.coverImage} className="w-8 h-12 object-cover rounded" alt="cover"/>
                          <span className="text-sm font-medium">{series.title}</span>
                        </div>
                        <button onClick={() => handleRemoveManual(activeSection.type, series.id)} className="text-error hover:bg-error/10 p-1.5 rounded">
                          <Trash2 width={14} height={14} />
                        </button>
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Banners Manager */}
            {activeSection.type === 'HERO_BANNER' && (
              <div className="p-6 border-b border-border bg-surface">
                <h3 className="font-semibold mb-4 text-sm">Manage Banners</h3>
                <SortableList
                  items={banners}
                  onReorder={handleReorderBanners}
                  renderItem={(banner) => (
                    <div className="flex items-center justify-between w-full pr-2 py-1">
                      <div className="flex items-center gap-4">
                        <img src={banner.desktopImage} className="w-20 h-10 object-cover rounded-md border border-border" alt="banner" />
                        <div>
                          <h4 className="font-semibold text-xs">{banner.title || 'Untitled'}</h4>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteBanner(banner.id)} className="text-error hover:bg-error/10 p-1.5 rounded">
                        <Trash2 width={14} height={14} />
                      </button>
                    </div>
                  )}
                />
                <form onSubmit={handleBannerSave} className="mt-4 grid grid-cols-2 gap-3 p-4 bg-background rounded-xl border border-border">
                  <div className="col-span-2">
                    <input required name="desktopImage" placeholder="Image URL (e.g. from Vercel Blob)" className="w-full bg-surface border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <input name="title" placeholder="Title (Optional)" className="bg-surface border border-input rounded-md px-3 py-2 text-sm" />
                  <input name="buttonText" placeholder="Synopsis (Optional)" className="bg-surface border border-input rounded-md px-3 py-2 text-sm" />
                  <div className="col-span-2">
                    <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold">Add New Banner</button>
                  </div>
                </form>
              </div>
            )}

            {/* Live Preview Pane */}
            <div className="flex-1 bg-background relative overflow-hidden flex flex-col">
              <div className="absolute top-2 left-2 z-10 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow">Live Preview</div>
              <div className="flex-1 overflow-y-auto no-scrollbar pt-10">
                {renderLivePreview(activeSection)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <Settings className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">No Section Selected</h3>
            <p className="text-sm max-w-sm mt-2">Click on a homepage section from the left sidebar to configure its settings and view a live preview.</p>
          </div>
        )}
      </div>
    </div>
  );
}
