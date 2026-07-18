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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Google AdSense ID</label>
                  <input
                    name="adsenseId"
                    defaultValue={initialSettings.adsenseId || ''}
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Monetag Code</label>
                  <textarea
                    name="monetagCode"
                    defaultValue={initialSettings.monetagCode || ''}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Adsterra Code</label>
                  <textarea
                    name="adsterraCode"
                    defaultValue={initialSettings.adsterraCode || ''}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">PropellerAds Code</label>
                  <textarea
                    name="propellerAdsCode"
                    defaultValue={initialSettings.propellerAdsCode || ''}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* SEO TAB */}
            {activeTab === 'seo' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Default Meta Title</label>
                  <input
                    name="metaTitle"
                    defaultValue={initialSettings.metaTitle || 'REDBEARD - Read Manhwa Online'}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Default Meta Description</label>
                  <textarea
                    name="metaDescription"
                    defaultValue={initialSettings.metaDescription || 'Read the best high quality manhwa, manga, and webtoons.'}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">OpenGraph Image URL</label>
                  <input
                    name="ogImageUrl"
                    defaultValue={initialSettings.ogImageUrl || ''}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Robots.txt Content</label>
                  <textarea
                    name="robotsTxt"
                    defaultValue={initialSettings.robotsTxt || 'User-agent: *\nAllow: /'}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
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
