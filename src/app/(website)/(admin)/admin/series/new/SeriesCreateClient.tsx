'use client';

import React, { useState } from 'react';
import { CompactMediaUpload } from '@/components/admin/CompactMediaUpload';
import { MultiSelectField } from '@/components/admin/MultiSelectField';
import { createSeries } from '@/app/actions/admin/series';
import Link from 'next/link';
import { Star, Sparkles, AlertTriangle } from 'lucide-react';
import { getContentTypeLabel } from '@/lib/content-types';

interface SeriesCreateClientProps {
  genres: any[];
  tags: any[];
}

export default function SeriesCreateClient({ genres, tags }: SeriesCreateClientProps) {
  // 01 BASIC
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('ONGOING');
  const [type, setType] = useState('MANHWA');
  const [releaseYear, setReleaseYear] = useState('');

  // 02 MEDIA
  const [coverImage, setCoverImage] = useState('');

  // 03 CLASSIFICATION
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // 04 SERIES INFO
  const [isNSFW, setIsNSFW] = useState(false);

  // 05 SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  const currentYear = new Date().getFullYear();
  
  // Validation for submit
  const isTitleValid = title.trim().length > 0;
  const isDescValid = description.trim().length >= 10;
  const isCoverValid = coverImage.trim().length > 0;
  const isGenresValid = selectedGenres.length > 0;
  const isFormValid = isTitleValid && isDescValid && isCoverValid && isGenresValid;

  // SEO
  const isTitleTooLong = seoTitle.length > 60;
  const isDescTooLong = seoDescription.length > 160;
  const isInvalidCanonical = canonicalUrl.trim() !== '' && !canonicalUrl.trim().startsWith('http');

  let score = 0;
  if (seoTitle.trim()) { score += 20; if (isTitleTooLong) score -= 5; }
  if (seoDescription.trim()) { score += 20; if (isDescTooLong) score -= 5; }
  if (focusKeyword.trim()) score += 15;
  if (keywords.trim()) score += 10;
  if (canonicalUrl.trim() && !isInvalidCanonical) score += 15;
  score += 20; // Default images
  score = Math.max(0, Math.min(100, score));

  const scoreColor = score >= 70 ? 'bg-green-500/10 text-green-500 border-green-500/20' : score >= 40 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-[#F20D3A]/10 text-[#F20D3A] border-[#F20D3A]/20';

  const handleAutoFill = () => {
    const typeLabel = getContentTypeLabel(type);
    if (!seoTitle && title) setSeoTitle(`${title} ${typeLabel} - Download | REDBEARD`);
    if (!focusKeyword && title) setFocusKeyword(`${title} ${typeLabel}`);
    if (!seoDescription && description) {
      const clean = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
      setSeoDescription(clean.length > 160 ? `${clean.substring(0, 157)}...` : clean);
    }
    if (!keywords && title) setKeywords(`${title}, ${typeLabel}, Download`);
    if (!canonicalUrl && title) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setCanonicalUrl(`https://redbeard-manhwa.vercel.app/series/${slug}`);
    }
  };

  const SectionHeader = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#F20D3A]/10 text-[#F20D3A] font-bold text-xs shrink-0 border border-[#F20D3A]/20">
        {num}
      </div>
      <div>
        <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
        <p className="text-[11px] text-text-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="relative pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-2xl mx-auto space-y-6">
      <div className="px-1">
        <h1 className="text-2xl font-black tracking-tight text-white">Add New Series</h1>
        <p className="text-sm text-text-secondary mt-1">Create a new series entry for your library.</p>
      </div>

      <form action={createSeries} className="space-y-6">
        
        {/* 01 BASIC INFO */}
        <section className="bg-[#171A22] rounded-[16px] border border-[#2A2E39] shadow-sm p-5">
          <SectionHeader num="01" title="Basic Information" desc="Essential details about the series." />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Title *</label>
              <input name="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all" placeholder="e.g. Solo Leveling" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Status *</label>
                <select name="status" value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all">
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="HIATUS">Hiatus</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Type *</label>
                <select name="type" value={type} onChange={e => setType(e.target.value)} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all">
                  <option value="MANHWA">Manhwa</option>
                  <option value="MANGA">Manga</option>
                  <option value="PORNHWA">Pornhwa</option>
                  <option value="WEBTOON">Webtoon</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Release Year</label>
              <input name="releaseYear" type="number" min="1900" max={currentYear} value={releaseYear} onChange={e => setReleaseYear(e.target.value)} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all" placeholder="e.g. 2024" />
            </div>
          </div>
        </section>

        {/* 02 MEDIA */}
        <section className="bg-[#171A22] rounded-[16px] border border-[#2A2E39] shadow-sm p-5">
          <SectionHeader num="02" title="Media" desc="Upload artwork for the series." />
          <div className="space-y-6">
            <CompactMediaUpload name="coverImage" label="Cover Image *" recommendedDimensions="600x900" isCover={true} onChange={setCoverImage} />
            <CompactMediaUpload name="bannerImage" label="Banner Image" recommendedDimensions="1920x600" />
          </div>
        </section>

        {/* 03 CLASSIFICATION */}
        <section className="bg-[#171A22] rounded-[16px] border border-[#2A2E39] shadow-sm p-5">
          <SectionHeader num="03" title="Classification" desc="Categorize the series." />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Genres *</label>
              <MultiSelectField name="genres" placeholder="Search genres..." options={genres} onChange={setSelectedGenres} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Tags</label>
              <MultiSelectField name="tags" placeholder="Search tags..." options={tags} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Description *</label>
              <textarea name="description" value={description} onChange={e => setDescription(e.target.value)} required minLength={10} rows={4} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-4 py-3 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all" placeholder="Enter series description..." />
            </div>
            <div className="space-y-1.5 hidden">
              <textarea name="synopsis" value={description.substring(0, 150)} readOnly />
            </div>
          </div>
        </section>

        {/* 04 SERIES INFORMATION */}
        <section className="bg-[#171A22] rounded-[16px] border border-[#2A2E39] shadow-sm p-5">
          <SectionHeader num="04" title="Series Information" desc="Technical reading details." />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Reading Direction *</label>
              <select name="readingDirection" className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all">
                <option value="VERTICAL">Vertical</option>
                <option value="LTR">Left to Right</option>
                <option value="RTL">Right to Left</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Alternative Names</label>
              <textarea name="alternativeNames" rows={2} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-4 py-2 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all font-mono" placeholder="One per line" />
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1D212B] border border-[#2A2E39]">
              <input type="hidden" name="isNSFW" value={isNSFW ? 'true' : 'false'} />
              <button type="button" onClick={() => setIsNSFW(!isNSFW)} className={`mt-0.5 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isNSFW ? 'bg-[#F20D3A]' : 'bg-[#2A2E39] border border-[#343A46]'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isNSFW ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div>
                <label className="text-sm font-semibold text-white cursor-pointer select-none" onClick={() => setIsNSFW(!isNSFW)}>NSFW Content (18+)</label>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">Mark this series as containing mature or explicit content.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 05 SEO & METADATA */}
        <section className="bg-[#171A22] rounded-[16px] border border-[#2A2E39] shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <SectionHeader num="05" title="SEO & Metadata" desc="Optimize search visibility and social sharing." />
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border ${scoreColor} -mt-5`}>
              SCORE: {score}/100
            </span>
          </div>

          <button type="button" onClick={handleAutoFill} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F20D3A]/10 text-[#F20D3A] font-bold text-xs border border-[#F20D3A]/20 hover:bg-[#F20D3A]/20 transition-colors">
            <Sparkles className="w-4 h-4" /> Auto-fill with AI
          </button>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">SEO Title</label>
              <input name="seoTitle" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} className={`w-full rounded-xl border bg-[#1D212B] text-white px-4 py-2.5 text-sm focus:ring-1 outline-none transition-all ${isTitleTooLong ? 'border-danger focus:ring-danger focus:border-danger' : 'border-[#2A2E39] focus:ring-[#F20D3A] focus:border-[#F20D3A]'}`} />
              {isTitleTooLong && <p className="text-[10px] text-danger font-medium">Warning: Exceeds 60 characters.</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Focus Keyword</label>
              <input name="seoFocusKeyword" value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">SEO Description</label>
              <textarea name="seoDescription" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} rows={3} className={`w-full rounded-xl border bg-[#1D212B] text-white px-4 py-3 text-sm focus:ring-1 outline-none transition-all ${isDescTooLong ? 'border-danger focus:ring-danger focus:border-danger' : 'border-[#2A2E39] focus:ring-[#F20D3A] focus:border-[#F20D3A]'}`} />
              {isDescTooLong && <p className="text-[10px] text-danger font-medium">Warning: Exceeds 160 characters.</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Keywords</label>
              <input name="seoKeywords" value={keywords} onChange={e => setKeywords(e.target.value)} className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Canonical URL</label>
              <input name="seoCanonicalUrl" value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} className={`w-full rounded-xl border bg-[#1D212B] text-white px-4 py-2.5 text-sm focus:ring-1 outline-none transition-all ${isInvalidCanonical ? 'border-danger focus:ring-danger focus:border-danger' : 'border-[#2A2E39] focus:ring-[#F20D3A] focus:border-[#F20D3A]'}`} />
              {isInvalidCanonical && <p className="text-[10px] text-danger font-medium">Warning: Invalid URL format.</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Robots Meta Tag</label>
              <select name="seoRobots" className="w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] text-white px-3 py-2.5 text-sm focus:ring-1 focus:ring-[#F20D3A] focus:border-[#F20D3A] outline-none transition-all">
                <option value="index, follow">Index, Follow</option>
                <option value="noindex, follow">Noindex, Follow</option>
              </select>
            </div>
          </div>
        </section>

        {/* SOCIAL MEDIA CARDS */}
        <section className="bg-[#171A22] rounded-[16px] border border-[#2A2E39] shadow-sm p-5 space-y-5">
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">Social Media Images</h2>
            <p className="text-[11px] text-text-muted mt-0.5">Open Graph & Twitter images.</p>
          </div>
          <div className="space-y-6">
            <CompactMediaUpload name="seoOgImage" label="Open Graph Image" recommendedDimensions="1200x630" />
            <CompactMediaUpload name="seoTwitterImage" label="Twitter Card Image" recommendedDimensions="1200x600" />
          </div>
        </section>

        {/* LIVE FRONTEND PREVIEW */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest px-1">Frontend Preview</h2>
          <div className="rounded-[16px] border border-[#2A2E39] bg-[#171A22] p-4 flex gap-4 overflow-hidden relative shadow-sm">
            <div className="relative w-[72px] h-[100px] shrink-0 bg-[#0B0D12] rounded-lg border border-[#2A2E39] overflow-hidden">
              {coverImage ? (
                 <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-[10px] text-text-muted font-bold tracking-widest">COVER</div>
              )}
            </div>
            <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
              <h3 className="font-bold text-white text-base leading-tight truncate">{title || 'Series Title'}</h3>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold uppercase tracking-wider">
                <span className={status === 'ONGOING' ? 'text-green-400' : status === 'COMPLETED' ? 'text-blue-400' : 'text-amber-400'}>{status}</span>
                <span className="text-[#343A46]">•</span>
                <span className="text-text-muted">{getContentTypeLabel(type)}</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-white">
                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                <span className="font-bold">0.0</span>
              </div>
            </div>
          </div>
        </section>

        {/* STICKY BOTTOM ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#0B0D12]/95 backdrop-blur-xl border-t border-[#171A22] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:pl-64 transition-all">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Link href="/admin/series" className="px-5 py-3.5 text-sm font-bold text-text-secondary bg-[#1D212B] hover:bg-[#2A2E39] border border-[#2A2E39] rounded-xl text-center transition-colors">
              Cancel
            </Link>
            <div className="flex-1 relative group">
              <button 
                type="submit" 
                disabled={!isFormValid}
                className={`w-full px-4 py-3.5 text-sm font-bold text-white rounded-xl text-center transition-all ${isFormValid ? 'bg-[#F20D3A] hover:bg-[#F20D3A]/90 shadow-lg' : 'bg-[#1D212B] opacity-50 cursor-not-allowed text-text-muted border border-[#2A2E39]'}`}
              >
                {isFormValid ? 'Create Series' : 'Create Series'}
              </button>
              {!isFormValid && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#2A2E39] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3 text-[#F20D3A]" /> 
                   Required: {!isTitleValid ? 'Title' : !isCoverValid ? 'Cover Image' : !isGenresValid ? 'Genres' : 'Description'}
                </div>
              )}
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
