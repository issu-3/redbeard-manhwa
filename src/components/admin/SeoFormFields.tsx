import React from 'react';
import { MediaManager } from '@/components/admin/MediaManager';

export interface SeoData {
  title?: string;
  description?: string;
  focusKeyword?: string;
  keywords?: string;
  canonicalUrl?: string;
  robots?: string;
  ogImage?: string;
  twitterImage?: string;
}

interface SeoFormFieldsProps {
  defaultValues?: SeoData;
}

export function SeoFormFields({ defaultValues = {} }: SeoFormFieldsProps) {
  return (
    <div className="space-y-6 bg-surface p-6 rounded-xl border border-border mt-8">
      <div>
        <h3 className="text-lg font-bold">SEO Settings</h3>
        <p className="text-sm text-text-secondary">Customize how this page appears on search engines and social media.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold">SEO Title</label>
          <input 
            name="seoTitle" 
            defaultValue={defaultValues.title || ''}
            placeholder="Defaults to Series Title..."
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold">Focus Keyword</label>
          <input 
            name="seoFocusKeyword" 
            defaultValue={defaultValues.focusKeyword || ''}
            placeholder="e.g. Action Manhwa"
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold">SEO Description</label>
          <textarea 
            name="seoDescription" 
            defaultValue={defaultValues.description || ''}
            rows={3}
            placeholder="Defaults to Synopsis..."
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold">Keywords (comma separated)</label>
          <input 
            name="seoKeywords" 
            defaultValue={defaultValues.keywords || ''}
            placeholder="manhwa, webtoon, action, read online"
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Canonical URL</label>
          <input 
            name="seoCanonicalUrl" 
            defaultValue={defaultValues.canonicalUrl || ''}
            placeholder="https://example.com/series/my-series"
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Robots Meta Tag</label>
          <select 
            name="seoRobots" 
            defaultValue={defaultValues.robots || 'index, follow'}
            className="w-full rounded-lg border border-border bg-card px-4 py-2"
          >
            <option value="index, follow">Index, Follow</option>
            <option value="noindex, follow">Noindex, Follow</option>
            <option value="index, nofollow">Index, Nofollow</option>
            <option value="noindex, nofollow">Noindex, Nofollow</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2 border-t border-border pt-6 mt-2">
          <h4 className="font-semibold mb-4">Social Media Cards</h4>
        </div>

        <div className="space-y-2">
          <MediaManager 
            name="seoOgImage" 
            label="Open Graph Image (Facebook/LinkedIn)" 
            recommendedDimensions="1200x630" 
            defaultValue={defaultValues.ogImage}
          />
        </div>

        <div className="space-y-2">
          <MediaManager 
            name="seoTwitterImage" 
            label="Twitter Card Image" 
            recommendedDimensions="1200x600" 
            defaultValue={defaultValues.twitterImage}
          />
        </div>
      </div>
    </div>
  );
}
