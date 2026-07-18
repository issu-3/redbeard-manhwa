'use client';

import { useState, useTransition } from 'react';
import { Layers, Image as ImageIcon, Settings, Star, TrendingUp, Award, Clock, Calendar, Edit3, Plus, Trash2, Search } from 'lucide-react';
import { SortableList } from './SortableList';
import { 
  upsertBanner, deleteBanner, reorderBanners, 
  updateSection, reorderSections, 
  searchSeries, updateHomepageSettings
} from '@/app/actions/admin/homepage';
import { toast } from 'sonner';

const TABS = [
  { id: 'AUTOMATION', label: 'Automation', icon: Settings },
  { id: 'banners', label: 'Hero Banner', icon: ImageIcon },
  { id: 'sections', label: 'Sections', icon: Layers },
  { id: 'FEATURED', label: 'Featured Series', icon: Star },
  { id: 'TRENDING', label: 'Trending', icon: TrendingUp },
  { id: 'POPULAR', label: 'Popular', icon: Award },
  { id: 'LATEST', label: 'Latest Updates', icon: Clock },
  { id: 'NEW_RELEASES', label: 'New Releases', icon: Calendar },
  { id: 'EDITORS_PICKS', label: 'Editor\'s Picks', icon: Edit3 },
];

export function HomepageManager({ initialBanners, initialSections, initialManualData, featuredCount, initialSettings }: any) {
  const [activeTab, setActiveTab] = useState('AUTOMATION');
  const [banners, setBanners] = useState(initialBanners);
  const [sections, setSections] = useState(initialSections);
  const [settings, setSettings] = useState(initialSettings || {});
  const [manualData, setManualData] = useState<Record<string, any[]>>(initialManualData);
  const [isPending, startTransition] = useTransition();

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
      // Full refresh handled by revalidatePath in action
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
    
    // Also save section limits and toggles if they were changed
    const autoTrending = data.autoTrending === 'true';
    const autoPopular = data.autoPopular === 'true';
    const autoLatest = data.autoLatest === 'true';
    const autoNewReleases = data.autoNewReleases === 'true';
    
    const updates = [
      { type: 'TRENDING', isManual: !autoTrending, limit: parseInt(data.limitTrending) },
      { type: 'POPULAR', isManual: !autoPopular, limit: parseInt(data.limitPopular) },
      { type: 'LATEST', isManual: !autoLatest, limit: parseInt(data.limitLatest) },
      { type: 'NEW_RELEASES', isManual: !autoNewReleases, limit: parseInt(data.limitNewReleases) }
    ];
    
    const settingsData = {
      homepage_auto_genres: data.homepage_auto_genres,
      homepage_cache_interval: data.homepage_cache_interval
    };

    startTransition(async () => {
      await updateHomepageSettings(settingsData);
      setSettings(settingsData);
      for (const update of updates) {
        const sec = sections.find((s: any) => s.type === update.type);
        if (sec) {
          await updateSection(sec.id, { isManual: update.isManual, limit: update.limit });
        }
      }
      toast.success('Automation settings saved');
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

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1 overflow-x-auto pb-2 md:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 bg-card rounded-xl border border-border p-6 shadow-sm min-h-[500px]">
        {/* ================================== */}
        {/* AUTOMATION TAB                     */}
        {/* ================================== */}
        {activeTab === 'AUTOMATION' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Automation Settings</h2>
            <p className="text-sm text-text-muted mb-6">Configure how the homepage auto-populates data.</p>
            
            <form onSubmit={handleSettingsSave} className="space-y-6 max-w-2xl">
              
              <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
                <h3 className="font-semibold text-sm mb-2">Automated Sections</h3>
                
                {[
                  { id: 'TRENDING', label: 'Auto Trending', limitName: 'limitTrending', toggleName: 'autoTrending' },
                  { id: 'POPULAR', label: 'Auto Most Popular', limitName: 'limitPopular', toggleName: 'autoPopular' },
                  { id: 'LATEST', label: 'Auto Latest Updates', limitName: 'limitLatest', toggleName: 'autoLatest' },
                  { id: 'NEW_RELEASES', label: 'Auto New Releases', limitName: 'limitNewReleases', toggleName: 'autoNewReleases' },
                ].map(item => {
                  const sec = sections.find((s: any) => s.type === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="flex items-center gap-4">
                        <label className="text-xs text-text-muted flex items-center gap-2">
                          Items:
                          <select name={item.limitName} defaultValue={sec?.limit || 10} className="bg-surface border border-input rounded p-1 text-xs">
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                          </select>
                        </label>
                        <select name={item.toggleName} defaultValue={sec ? (!sec.isManual).toString() : 'true'} className="bg-surface border border-input rounded p-1 text-xs font-semibold">
                          <option value="true">Enabled</option>
                          <option value="false">Disabled (Manual)</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
                <h3 className="font-semibold text-sm mb-2">General Automation</h3>
                
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="font-medium text-sm">Auto Genre Counts</div>
                  <select name="homepage_auto_genres" defaultValue={settings.homepage_auto_genres || 'true'} className="bg-surface border border-input rounded p-1 text-xs font-semibold">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div className="font-medium text-sm">Cache Refresh Interval</div>
                  <div className="flex items-center gap-2">
                    <input name="homepage_cache_interval" type="number" defaultValue={settings.homepage_cache_interval || '3600'} className="bg-surface border border-input rounded p-1.5 text-xs w-24 text-right" />
                    <span className="text-xs text-text-muted">seconds</span>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isPending} className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors w-full">
                {isPending ? 'Saving...' : 'Save Automation Settings'}
              </button>
            </form>
          </div>
        )}

        {/* ================================== */}
        {/* HERO BANNERS                       */}
        {/* ================================== */}
        {activeTab === 'banners' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Hero Banners</h2>
            <SortableList
              items={banners}
              onReorder={handleReorderBanners}
              renderItem={(banner) => (
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-4">
                    <img src={banner.desktopImage} className="w-24 h-12 object-cover rounded-md" alt="banner" />
                    <div>
                      <h4 className="font-semibold text-sm">{banner.title || 'Untitled'}</h4>
                      <p className="text-xs text-text-muted">{banner.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteBanner(banner.id)} className="text-error hover:bg-error/10 p-2 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-semibold mb-4">Add New Banner</h3>
              <form onSubmit={handleBannerSave} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs mb-1">Desktop Image URL *</label>
                  <input required name="desktopImage" className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Title</label>
                    <input name="title" className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Button Text</label>
                    <input name="buttonText" className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Button URL</label>
                    <input name="buttonUrl" className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Active Status</label>
                    <select name="isActive" className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm">
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={isPending} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
                  {isPending ? 'Saving...' : 'Add Banner'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================================== */}
        {/* HOMEPAGE SECTIONS                  */}
        {/* ================================== */}
        {activeTab === 'sections' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Section Ordering</h2>
            <p className="text-sm text-text-muted mb-6">Drag and drop to reorder sections on the homepage. Toggle visibility.</p>
            <SortableList
              items={sections}
              onReorder={handleReorderSections}
              renderItem={(sec) => (
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="font-semibold text-sm">{sec.type.replace('_', ' ')}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1 w-24 shrink-0">
                      <label className="text-xs text-gray-500 uppercase font-semibold">Limit</label>
                      <select
                        defaultValue={sec.limit}
                        onChange={(e) => handleSectionUpdate(sec.id, { limit: parseInt(e.target.value) })}
                        className="bg-gray-100 border-none rounded p-2 text-sm focus:ring-2 focus:ring-primary w-full"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => handleSectionUpdate(sec.id, { isActive: !sec.isActive })}
                      className={`text-xs px-3 py-1 rounded-full ${sec.isActive ? 'bg-success/20 text-success' : 'bg-surface-hover text-text-muted'}`}
                    >
                      {sec.isActive ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* ================================== */}
        {/* FEATURED SERIES TAB                */}
        {/* ================================== */}
        {activeTab === 'FEATURED' && (
          <div>
             <h2 className="text-xl font-bold mb-4">Featured Series</h2>
             <p className="text-sm text-text-muted mb-6">There are currently <strong className="text-primary">{featuredCount}</strong> featured series. To feature a series, edit it in the <a href="/admin/series" className="text-primary hover:underline">Series Management</a> page and toggle the "Is Featured" flag.</p>
          </div>
        )}

        {/* ================================== */}
        {/* CONFIGURABLE SECTIONS (TRENDING, POPULAR, LATEST, etc) */}
        {/* ================================== */}
        {['TRENDING', 'POPULAR', 'LATEST', 'NEW_RELEASES', 'EDITORS_PICKS'].includes(activeTab) && (() => {
          const sec = sections.find((s: any) => s.type === activeTab);
          if (!sec) return <div>Section not found</div>;
          
          const isAlwaysManual = activeTab === 'EDITORS_PICKS';
          const items = manualData[activeTab] || [];

          return (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{activeTab.replace('_', ' ')} Settings</h2>
                {!isAlwaysManual && (
                  <select 
                    value={sec.isManual ? 'true' : 'false'}
                    onChange={(e) => handleSectionUpdate(sec.id, { isManual: e.target.value === 'true' })}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                  >
                    <option value="false">Auto-populate</option>
                    <option value="true">Manual Selection</option>
                  </select>
                )}
              </div>

              {(sec.isManual || isAlwaysManual) ? (
                <div className="space-y-6">
                  <div className="bg-surface rounded-lg p-4 border border-border">
                    <h3 className="text-sm font-semibold mb-3">Add Series to {activeTab.replace('_', ' ')}</h3>
                    <form onSubmit={handleSearch} className="flex gap-2">
                      <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search series by title..."
                        className="flex-1 bg-background border border-input rounded-lg px-4 py-2 text-sm"
                      />
                      <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg"><Search className="h-4 w-4" /></button>
                    </form>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2">
                        {searchResults.map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-background p-2 rounded border border-border">
                            <span className="text-sm">{s.title}</span>
                            <button onClick={() => handleAddManual(activeTab, s)} className="text-primary hover:bg-primary/10 p-1 rounded"><Plus className="h-4 w-4"/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Selected Series (Drag to reorder)</h3>
                    {items.length === 0 ? (
                      <p className="text-sm text-text-muted">No series selected manually yet.</p>
                    ) : (
                      <SortableList
                        items={items}
                        onReorder={(newItems) => handleReorderManual(activeTab, newItems)}
                        renderItem={(series) => (
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-3">
                              <img src={series.coverImage} className="w-8 h-12 object-cover rounded" alt="cover"/>
                              <span className="text-sm font-medium">{series.title}</span>
                            </div>
                            <button onClick={() => handleRemoveManual(activeTab, series.id)} className="text-error hover:bg-error/10 p-1.5 rounded">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                  <p className="text-text-muted">This section is currently auto-populated by the database based on metrics.</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
