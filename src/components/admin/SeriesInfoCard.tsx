'use client';

import React, { useState } from 'react';
import { BookOpen, AlertCircle, Eye } from 'lucide-react';
import { TYPE_OPTIONS, getContentTypeLabel } from '@/lib/content-types';

export interface SeriesInfoDefaultValues {
  type?: string;
  releaseYear?: number | null;
  readingDirection?: string;
  alternativeTitles?: string[] | string;
  isNSFW?: boolean;
}

interface SeriesInfoCardProps {
  defaultValues?: SeriesInfoDefaultValues;
}

export function SeriesInfoCard({ defaultValues = {} }: SeriesInfoCardProps) {
  const initialAltNames = Array.isArray(defaultValues.alternativeTitles)
    ? defaultValues.alternativeTitles.join('\n')
    : (defaultValues.alternativeTitles || '');

  const [type, setType] = useState(defaultValues.type || 'MANGA');
  const [releaseYear, setReleaseYear] = useState(defaultValues.releaseYear ? defaultValues.releaseYear.toString() : '');
  const [readingDirection, setReadingDirection] = useState(defaultValues.readingDirection || 'VERTICAL');
  const [alternativeNames, setAlternativeNames] = useState(initialAltNames);
  const [isNSFW, setIsNSFW] = useState(defaultValues.isNSFW || false);

  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(releaseYear, 10);
  const isYearInvalid = releaseYear.trim() !== '' && (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear);

  const formatPreviewDirection = (val: string) => {
    switch (val.toUpperCase()) {
      case 'VERTICAL': return 'Vertical';
      case 'LTR': return 'Left to Right';
      case 'RTL': return 'Right to Left';
      default: return 'Vertical';
    }
  };

  const previewYear = !releaseYear || releaseYear.trim() === '' || isYearInvalid ? 'N/A' : releaseYear.trim();
  const previewAltNames = !alternativeNames || alternativeNames.trim() === '' ? 'None' : alternativeNames.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).join(', ') || 'None';

  return (
    <div className="space-y-6 bg-surface p-6 rounded-2xl border border-border mt-8 shadow-sm">
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Series Information</h3>
            <p className="text-sm text-text-secondary">Technical publication details, creators, and metadata.</p>
          </div>
        </div>
      </div>

      {/* ── Public Page Live Preview Card ──────────────────── */}
      <div className="rounded-xl bg-card border border-border/80 p-4 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <Eye className="h-3.5 w-3.5" />
          Frontend Preview: Public Series Card Display
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <MetaItem label="Type" value={getContentTypeLabel(type)} />
          <MetaItem label="Release Year" value={previewYear} />
          <MetaItem label="Direction" value={formatPreviewDirection(readingDirection)} />
          <MetaItem label="Alt Names" value={previewAltNames} />
        </div>
      </div>

      {/* ── Responsive Form Grid (3-col desktop, 1-col mobile) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary flex items-center justify-between">
            <span>Type *</span>
            <span className="text-xs text-text-muted font-normal">Format category</span>
          </label>
          <select 
            name="type" 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary flex items-center justify-between">
            <span>Release Year</span>
            <span className="text-xs text-text-muted font-normal">Optional (1900–{currentYear})</span>
          </label>
          <input 
            name="releaseYear" 
            type="number"
            min={1900}
            max={currentYear}
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
            placeholder={`e.g. ${currentYear - 2}`}
            className={`w-full rounded-xl border bg-card px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
              isYearInvalid ? 'border-danger focus:ring-danger/20 text-danger' : 'border-border focus:ring-primary/20 text-text-primary'
            }`} 
          />
          {isYearInvalid && (
            <div className="text-xs text-danger flex items-center gap-1 font-medium mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Validation Error: Release Year must be between 1900 and {currentYear}.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary flex items-center justify-between">
            <span>Reading Direction *</span>
            <span className="text-xs text-text-muted font-normal">Reader orientation</span>
          </label>
          <select 
            name="readingDirection" 
            value={readingDirection} 
            onChange={(e) => setReadingDirection(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="VERTICAL">Vertical (Webtoon)</option>
            <option value="LTR">Left to Right (Comic)</option>
            <option value="RTL">Right to Left (Manga)</option>
          </select>
        </div>

        <div className="space-y-2 md:col-span-3">
          <label className="text-sm font-semibold text-text-primary flex items-center justify-between">
            <span>Alternative Names</span>
            <span className="text-xs text-text-muted font-normal">One per line or comma separated</span>
          </label>
          <textarea 
            name="alternativeNames" 
            value={alternativeNames}
            onChange={(e) => setAlternativeNames(e.target.value)}
            rows={3}
            placeholder={`Solo Leveling\nOnly I Level Up\nNa Honjaman Level-Up`}
            className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" 
          />
          <p className="text-xs text-text-muted">Used for search indexing and alternate title matching.</p>
        </div>

        <div className="space-y-2 md:col-span-3 flex items-center gap-3 pt-2">
          <input
            type="hidden"
            name="isNSFW"
            value={isNSFW ? 'true' : 'false'}
          />
          <button
            type="button"
            onClick={() => setIsNSFW(!isNSFW)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
              isNSFW ? 'bg-danger' : 'bg-surface border border-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isNSFW ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div>
            <label className="text-sm font-semibold text-text-primary cursor-pointer" onClick={() => setIsNSFW(!isNSFW)}>
              NSFW Content (18+)
            </label>
            <p className="text-xs text-text-muted">Mark this series as containing mature or explicit content. (Will be excluded from SafeSearch)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-surface/50 border border-border/40 overflow-hidden">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest truncate">
        {label}
      </span>
      <span className="text-xs font-semibold text-text-primary truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
