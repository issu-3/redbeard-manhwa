'use client';

import { useState } from 'react';
import { Settings, Home, BookOpen, MonitorPlay, Shield, Globe, Save } from 'lucide-react';
import { saveSettings } from '@/app/actions/admin/settings';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'homepage', label: 'Homepage', icon: Home },
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'ads', label: 'Advertisement', icon: MonitorPlay },
  { id: 'seo', label: 'SEO', icon: Globe },
  { id: 'social', label: 'Social Links', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
];

export function SettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const result = await saveSettings(formData);
      
      if (result.success) {
        toast.success('Settings saved successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar Tabs */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1 overflow-x-auto pb-2 md:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
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

      {/* Main Form Area */}
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="mb-6 pb-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {TABS.find((t) => t.id === activeTab)?.label} Settings
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Manage your site's {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} configuration.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div className="space-y-6">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Site Name</label>
                  <input
                    name="siteName"
                    defaultValue={initialSettings.siteName || 'REDBEARD'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Logo URL</label>
                  <input
                    name="logoUrl"
                    defaultValue={initialSettings.logoUrl || ''}
                    placeholder="/logo.png"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Favicon URL</label>
                  <input
                    name="faviconUrl"
                    defaultValue={initialSettings.faviconUrl || ''}
                    placeholder="/favicon.ico"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Default Language</label>
                  <select
                    name="defaultLanguage"
                    defaultValue={initialSettings.defaultLanguage || 'en'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Theme</label>
                  <select
                    name="defaultTheme"
                    defaultValue={initialSettings.defaultTheme || 'dark'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="system">System (OS Preference)</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            )}

            {/* HOMEPAGE TAB */}
            {activeTab === 'homepage' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Hero Banner Enabled</label>
                  <select
                    name="heroBannerEnabled"
                    defaultValue={initialSettings.heroBannerEnabled || 'true'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Trending Series Count</label>
                  <input
                    type="number"
                    name="trendingCount"
                    defaultValue={initialSettings.trendingCount || '10'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Latest Series Count</label>
                  <input
                    type="number"
                    name="latestCount"
                    defaultValue={initialSettings.latestCount || '20'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* READING TAB */}
            {activeTab === 'reading' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Default Reading Mode</label>
                  <select
                    name="defaultReadingMode"
                    defaultValue={initialSettings.defaultReadingMode || 'VERTICAL'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="VERTICAL">Vertical</option>
                    <option value="LTR">Left to Right</option>
                    <option value="RTL">Right to Left</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Lazy Loading Enabled</label>
                  <select
                    name="lazyLoadingEnabled"
                    defaultValue={initialSettings.lazyLoadingEnabled || 'true'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Comments Enabled</label>
                  <select
                    name="commentsEnabled"
                    defaultValue={initialSettings.commentsEnabled || 'true'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            )}

            {/* ADS TAB */}
            {activeTab === 'ads' && (
              <div className="space-y-8">
                {/* Global Settings */}
                <div className="bg-background/50 border border-border/50 rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary border-b border-border/50 pb-2">Global Settings</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Ad Provider Priority (Fallback Order)</label>
                    <input
                      name="ads_provider_priority"
                      defaultValue={initialSettings.ads_provider_priority || 'adsense,monetag,adsterra,propeller'}
                      placeholder="e.g. adsense,monetag,adsterra,propeller"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">Comma-separated list of providers to use for 'Auto' placement.</p>
                  </div>
                </div>

                {/* Placement Manager */}
                <div className="bg-background/50 border border-border/50 rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary border-b border-border/50 pb-2">Placement Manager</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['homepage', 'reader', 'search', 'series', 'sidebar', 'footer'].map(placement => (
                      <div key={placement}>
                        <label className="block text-sm font-medium text-text-primary mb-1 capitalize">{placement} Placement</label>
                        <select
                          name={`ads_placement_${placement}`}
                          defaultValue={initialSettings[`ads_placement_${placement}`] || 'none'}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="none">None</option>
                          <option value="auto">Auto (Priority Based)</option>
                          <option value="adsense">AdSense</option>
                          <option value="monetag">Monetag</option>
                          <option value="adsterra">Adsterra</option>
                          <option value="propeller">PropellerAds</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Network Providers */}
                <div className="bg-background/50 border border-border/50 rounded-lg p-4 space-y-6">
                  <h3 className="text-lg font-semibold text-text-primary border-b border-border/50 pb-2">Ad Networks Configuration</h3>
                  
                  {/* Google AdSense */}
                  <div className="space-y-4 pb-4 border-b border-border/20">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-text-primary text-base">Google AdSense</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="hidden" name="ads_enabled_adsense" value="false" />
                        <input type="checkbox" name="ads_enabled_adsense" value="true" defaultChecked={initialSettings.ads_enabled_adsense === 'true'} className="sr-only peer" />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Publisher ID</label>
                      <input
                        name="adsenseId"
                        defaultValue={initialSettings.adsenseId || ''}
                        placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-text-primary">Auto Ads (Global)</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="hidden" name="ads_adsense_auto_ads" value="false" />
                          <input type="checkbox" name="ads_adsense_auto_ads" value="true" defaultChecked={initialSettings.ads_adsense_auto_ads === 'true'} className="sr-only peer" />
                          <div className="w-8 h-4 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>
                      <p className="text-xs text-text-muted">Automatically place ads across the site based on Google's AI.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Manual Ad Units</label>
                      <textarea
                        name="ads_adsense_manual_unit"
                        defaultValue={initialSettings.ads_adsense_manual_unit || ''}
                        rows={2}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                        placeholder="<ins class='adsbygoogle' ...></ins>"
                      />
                      <p className="text-xs text-text-muted mt-1">Provide standard manual `ins` tag to be rendered inside specific AdSlots.</p>
                    </div>
                  </div>

                  {/* Adsterra */}
                  <div className="space-y-4 pb-4 border-b border-border/20">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-text-primary text-base">Adsterra</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="hidden" name="ads_enabled_adsterra" value="false" />
                        <input type="checkbox" name="ads_enabled_adsterra" value="true" defaultChecked={initialSettings.ads_enabled_adsterra === 'true'} className="sr-only peer" />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Native Banner Script</label>
                        <textarea
                          name="ads_adsterra_native_banner"
                          defaultValue={initialSettings.ads_adsterra_native_banner || ''}
                          rows={2}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                          placeholder="<script>...</script>"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Banner Script</label>
                        <textarea
                          name="ads_adsterra_banner"
                          defaultValue={initialSettings.ads_adsterra_banner || ''}
                          rows={2}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                          placeholder="<script>...</script>"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Popunder Script (Global)</label>
                        <textarea
                          name="ads_adsterra_popunder"
                          defaultValue={initialSettings.ads_adsterra_popunder || ''}
                          rows={2}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                          placeholder="<script>...</script>"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Social Bar Script (Global)</label>
                        <textarea
                          name="ads_adsterra_social_bar"
                          defaultValue={initialSettings.ads_adsterra_social_bar || ''}
                          rows={2}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                          placeholder="<script>...</script>"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-primary mb-1">Smartlink URL</label>
                        <input
                          name="ads_adsterra_smartlink"
                          defaultValue={initialSettings.ads_adsterra_smartlink || ''}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Monetag */}
                  <div className="space-y-4 pb-4 border-b border-border/20">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-text-primary text-base">Monetag</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="hidden" name="ads_enabled_monetag" value="false" />
                        <input type="checkbox" name="ads_enabled_monetag" value="true" defaultChecked={initialSettings.ads_enabled_monetag === 'true'} className="sr-only peer" />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Script</label>
                      <textarea
                        name="ads_monetag_script"
                        defaultValue={initialSettings.ads_monetag_script || initialSettings.monetagCode || ''}
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                        placeholder="<script>...</script>"
                      />
                    </div>
                  </div>

                  {/* PropellerAds */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-text-primary text-base">PropellerAds</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="hidden" name="ads_enabled_propeller" value="false" />
                        <input type="checkbox" name="ads_enabled_propeller" value="true" defaultChecked={initialSettings.ads_enabled_propeller === 'true'} className="sr-only peer" />
                        <div className="w-9 h-5 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Script</label>
                      <textarea
                        name="ads_propeller_script"
                        defaultValue={initialSettings.ads_propeller_script || initialSettings.propellerAdsCode || ''}
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                        placeholder="<script>...</script>"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEO TAB */}
            {activeTab === 'seo' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Site Title</label>
                  <input
                    name="seo_site_title"
                    defaultValue={initialSettings.seo_site_title || 'REDBEARD - The Ultimate Reading Experience'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Site Description</label>
                  <textarea
                    name="seo_site_description"
                    defaultValue={initialSettings.seo_site_description || 'Premium manhwa reading platform offering the best reading experience.'}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Default Keywords</label>
                  <input
                    name="seo_default_keywords"
                    defaultValue={initialSettings.seo_default_keywords || 'manhwa, manga, webtoon, read online'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Default OpenGraph Image URL</label>
                  <input
                    name="seo_og_image"
                    defaultValue={initialSettings.seo_og_image || '/images/og-default.png'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Twitter/X Handle</label>
                  <input
                    name="seo_twitter_handle"
                    defaultValue={initialSettings.seo_twitter_handle || '@redbeard'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Robots Rules</label>
                    <select
                      name="seo_robots"
                      defaultValue={initialSettings.seo_robots || 'index, follow'}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="index, follow">Index, Follow (Recommended)</option>
                      <option value="noindex, follow">No Index, Follow</option>
                      <option value="noindex, nofollow">No Index, No Follow</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Google Search Console Verification</label>
                    <input
                      name="seo_gsc_verification"
                      defaultValue={initialSettings.seo_gsc_verification || ''}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SOCIAL TAB */}
            {activeTab === 'social' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">YouTube Channel URL</label>
                  <input
                    name="youtubeUrl"
                    defaultValue={initialSettings.youtubeUrl || ''}
                    placeholder="https://www.youtube.com/@RedBeardShort"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Leave blank to hide the YouTube subscription section in the footer.
                  </p>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 mb-4">
                  <h3 className="font-semibold text-warning">Maintenance Mode</h3>
                  <p className="text-sm text-text-secondary mt-1 mb-3">Enable this to block all public access to the site. Admins will still be able to log in.</p>
                  <select
                    name="maintenanceMode"
                    defaultValue={initialSettings.maintenanceMode || 'false'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="false">Disabled (Site is Live)</option>
                    <option value="true">Enabled (Site is Offline)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">User Registration</label>
                  <select
                    name="registrationEnabled"
                    defaultValue={initialSettings.registrationEnabled || 'true'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Email Verification Required</label>
                  <select
                    name="emailVerificationRequired"
                    defaultValue={initialSettings.emailVerificationRequired || 'false'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
