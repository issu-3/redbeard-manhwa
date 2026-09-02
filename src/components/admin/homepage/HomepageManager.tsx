'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Settings, Plus, Trash2, Eye, EyeOff, Layout } from 'lucide-react';
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
import { PopularCarousel } from '@/components/home/PopularCarousel';
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
  const [editingBanner, setEditingBanner] = useState<any>(null);
  
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
    
    if (editingBanner) {
      data.id = editingBanner.id;
    }
    
    e.currentTarget.reset();
    setEditingBanner(null);
    
    startTransition(async () => {
      await upsertBanner(data);
      toast.success('Banner saved! Please refresh to see changes locally.');
    });
  };

  const handleDeleteBanner = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
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
      const slides = data.map((b: any) => {
        let slug = b.buttonUrl?.trim() || null;
        if (slug) {
          if (slug.startsWith('/series/')) slug = slug.replace('/series/', '');
          if (slug.startsWith('/')) slug = slug.substring(1);
        }
        return {
          id: b.id,
          title: b.title || 'Untitled',
          slug: slug,
          coverImage: b.desktopImage,
          bannerImage: b.desktopImage,
          description: b.buttonText || '',
        genres: [],
        averageRating: 0,
        chapterCount: 0,
        totalViews: 0,
        status: 'ONGOING'
        };
      });
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

    if (sec.type === 'POPULAR') {
      const mapped = data.map(toSeriesCardData);
      return (
        <div className="pointer-events-none p-4">
          <PopularCarousel series={mapped} />
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
      <aside className="w-full xl:w-[380px] flex-shrink-0 flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto no-scrollbar">
        {/* Homepage Structure Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight leading-tight text-text-primary">
              Homepage Structure
            </h2>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              Drag to reorder sections on the homepage.
            </p>
          </div>
          
          <SortableList
            items={sections}
            onReorder={handleReorderSections}
            renderItem={(sec) => {
              const isActive = activeSectionId === sec.id;
              return (
                <div 
                  className={`
                    homepage-section-item
                    flex items-center justify-between w-full rounded-lg cursor-pointer
                    min-h-[48px] px-3 py-2.5
                    transition-all duration-200 ease-out
                    ${isActive 
                      ? 'bg-primary/10 border-l-[3px] border-l-primary border border-primary/20 pl-[calc(0.75rem-3px)]' 
                      : 'hover:bg-surface border-l-[3px] border-l-transparent'
                    }
                  `}
                  onClick={() => setActiveSectionId(sec.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveSectionId(sec.id);
                    }
                  }}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`font-semibold text-sm leading-snug truncate ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                      {sec.title || sec.type.replace('_', ' ')}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSectionUpdate(sec.id, { isActive: !sec.isActive });
                    }}
                    className={`
                      homepage-toggle
                      text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5
                      min-h-[34px] min-w-[68px] justify-center
                      font-medium transition-all duration-200 ease-out
                      focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                      ${sec.isActive 
                        ? 'bg-success/15 text-success hover:bg-success/25' 
                        : 'bg-surface text-text-muted hover:bg-surface hover:text-text-secondary'
                      }
                    `}
                    aria-label={`Toggle ${sec.title || sec.type} ${sec.isActive ? 'off' : 'on'}`}
                  >
                    {sec.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {sec.isActive ? 'On' : 'Off'}
                  </button>
                </div>
              );
            }}
          />
        </div>

        {/* Global Automation Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight leading-tight text-text-primary mb-1">
            Global Automation
          </h2>
          <p className="text-sm text-text-muted mb-5 leading-relaxed">
            Configure cache and automation behavior.
          </p>
          <form onSubmit={handleSettingsSave} className="space-y-5">
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-text-secondary tracking-wide uppercase">
                Cache Refresh Interval (seconds)
              </label>
              <input 
                name="homepage_cache_interval" 
                type="number" 
                defaultValue={settings.homepage_cache_interval || '3600'} 
                className="
                  bg-surface border border-input rounded-lg p-2.5 text-sm w-full
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                " 
              />
            </div>
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={isPending} 
                className="
                  flex-1 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 ease-out
                  hover:bg-primary/90 hover:shadow-md
                  active:scale-[0.98]
                  focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                Save
              </button>
              <button 
                type="button" 
                onClick={handleRefreshCache} 
                disabled={isPending} 
                className="
                  flex-1 bg-surface text-text-primary border border-border px-4 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 ease-out
                  hover:bg-card-hover hover:border-text-muted
                  active:scale-[0.98]
                  focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                Refresh Cache
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Right Content: Section Editor */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col min-h-[700px]">
        {activeSection ? (
          <div className="h-full flex flex-col animate-[fadeIn_200ms_ease-out]">
            {/* Header config */}
            <div className="p-6 md:p-8 border-b border-border bg-surface/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight text-text-primary">
                    {activeSection.type.replace('_', ' ')} Configuration
                  </h2>
                  <p className="text-sm text-text-muted mt-1 leading-relaxed">
                    Customize how this section appears on the homepage.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeSection.type !== 'HERO_BANNER' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-text-secondary tracking-wide uppercase">
                        Display Title
                      </label>
                      <input 
                        defaultValue={activeSection.title || ''}
                        onBlur={(e) => handleSectionUpdate(activeSection.id, { title: e.target.value })}
                        className="
                          w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm
                          transition-colors duration-150
                          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        "
                        placeholder="e.g. 🔥 Trending"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-text-secondary tracking-wide uppercase">
                        Subtitle
                      </label>
                      <input 
                        defaultValue={activeSection.subtitle || ''}
                        onBlur={(e) => handleSectionUpdate(activeSection.id, { subtitle: e.target.value })}
                        className="
                          w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm
                          transition-colors duration-150
                          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        "
                      />
                    </div>
                  </>
                )}
                
                <div className="flex flex-wrap gap-5 col-span-1 md:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-text-secondary tracking-wide uppercase">
                      Maximum Items
                    </label>
                    <select
                      value={activeSection.limit}
                      onChange={(e) => handleSectionUpdate(activeSection.id, { limit: parseInt(e.target.value) })}
                      className="
                        bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm min-w-[120px]
                        transition-colors duration-150
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                      "
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                    </select>
                  </div>
                  {activeSection.type !== 'HERO_BANNER' && (
                    <div className="flex items-center gap-2.5 pt-5">
                      <input 
                        type="checkbox" 
                        id="showViewAll"
                        checked={activeSection.showViewAll} 
                        onChange={(e) => handleSectionUpdate(activeSection.id, { showViewAll: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <label htmlFor="showViewAll" className="text-sm font-medium cursor-pointer select-none">
                        Show &quot;View All&quot; Link
                      </label>
                    </div>
                  )}
                  {['TRENDING', 'RECOMMENDED', 'FEATURED'].includes(activeSection.type) && (
                    <div className="flex items-center gap-2.5 pt-5 ml-2">
                      <input 
                        type="checkbox" 
                        id="isManual"
                        checked={activeSection.isManual} 
                        onChange={(e) => handleSectionUpdate(activeSection.id, { isManual: e.target.checked })}
                        className="w-4 h-4 rounded accent-warning cursor-pointer"
                      />
                      <label htmlFor="isManual" className="text-sm font-semibold text-warning cursor-pointer select-none">
                        Manual Curation Mode
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual curation tool if active */}
            {activeSection.isManual && activeSection.type !== 'HERO_BANNER' && (
              <div className="p-6 md:p-8 border-b border-border">
                <h3 className="text-base font-bold mb-4 text-text-primary leading-tight">
                  Manual Series Selection
                </h3>
                <form onSubmit={handleSearch} className="flex gap-2.5 mb-5">
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search series by title..."
                    className="
                      flex-1 bg-surface border border-input rounded-xl px-4 py-2.5 text-sm
                      transition-colors duration-150
                      focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                    "
                  />
                  <button 
                    type="submit" 
                    className="
                      bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold
                      transition-all duration-200 ease-out
                      hover:bg-primary/90 hover:shadow-md
                      active:scale-[0.98]
                      focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                    "
                  >
                    Search
                  </button>
                </form>
                {searchResults.length > 0 && (
                  <div className="mb-5 space-y-1 max-h-36 overflow-y-auto bg-surface p-3 rounded-xl border border-border thin-scrollbar">
                    {searchResults.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-background transition-colors duration-150">
                        <span className="text-sm font-medium truncate mr-2">{s.title}</span>
                        <button 
                          onClick={() => handleAddManual(activeSection.type, s)} 
                          className="
                            text-primary hover:bg-primary/10 p-2 rounded-lg
                            min-w-[36px] min-h-[36px] flex items-center justify-center
                            transition-colors duration-150
                            focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                          "
                          aria-label={`Add ${s.title}`}
                        >
                          <Plus width={16} height={16}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-surface p-4 rounded-xl border border-border">
                  <h4 className="text-xs font-semibold mb-3 text-text-muted uppercase tracking-wide">
                    Currently Selected (Drag to Reorder)
                  </h4>
                  <SortableList
                    items={manualData[activeSection.type] || []}
                    onReorder={(newItems) => handleReorderManual(activeSection.type, newItems)}
                    renderItem={(series) => (
                      <div className="flex items-center justify-between w-full pr-2 py-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-8 h-12 flex-shrink-0">
                            <Image src={series.coverImage} fill className="object-cover rounded-md" alt="cover" sizes="32px" unoptimized />
                          </div>
                          <span className="text-sm font-medium truncate">{series.title}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveManual(activeSection.type, series.id)} 
                          className="
                            text-error hover:bg-error/10 p-2 rounded-lg
                            min-w-[36px] min-h-[36px] flex items-center justify-center
                            transition-colors duration-150 flex-shrink-0
                            focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                          "
                          aria-label={`Remove ${series.title}`}
                        >
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
              <div className="p-6 md:p-8 border-b border-border bg-surface/30">
                <h3 className="text-base font-bold mb-4 text-text-primary leading-tight">
                  Manage Banners
                </h3>
                <SortableList
                  items={banners}
                  onReorder={handleReorderBanners}
                  renderItem={(banner) => (
                    <div className="flex items-center justify-between w-full pr-2 py-1">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-20 h-10 flex-shrink-0">
                          <Image src={banner.desktopImage} fill className="object-cover rounded-lg border border-border" alt="banner" sizes="80px" unoptimized />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate">{banner.title || 'Untitled'}</h4>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => setEditingBanner(banner)} 
                          className="
                            text-text-primary hover:bg-surface p-2 rounded-lg
                            min-w-[36px] min-h-[36px] flex items-center justify-center
                            transition-colors duration-150 flex-shrink-0
                            focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                          "
                          aria-label={`Edit banner ${banner.title || 'Untitled'}`}
                        >
                          <Settings width={14} height={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBanner(banner.id)} 
                          className="
                            text-error hover:bg-error/10 p-2 rounded-lg
                            min-w-[36px] min-h-[36px] flex items-center justify-center
                            transition-colors duration-150 flex-shrink-0
                            focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                          "
                          aria-label={`Delete banner ${banner.title || 'Untitled'}`}
                        >
                          <Trash2 width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  )}
                />
                <form key={editingBanner?.id || 'new'} onSubmit={handleBannerSave} className="mt-5 grid grid-cols-2 gap-3 p-5 bg-background rounded-xl border border-border">
                  <div className="col-span-2">
                    <input 
                      required 
                      name="desktopImage" 
                      defaultValue={editingBanner?.desktopImage || ''}
                      placeholder="Image URL (e.g. from Vercel Blob)" 
                      className="
                        w-full bg-surface border border-input rounded-lg px-3.5 py-2.5 text-sm
                        transition-colors duration-150
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                      " 
                    />
                  </div>
                  <input 
                    name="title" 
                    defaultValue={editingBanner?.title || ''}
                    placeholder="Title (Optional)" 
                    className="
                      bg-surface border border-input rounded-lg px-3.5 py-2.5 text-sm
                      transition-colors duration-150
                      focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                    " 
                  />
                  <input 
                    name="buttonText" 
                    defaultValue={editingBanner?.buttonText || ''}
                    placeholder="Synopsis (Optional)" 
                    className="
                      bg-surface border border-input rounded-lg px-3.5 py-2.5 text-sm
                      transition-colors duration-150
                      focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                    " 
                  />
                  <div className="col-span-2">
                    <input 
                      required 
                      name="buttonUrl" 
                      defaultValue={editingBanner?.buttonUrl || ''}
                      placeholder="Series Slug (e.g. solo-leveling)" 
                      className="
                        w-full bg-surface border border-input rounded-lg px-3.5 py-2.5 text-sm
                        transition-colors duration-150
                        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                      " 
                    />
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <button 
                      type="submit" 
                      className="
                        flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold
                        transition-all duration-200 ease-out
                        hover:bg-primary/90 hover:shadow-md
                        active:scale-[0.98]
                        focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                      "
                    >
                      {editingBanner ? 'Save Changes' : 'Add New Banner'}
                    </button>
                    {editingBanner && (
                      <button 
                        type="button"
                        onClick={() => setEditingBanner(null)}
                        className="
                          flex-1 bg-surface text-text-primary border border-border py-2.5 rounded-xl text-sm font-semibold
                          transition-all duration-200 ease-out
                          hover:bg-card-hover hover:border-text-muted
                          active:scale-[0.98]
                          focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
                        "
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Live Preview Pane */}
            <div className="flex-1 bg-background relative overflow-hidden flex flex-col">
              <div className="absolute top-3 left-3 z-10 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow">
                Live Preview
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pt-10">
                {renderLivePreview(activeSection)}
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface flex items-center justify-center mb-6 shadow-sm border border-border-subtle">
              <Layout className="w-9 h-9 text-text-muted opacity-60" />
            </div>
            <h3 className="text-xl font-bold text-text-primary leading-tight">
              Select a Homepage Section
            </h3>
            <p className="text-sm max-w-sm mt-2.5 leading-relaxed text-text-muted">
              Choose a section from the left sidebar to edit its settings and preview.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
