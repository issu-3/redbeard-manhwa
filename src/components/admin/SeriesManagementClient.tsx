'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  BookOpen,
  PlusCircle,
  Trash2,
  ChevronDown,
  Library,
  AlertTriangle,
  X,
} from 'lucide-react';
import { getContentTypeLabel } from '@/lib/content-types';
import { formatDate } from '@/lib/utils';

/* ── Types ──────────────────────────────────────── */

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  status: string;
  type: string;
  createdAt: string;
  _count: { chapters: number };
}

interface SeriesManagementClientProps {
  initialSeries: SeriesItem[];
  totalSeries: number;
  currentPage: number;
  totalPages: number;
  take: number;
}

type SortKey =
  | 'recent'
  | 'oldest'
  | 'title-asc'
  | 'title-desc'
  | 'chapters-most'
  | 'chapters-fewest';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'oldest', label: 'Oldest Added' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'chapters-most', label: 'Most Chapters' },
  { value: 'chapters-fewest', label: 'Fewest Chapters' },
];

const STATUS_OPTIONS = ['All', 'ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED', 'UPCOMING'] as const;

const TYPE_OPTIONS = [
  'All',
  'MANHWA',
  'MANGA',
  'MANHUA',
  'WEBTOON',
  'PORNHWA',
  'DOUJINSHI',
  'COMIC',
  'LIGHT_NOVEL',
] as const;

/* ── Delete confirmation modal ──────────────────── */

