import { updateSeries } from '@/app/actions/admin/series';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { MediaManager } from '@/components/admin/MediaManager';
import { MultiSelectField } from '@/components/admin/MultiSelectField';
import { SeoFormFields } from '@/components/admin/SeoFormFields';

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [series, genres, tags] = await Promise.all([
    prisma.series.findUnique({
      where: { id },
      include: { genres: true, tags: true }
    }),
    prisma.genre.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } })
  ]);

  if (!series) {
    notFound();
  }

  const selectedGenreIds = series.genres.map((g: any) => g.id);
  const selectedTagIds = series.tags.map((t: any) => t.id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Edit Series</h1>
        <p className="text-text-secondary">Update details for {series.title}.</p>
      </div>

      <form action={updateSeries} className="space-y-6">
        <input type="hidden" name="id" value={series.id} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Title *</label>
            <input 
              name="title" 
              required 
              defaultValue={series.title}
              className="w-full rounded-lg border border-border bg-card px-4 py-2" 
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <MediaManager 
              name="coverImage" 
              label="Cover Image *" 
              recommendedDimensions="600x900" 
              defaultValue={series.coverImage}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Type</label>
            <select name="type" defaultValue={series.type} className="w-full rounded-lg border border-border bg-card px-4 py-2">
              <option value="MANHWA">Manhwa</option>
              <option value="MANGA">Manga</option>
              <option value="MANHUA">Manhua</option>
              <option value="WEBTOON">Webtoon</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Status</label>
            <select name="status" defaultValue={series.status} className="w-full rounded-lg border border-border bg-card px-4 py-2">
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="HIATUS">Hiatus</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Reading Direction</label>
            <select name="readingDirection" defaultValue={series.readingDirection} className="w-full rounded-lg border border-border bg-card px-4 py-2">
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
              defaultValue={series.bannerImage || ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Genres</label>
            <MultiSelectField 
              name="genres"
              placeholder="Search genres..."
              options={genres.map((g: any) => ({ id: g.id, name: g.name }))}
              initialSelectedIds={selectedGenreIds}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Tags</label>
            <MultiSelectField 
              name="tags"
              placeholder="Search tags..."
              options={tags.map((t: any) => ({ id: t.id, name: t.name }))}
              initialSelectedIds={selectedTagIds}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Description *</label>
          <textarea 
            name="description" 
            required 
            minLength={10}
            defaultValue={series.description}
            rows={5}
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-semibold">Synopsis (Short)</label>
          <textarea 
            name="synopsis" 
            defaultValue={series.synopsis || ''}
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-4 py-2" 
          />
        </div>

        <SeoFormFields defaultValues={series.seo as any} />

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
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
