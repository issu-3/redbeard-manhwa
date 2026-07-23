import { createSeries } from '@/app/actions/admin/series';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { MediaManager } from '@/components/admin/MediaManager';
import { MultiSelectField } from '@/components/admin/MultiSelectField';
import { SeoFormFields } from '@/components/admin/SeoFormFields';

export default async function NewSeriesPage() {
  let genres: any[] = [];
  let tags: any[] = [];
  let errorMsg = null;

  try {
    const [fetchedGenres, fetchedTags] = await Promise.all([
      prisma.genre.findMany({ orderBy: { name: 'asc' } }),
      prisma.tag.findMany({ orderBy: { name: 'asc' } })
    ]);
    genres = fetchedGenres;
    tags = fetchedTags;
  } catch (err: any) {
    console.error('Error fetching data in NewSeriesPage:', err);
    errorMsg = err.message || String(err);
  }

  if (errorMsg) {
    return (
      <div className="p-8 text-red-500 bg-red-100/10 rounded-xl">
        <h1 className="text-2xl font-bold mb-4">Error loading page</h1>
        <p className="font-mono">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Add New Series</h1>
        <p className="text-text-secondary">Create a new manhwa/manga entry.</p>
      </div>

      <form action={createSeries} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Title *</label>
            <input 
              name="title" 
              required 
              className="w-full rounded-lg border border-border bg-card px-4 py-2" 
              placeholder="e.g. Solo Leveling" 
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
             <MediaManager 
              name="coverImage" 
              label="Cover Image *" 
              recommendedDimensions="600x900" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Type</label>
            <select name="type" className="w-full rounded-lg border border-border bg-card px-4 py-2">
              <option value="MANHWA">Manhwa</option>
              <option value="MANGA">Manga</option>
              <option value="MANHUA">Manhua</option>
              <option value="WEBTOON">Webtoon</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Status</label>
            <select name="status" className="w-full rounded-lg border border-border bg-card px-4 py-2">
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="HIATUS">Hiatus</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Reading Direction</label>
            <select name="readingDirection" className="w-full rounded-lg border border-border bg-card px-4 py-2">
              <option value="VERTICAL">Vertical (Webtoon)</option>
              <option value="RTL">Right to Left (Manga)</option>
              <option value="LTR">Left to Right (Comic)</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <MediaManager 
              name="bannerImage" 
              label="Banner Image" 
              recommendedDimensions="1920x600" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Genres</label>
            <MultiSelectField 
              name="genres"
              placeholder="Search genres..."
              options={genres.map(g => ({ id: g.id, name: g.name }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Tags</label>
            <MultiSelectField 
              name="tags"
              placeholder="Search tags..."
              options={tags.map(t => ({ id: t.id, name: t.name }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Description *</label>
          <textarea 
            name="description" 
            required 
            rows={5}
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
            placeholder="Full description..." 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold">Synopsis (Short)</label>
          <textarea 
            name="synopsis" 
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
            placeholder="Short 1-2 sentence synopsis..." 
          />
        </div>

        <SeoFormFields />

        <div className="flex justify-end gap-4 border-t border-border pt-6">
          <Link 
            href="/admin/series" 
            className="rounded-lg px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Create Series
          </button>
        </div>
      </form>
    </div>
  );
}