function DeleteConfirmModal({
  seriesTitle,
  onConfirm,
  onCancel,
}: {
  seriesTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Focus trap
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 id="delete-title" className="text-center text-lg font-bold text-text-primary">
          Delete Series
        </h3>
        <p id="delete-desc" className="mt-2 text-center text-sm text-text-secondary">
          Are you sure you want to delete <strong className="text-text-primary">&quot;{seriesTitle}&quot;</strong>? This
          action cannot be undone. All chapters and images will be permanently removed.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover focus-ring"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-ring"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Action Menu (desktop & mobile) ─────────────── */

function ActionMenu({
  seriesId,
  seriesTitle,
  seriesSlug,
  onDelete,
}: {
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  onDelete: (id: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const actions = [
    { label: 'View', icon: Eye, href: `/series/${seriesSlug}` },
    { label: 'Edit', icon: Edit, href: `/admin/series/${seriesId}/edit` },
    { label: 'Manage Chapters', icon: BookOpen, href: `/admin/series/${seriesId}/chapters` },
    { label: 'Add Chapter', icon: PlusCircle, href: `/admin/series/${seriesId}/chapters/new` },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors focus-ring"
        aria-label={`Actions for ${seriesTitle}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-xl"
          role="menu"
        >
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <action.icon className="h-4 w-4 flex-shrink-0" />
              {action.label}
            </Link>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete(seriesId, seriesTitle);
            }}
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Dropdown Filter ────────────────────────────── */

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  getLabel,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  getLabel?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayValue = value === 'All' ? label : (getLabel ? getLabel(value) : value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-ring whitespace-nowrap ${
          value !== 'All'
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {displayValue}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-40 mt-1 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-xl"
          role="listbox"
        >
          {options.map((opt) => {
            const optLabel = opt === 'All' ? `All ${label}` : (getLabel ? getLabel(opt) : opt);
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Status badge helper ────────────────────────── */

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ONGOING':
      return 'bg-green-500/10 text-green-400';
    case 'COMPLETED':
      return 'bg-blue-500/10 text-blue-400';
    case 'HIATUS':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'CANCELLED':
      return 'bg-red-500/10 text-red-400';
    case 'UPCOMING':
      return 'bg-purple-500/10 text-purple-400';
    default:
      return 'bg-primary/10 text-primary';
  }
}

/* ── Main Client Component ──────────────────────── */

export default function SeriesManagementClient({
  initialSeries,
  totalSeries,
  currentPage,
  totalPages,
  take,
}: SeriesManagementClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const handleDeleteRequest = useCallback((id: string, title: string) => {
    setDeleteTarget({ id, title });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    // Submit the existing server action via form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'seriesId';
    input.value = deleteTarget.id;
    form.appendChild(input);

    // Use the existing delete action by navigating
    const { deleteSeries } = await import('@/app/actions/admin/series');
    try {
      await deleteSeries(deleteTarget.id);
    } catch {
      // Server action redirects, which throws in client context
    }
    setDeleteTarget(null);
    window.location.reload();
  }, [deleteTarget]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // Client-side filter/sort over server-fetched page
  const filteredSeries = useMemo(() => {
    let result = [...initialSeries];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'All') {
      result = result.filter((s) => s.type === typeFilter);
    }

    // Sort
    switch (sortKey) {
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'chapters-most':
        result.sort((a, b) => b._count.chapters - a._count.chapters);
        break;
      case 'chapters-fewest':
        result.sort((a, b) => a._count.chapters - b._count.chapters);
        break;
    }

    return result;
  }, [initialSeries, searchQuery, statusFilter, typeFilter, sortKey]);

  const skip = (currentPage - 1) * take;
  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== 'All' || typeFilter !== 'All';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setTypeFilter('All');
    setSortKey('recent');
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-text-primary">
            Series Management
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {totalSeries} {totalSeries === 1 ? 'series' : 'series'} total
          </p>
        </div>
        <Link
          href="/admin/series/new"
          className="hidden lg:flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-ring"
        >
          <Plus className="h-4 w-4" />
          Add Series
        </Link>
      </div>

      {/* Search + Filters + Sort */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Search series by title or slug"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter row — wrapped on mobile so dropdowns aren't clipped */}
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <FilterDropdown
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
          />
          <FilterDropdown
            label="Type"
            value={typeFilter}
            options={TYPE_OPTIONS}
            onChange={setTypeFilter}
            getLabel={getContentTypeLabel}
          />
          <FilterDropdown
            label="Sort"
            value={sortKey === 'recent' ? 'All' : sortKey}
            options={['All', ...SORT_OPTIONS.map((s) => s.value)] as readonly string[]}
            onChange={(v) => setSortKey(v === 'All' ? 'recent' : (v as SortKey))}
            getLabel={(v) =>
              v === 'All' ? 'Sort' : SORT_OPTIONS.find((s) => s.value === v)?.label || v
            }
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors whitespace-nowrap focus-ring"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {filteredSeries.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} noData={initialSeries.length === 0} />
      ) : (
        <>
          {/* Desktop Table (lg+) */}
          <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-text-secondary">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Series</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Type</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Chapters</th>
                    <th className="px-5 py-3.5 font-semibold">Added</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSeries.map((series) => (
                    <tr key={series.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-surface">
                            <Image
                              src={series.coverImage}
                              alt={series.title}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary line-clamp-2 leading-snug">
                              {series.title}
                            </div>
                            <div className="text-xs text-text-muted truncate mt-0.5">
                              {series.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(series.status)}`}
                        >
                          {series.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                          {getContentTypeLabel(series.type)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-text-secondary tabular-nums">
                        {series._count.chapters}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">
                        {formatDate(series.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ActionMenu
                          seriesId={series.id}
                          seriesTitle={series.title}
                          seriesSlug={series.slug}
                          onDelete={handleDeleteRequest}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tablet Table (md–lg) */}
          <div className="hidden md:block lg:hidden rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-text-secondary">
                <tr>
                  <th className="px-3 py-3 font-semibold">Series</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold text-center">Ch.</th>
                  <th className="px-3 py-3 font-semibold text-right w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSeries.map((series) => (
                  <tr key={series.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-9 w-9 rounded overflow-hidden flex-shrink-0 bg-surface">
                          <Image
                            src={series.coverImage}
                            alt={series.title}
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-text-primary line-clamp-2 text-[13px] leading-snug">
                            {series.title}
                          </div>
                          <div className="text-[11px] text-text-muted truncate mt-0.5">
                            {series.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(series.status)}`}
                      >
                        {series.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {getContentTypeLabel(series.type)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-text-secondary tabular-nums text-sm">
                      {series._count.chapters}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <ActionMenu
                        seriesId={series.id}
                        seriesTitle={series.title}
                        seriesSlug={series.slug}
                        onDelete={handleDeleteRequest}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (<md) */}
          <div className="md:hidden space-y-2">
            {filteredSeries.map((series) => (
              <div
                key={series.id}
                className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-card-hover"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="relative h-[52px] w-[52px] rounded overflow-hidden flex-shrink-0 bg-surface">
                    <Image
                      src={series.coverImage}
                      alt={series.title}
                      fill
                      className="object-cover"
                      sizes="52px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-text-primary line-clamp-2 leading-snug">
                          {series.title}
                        </h3>
                        <p className="text-xs text-text-muted truncate mt-0.5">{series.slug}</p>
                      </div>
                      <ActionMenu
                        seriesId={series.id}
                        seriesTitle={series.title}
                        seriesSlug={series.slug}
                        onDelete={handleDeleteRequest}
                      />
                    </div>

                    {/* Badges + meta row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(series.status)}`}
                      >
                        {series.status}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {getContentTypeLabel(series.type)}
                      </span>
                      <span className="text-xs text-text-muted">
                        {series._count.chapters} ch.
                      </span>
                    </div>
                  </div>

                  {/* Chevron link */}
                  <Link
                    href={`/admin/series/${series.id}/edit`}
                    className="flex-shrink-0 self-center ml-1 text-text-muted hover:text-primary transition-colors"
                    aria-label={`Edit ${series.title}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 sm:px-5 py-3.5">
          <p className="text-sm text-text-secondary">
            Showing{' '}
            <span className="font-semibold text-text-primary">
              {Math.min(skip + 1, totalSeries)}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-text-primary">
              {Math.min(skip + take, totalSeries)}
            </span>{' '}
            of <span className="font-semibold text-text-primary">{totalSeries}</span>
          </p>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link
                href={`/admin/series?page=${currentPage - 1}`}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors focus-ring"
              >
                Previous
              </Link>
            ) : (
              <button
                disabled
                className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-semibold text-text-muted cursor-not-allowed"
              >
                Previous
              </button>
            )}

            {currentPage < totalPages ? (
              <Link
                href={`/admin/series?page=${currentPage + 1}`}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors focus-ring"
              >
                Next
              </Link>
            ) : (
              <button
                disabled
                className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-semibold text-text-muted cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          seriesTitle={deleteTarget.title}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}

/* ── Empty State ────────────────────────────────── */

function EmptyState({
  hasFilters,
  onClear,
  noData,
}: {
  hasFilters: boolean;
  onClear: () => void;
  noData: boolean;
}) {
  if (noData && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <Library className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-text-primary">No series yet</h3>
        <p className="mt-1 text-sm text-text-secondary max-w-xs">
          Get started by adding your first series to the platform.
        </p>
        <Link
          href="/admin/series/new"
          className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-ring"
        >
          <Plus className="h-4 w-4" />
          Add Series
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12 px-6 text-center">
      <div className="mb-4 rounded-full bg-surface p-4">
        <Search className="h-7 w-7 text-text-muted" />
      </div>
      <h3 className="text-lg font-bold text-text-primary">No series found</h3>
      <p className="mt-1 text-sm text-text-secondary max-w-xs">
        Try changing your search or filters.
      </p>
      <button
        onClick={onClear}
        className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors focus-ring"
      >
        Clear Filters
      </button>
    </div>
  );
}
