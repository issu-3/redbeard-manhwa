'use client';

import React, { useState } from 'react';
import { MediaManager } from '@/components/admin/MediaManager';
import { Sparkles, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { getContentTypeLabel } from '@/lib/content-types';

export interface SeoData {
  title?: string;
  description?: string;
  focusKeyword?: string;
  keywords?: string;
  canonicalUrl?: string;
  canonical?: string;
  robots?: string;
  ogImage?: string;
  twitterImage?: string;
}

interface SeoFormFieldsProps {
  defaultValues?: SeoData;
  isDuplicateTitle?: boolean;
  isDuplicateDescription?: boolean;
}

export function SeoFormFields({ 
  defaultValues = {}, 
  isDuplicateTitle = false, 
  isDuplicateDescription = false 
}: SeoFormFieldsProps) {
  const [title, setTitle] = useState(defaultValues.title || '');
  const [focusKeyword, setFocusKeyword] = useState(defaultValues.focusKeyword || '');
  const [description, setDescription] = useState(defaultValues.description || '');
  const [keywords, setKeywords] = useState(defaultValues.keywords || '');
  const [canonicalUrl, setCanonicalUrl] = useState(defaultValues.canonicalUrl || defaultValues.canonical || '');
  const [robots, setRobots] = useState(defaultValues.robots || 'index, follow');

  const handleAutoFill = () => {
    const form = document.querySelector('form');
    const seriesTitle = (form?.querySelector('[name="title"]') as HTMLInputElement)?.value || '';
    const seriesDesc = (form?.querySelector('[name="description"]') as HTMLTextAreaElement)?.value || '';
    const seriesSyn = (form?.querySelector('[name="synopsis"]') as HTMLTextAreaElement)?.value || '';
    const seriesType = (form?.querySelector('[name="type"]') as HTMLSelectElement)?.value || '';
    const typeLabel = getContentTypeLabel(seriesType);
    
    if (!title && seriesTitle) {
      setTitle(`${seriesTitle} ${typeLabel} - Download | REDBEARD`);
    }
    if (!focusKeyword && seriesTitle) {
      setFocusKeyword(`${seriesTitle} ${typeLabel}`);
    }
    if (!description) {
      const text = seriesSyn || seriesDesc || `Download ${seriesTitle || 'this series'} ${typeLabel} with the latest available chapters. View series information, genres, status and available downloads on REDBEARD.`;
      const clean = text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
      setDescription(clean.length > 160 ? `${clean.substring(0, 157)}...` : clean);
    }
    if (!keywords && seriesTitle) {
      setKeywords(`${seriesTitle}, ${typeLabel}, Download`);
    }
    if (!canonicalUrl && seriesTitle) {
      const slug = seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setCanonicalUrl(`https://redbeard-manhwa.vercel.app/series/${slug}`);
    }
  };

  // Calculate live SEO validation warnings
  const isTitleTooLong = title.length > 60;
  const isDescTooLong = description.length > 160;
  const isMissingFocusKw = !focusKeyword.trim();
  const isMissingCanonical = !canonicalUrl.trim();
  const isInvalidCanonical = canonicalUrl.trim() !== '' && !canonicalUrl.trim().startsWith('http');

  // Estimate SEO Score
  let score = 0;
  if (title.trim()) { score += 20; if (isTitleTooLong) score -= 5; }
  if (description.trim()) { score += 20; if (isDescTooLong) score -= 5; }
  if (focusKeyword.trim()) score += 15;
  if (keywords.trim()) score += 10;
  if (canonicalUrl.trim() && !isInvalidCanonical) score += 15;
  if (defaultValues.ogImage || defaultValues.twitterImage || true) score += 20; // Media images default check
  score = Math.max(0, Math.min(100, score));

  return (
    <div className="space-y-6 bg-surface p-6 rounded-2xl border border-border mt-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-text-primary">SEO & Metadata Configuration</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              score >= 80 ? 'bg-success/10 text-success' : score >= 50 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
            }`}>
              Score: {score}/100
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">Customize search engine visibility and social sharing cards.</p>
        </div>

        <button
          type="button"
          onClick={handleAutoFill}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors border border-primary/20 shrink-0"
          title="Auto-fill any empty fields using Title and Synopsis"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto-fill Empty Fields
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-primary">SEO Title</label>
            <span className={`text-xs font-mono ${isTitleTooLong ? 'text-danger font-bold' : 'text-text-muted'}`}>
              {title.length}/60 chars
            </span>
          </div>
          <input 
            name="seoTitle" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to Series Title Type - Download | REDBEARD..."
            className={`w-full rounded-xl border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
              isTitleTooLong || isDuplicateTitle ? 'border-danger focus:ring-danger/20' : 'border-border focus:ring-primary/20'
            }`} 
          />
          {isTitleTooLong && (
            <div className="text-xs text-danger flex items-center gap-1 font-medium mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Warning: SEO Title exceeds 60 characters. Search engines may truncate it.
            </div>
          )}
          {isDuplicateTitle && (
            <div className="text-xs text-danger flex items-center gap-1 font-medium mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Warning: Duplicate SEO Title detected. Each page should have a unique title.
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">Focus Keyword</label>
          <input 
            name="seoFocusKeyword" 
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            placeholder="e.g. Solo Leveling Comic"
            className={`w-full rounded-xl border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
              isMissingFocusKw ? 'border-warning focus:ring-warning/20' : 'border-border focus:ring-primary/20'
            }`} 
          />
          {isMissingFocusKw && (
            <div className="text-xs text-warning flex items-center gap-1 font-medium mt-1">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Recommendation: Add a focus keyword to target specific search queries.
            </div>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-primary">SEO Description</label>
            <span className={`text-xs font-mono ${isDescTooLong ? 'text-danger font-bold' : 'text-text-muted'}`}>
              {description.length}/160 chars
            </span>
          </div>
          <textarea 
            name="seoDescription" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Defaults to short Synopsis..."
            className={`w-full rounded-xl border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
              isDescTooLong || isDuplicateDescription ? 'border-danger focus:ring-danger/20' : 'border-border focus:ring-primary/20'
            }`} 
          />
          {isDescTooLong && (
            <div className="text-xs text-danger flex items-center gap-1 font-medium mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Warning: Description exceeds 160 characters. It will be truncated in search snippets.
            </div>
          )}
          {isDuplicateDescription && (
            <div className="text-xs text-danger flex items-center gap-1 font-medium mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Warning: Duplicate Meta Description detected.
            </div>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-text-primary">Keywords (comma separated)</label>
          <input 
            name="seoKeywords" 
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="comic, webtoon, action, download"
            className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">Canonical URL</label>
          <input 
            name="seoCanonicalUrl" 
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://redbeard-manhwa.vercel.app/series/my-series"
            className={`w-full rounded-xl border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
              isMissingCanonical || isInvalidCanonical ? 'border-warning focus:ring-warning/20' : 'border-border focus:ring-primary/20'
            }`} 
          />
          {isMissingCanonical && (
            <div className="text-xs text-warning flex items-center gap-1 font-medium mt-1">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Warning: Empty canonical URL. System will auto-generate one on save.
            </div>
          )}
          {isInvalidCanonical && (
            <div className="text-xs text-danger flex items-center gap-1 font-medium mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Warning: Invalid URL format. Must start with http:// or https://
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">Robots Meta Tag</label>
          <select 
            name="seoRobots" 
            value={robots}
            onChange={(e) => setRobots(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="index, follow">Index, Follow (Default)</option>
            <option value="noindex, follow">Noindex, Follow</option>
            <option value="index, nofollow">Index, Nofollow</option>
            <option value="noindex, nofollow">Noindex, Nofollow</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-2 border-t border-border pt-6 mt-2">
          <h4 className="font-semibold text-text-primary flex items-center gap-2">
            Social Media Cards (Open Graph & Twitter)
          </h4>
          <p className="text-xs text-text-secondary">
            If left empty, images automatically fallback to Banner Image or Cover Image in order of priority.
          </p>
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
